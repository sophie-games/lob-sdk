/**
 * Type alias for event names, which can be strings or numbers.
 */
type EventName = string | number;

/**
 * A generic event emitter implementation that allows subscribing to and emitting typed events.
 * @template T - A record type mapping event names to their argument types.
 */
export class EventEmitter<T extends Record<EventName, any>> {
  private listeners: Map<keyof T, Array<(arg: T[keyof T]) => void>> = new Map();

  /**
   * Subscribes a listener function to a specific event.
   * @param event - The event name to listen to.
   * @param listener - The callback function to execute when the event is emitted.
   */
  on<K extends keyof T>(event: K, listener: (arg: T[K]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener as (arg: T[keyof T]) => void);
  }

  /**
   * Unsubscribes a listener function from a specific event.
   * @param event - The event name to unsubscribe from.
   * @param listener - The callback function to remove.
   */
  off<K extends keyof T>(event: K, listener: (arg: T[K]) => void) {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    this.listeners.set(
      event,
      eventListeners.filter((l) => l !== listener)
    );
  }

  /**
   * Emits an event, calling all subscribed listeners with the provided argument.
   * @param event - The event name to emit.
   * @param arg - The argument to pass to all listeners (defaults to empty array if not provided).
   */
  emit<K extends keyof T>(event: K, arg: T[K] = [] as T[K]) {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    eventListeners.forEach((listener) => listener(arg));
  }
}
