import type { Provider } from "./types.js";

/**
 * Lightweight dependency injection container.
 * Register providers (DB pools, API clients, etc.) that get lazily
 * initialized and properly disposed on shutdown.
 */
export class Container {
  private providers = new Map<string, Provider>();
  private instances = new Map<string, unknown>();
  private initialized = new Set<string>();

  register<T>(provider: Provider<T>): void {
    if (this.providers.has(provider.key)) {
      throw new Error(`Provider already registered: ${provider.key}`);
    }
    this.providers.set(provider.key, provider as Provider);
  }

  async get<T>(key: string): Promise<T> {
    if (this.instances.has(key)) {
      return this.instances.get(key) as T;
    }

    const provider = this.providers.get(key);
    if (!provider) {
      throw new Error(`No provider registered for key: ${key}`);
    }

    if (this.initialized.has(key)) {
      throw new Error(`Circular dependency detected for key: ${key}`);
    }

    this.initialized.add(key);
    const instance = await provider.factory();
    this.instances.set(key, instance);
    return instance as T;
  }

  getSync<T>(key: string): T {
    const instance = this.instances.get(key);
    if (instance === undefined) {
      throw new Error(
        `Resource "${key}" not initialized. Call server.start() first or use await container.get().`
      );
    }
    return instance as T;
  }

  async initializeAll(): Promise<void> {
    for (const key of this.providers.keys()) {
      await this.get(key);
    }
  }

  async dispose(): Promise<void> {
    const entries = [...this.instances.entries()].reverse();
    for (const [key, instance] of entries) {
      const provider = this.providers.get(key);
      if (provider?.dispose) {
        await provider.dispose(instance);
      }
    }
    this.instances.clear();
    this.initialized.clear();
  }

  has(key: string): boolean {
    return this.providers.has(key);
  }
}
