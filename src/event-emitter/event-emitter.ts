type EventName = string | number;

export class EventEmitter<T extends Record<EventName, any>> {
  private listeners: Map<keyof T, Array<(arg: T[keyof T]) => void>> = new Map();

  on<K extends keyof T>(event: K, listener: (arg: T[K]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener as (arg: T[keyof T]) => void);
  }

  off<K extends keyof T>(event: K, listener: (arg: T[K]) => void) {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    this.listeners.set(
      event,
      eventListeners.filter((l) => l !== listener)
    );
  }

  emit<K extends keyof T>(event: K, arg: T[K] = [] as T[K]) {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    eventListeners.forEach((listener) => listener(arg));
  }
}
