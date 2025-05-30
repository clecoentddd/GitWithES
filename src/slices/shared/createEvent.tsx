export function createEvent<T>(event: T): T & { timestamp: number } {
    return { ...event, timestamp: Date.now() };
  }