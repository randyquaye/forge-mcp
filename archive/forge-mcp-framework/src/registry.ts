import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type {
  ToolDefinition,
  ResourceDefinition,
  ResourceTemplateDefinition,
  PromptDefinition,
} from "./types.js";

/**
 * Central registry for tools, resources, and prompts.
 * Handles schema conversion to JSON Schema for MCP protocol.
 */
export class Registry {
  private tools = new Map<string, ToolDefinition>();
  private resources = new Map<string, ResourceDefinition>();
  private resourceTemplates = new Map<string, ResourceTemplateDefinition>();
  private prompts = new Map<string, PromptDefinition>();

  // ─── Tools ────────────────────────────────────────────────────────

  registerTool<T extends z.ZodType>(tool: ToolDefinition<T>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool as unknown as ToolDefinition);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  listTools(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }> {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema, {
        target: "openApi3",
      }) as Record<string, unknown>,
    }));
  }

  // ─── Resources ────────────────────────────────────────────────────

  registerResource(resource: ResourceDefinition): void {
    if (this.resources.has(resource.uri)) {
      throw new Error(`Resource already registered: ${resource.uri}`);
    }
    this.resources.set(resource.uri, resource);
  }

  getResource(uri: string): ResourceDefinition | undefined {
    return this.resources.get(uri);
  }

  listResources(): Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }> {
    return [...this.resources.values()].map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    }));
  }

  // ─── Resource Templates ───────────────────────────────────────────

  registerResourceTemplate(template: ResourceTemplateDefinition): void {
    if (this.resourceTemplates.has(template.uriTemplate)) {
      throw new Error(
        `Resource template already registered: ${template.uriTemplate}`
      );
    }
    this.resourceTemplates.set(template.uriTemplate, template);
  }

  matchResourceTemplate(
    uri: string
  ): { template: ResourceTemplateDefinition; params: Record<string, string> } | undefined {
    for (const template of this.resourceTemplates.values()) {
      const params = matchUriTemplate(template.uriTemplate, uri);
      if (params) {
        return { template, params };
      }
    }
    return undefined;
  }

  listResourceTemplates(): Array<{
    uriTemplate: string;
    name: string;
    description?: string;
    mimeType?: string;
  }> {
    return [...this.resourceTemplates.values()].map((t) => ({
      uriTemplate: t.uriTemplate,
      name: t.name,
      description: t.description,
      mimeType: t.mimeType,
    }));
  }

  // ─── Prompts ──────────────────────────────────────────────────────

  registerPrompt<T extends z.ZodType>(prompt: PromptDefinition<T>): void {
    if (this.prompts.has(prompt.name)) {
      throw new Error(`Prompt already registered: ${prompt.name}`);
    }
    this.prompts.set(prompt.name, prompt as unknown as PromptDefinition);
  }

  getPrompt(name: string): PromptDefinition | undefined {
    return this.prompts.get(name);
  }

  listPrompts(): Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }> {
    return [...this.prompts.values()].map((p) => {
      const args = p.argsSchema
        ? extractPromptArgs(p.argsSchema)
        : undefined;
      return {
        name: p.name,
        description: p.description,
        arguments: args,
      };
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function matchUriTemplate(
  template: string,
  uri: string
): Record<string, string> | undefined {
  // Convert URI template to regex: "files://{path}" → /^files:\/\/(.+)$/
  const paramNames: string[] = [];
  const regexStr = template.replace(/\{(\w+)\}/g, (_match, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  const regex = new RegExp(`^${regexStr}$`);
  const match = uri.match(regex);
  if (!match) return undefined;

  const params: Record<string, string> = {};
  paramNames.forEach((name, i) => {
    params[name] = match[i + 1];
  });
  return params;
}

function extractPromptArgs(
  schema: z.ZodType
): Array<{ name: string; description?: string; required?: boolean }> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    return Object.entries(shape).map(([name, field]) => ({
      name,
      description: field.description,
      required: !field.isOptional(),
    }));
  }
  return [];
}
