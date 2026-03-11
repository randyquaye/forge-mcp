import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  ToolMiddleware,
  Logger,
} from "./types.js";
import { ToolExecutionError, ToolTimeoutError, ValidationError } from "./errors.js";
import type { Container } from "./container.js";

/**
 * Executes tools with validation, middleware, timeout, and concurrency control.
 */
export class Executor {
  private activeTasks = 0;
  private queue: Array<() => void> = [];

  constructor(
    private readonly container: Container,
    private readonly logger: Logger,
    private readonly maxConcurrent: number = 10,
    private readonly defaultTimeout: number = 30_000
  ) {}

  async execute(
    tool: ToolDefinition,
    rawInput: unknown,
    requestId: string | number,
    globalMiddleware: ToolMiddleware[] = []
  ): Promise<ToolResult> {
    // Validate input
    const parsed = tool.inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError(
        `Invalid input for tool "${tool.name}"`,
        parsed.error.flatten()
      );
    }

    // Wait for concurrency slot
    await this.acquireSlot();

    const timeout = tool.timeout ?? this.defaultTimeout;
    const controller = new AbortController();

    const context: ToolContext = {
      toolName: tool.name,
      requestId,
      signal: controller.signal,
      logger: this.logger.child({ tool: tool.name, requestId }),
      getResource: <T>(key: string) => this.container.getSync<T>(key),
      metadata: {},
    };

    try {
      // Build middleware chain: global → tool-specific → handler
      const allMiddleware = [
        ...globalMiddleware,
        ...(tool.middleware ?? []),
      ];

      const handlerFn = () => Promise.resolve(tool.handler(parsed.data, context));

      const chain = allMiddleware.reduceRight<() => Promise<ToolResult>>(
        (next, mw) => () => mw(parsed.data, context, next),
        handlerFn
      );

      // Execute with timeout
      const result = await Promise.race([
        chain(),
        this.timeoutPromise(timeout, tool.name, controller),
      ]);

      context.logger.debug("Tool executed successfully");
      return result;
    } catch (err) {
      if (err instanceof ToolTimeoutError || err instanceof ValidationError) {
        throw err;
      }
      throw new ToolExecutionError(
        tool.name,
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      controller.abort();
      this.releaseSlot();
    }
  }

  /**
   * Execute multiple tools in parallel, respecting concurrency limits.
   */
  async executeParallel(
    calls: Array<{
      tool: ToolDefinition;
      input: unknown;
      requestId: string | number;
    }>,
    globalMiddleware: ToolMiddleware[] = []
  ): Promise<Array<ToolResult | Error>> {
    return Promise.all(
      calls.map(({ tool, input, requestId }) =>
        this.execute(tool, input, requestId, globalMiddleware).catch(
          (err: unknown) => (err instanceof Error ? err : new Error(String(err)))
        )
      )
    );
  }

  private async acquireSlot(): Promise<void> {
    if (this.activeTasks < this.maxConcurrent) {
      this.activeTasks++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.activeTasks++;
        resolve();
      });
    });
  }

  private releaseSlot(): void {
    this.activeTasks--;
    const next = this.queue.shift();
    if (next) next();
  }

  private timeoutPromise(
    ms: number,
    toolName: string,
    controller: AbortController
  ): Promise<never> {
    return new Promise((_, reject) => {
      const timer = setTimeout(() => {
        controller.abort();
        reject(new ToolTimeoutError(toolName, ms));
      }, ms);
      // Don't keep process alive for the timer
      if (typeof timer === "object" && "unref" in timer) {
        timer.unref();
      }
    });
  }
}
