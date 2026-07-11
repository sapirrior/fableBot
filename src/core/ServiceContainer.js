/**
 * A minimal, clean Dependency Injection service container.
 * Registers and resolves application-wide services.
 */
class ServiceContainer {
  constructor() {
    this.services = new Map();
  }

  register(name, instance) {
    if (this.services.has(name)) {
      throw new Error(`[ServiceContainer] Service already registered: ${name}`);
    }
    this.services.set(name, instance);
  }

  resolve(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`[ServiceContainer] Service not registered: ${name}`);
    }
    return service;
  }
}

export const container = new ServiceContainer();
export default container;
