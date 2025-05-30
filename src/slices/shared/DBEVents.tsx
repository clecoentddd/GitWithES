
import { Event } from './genericTypes';
import { useState, useEffect } from "react";

export function useDB<T>(db: { list: () => T[]; subscribe: (cb: () => void) => () => void }): T[] {
  const [data, setData] = useState<T[]>(db.list());

  useEffect(() => {
    const handleChange = () => {
      setData(db.list());
    };
    const unsubscribe = db.subscribe(handleChange);
    return unsubscribe;
  }, [db]);

  return data;
}

type Callback = () => void;

class DBEventList {
  private dbEvents: Event[] = [];
  private listeners: Set<Callback> = new Set();

  append(eventOrEvents: Event | Event[]) {
    if (Array.isArray(eventOrEvents)) {
      this.dbEvents.push(...eventOrEvents);
    } else {
      this.dbEvents.push(eventOrEvents);
    }
    this.emit();
  }

  list(): Event[] {
    return [...this.dbEvents]; // Shallow copy for immutability
  }

  clear() {
    this.dbEvents = [];
    this.emit();
  }

  subscribe(callback: Callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit() {
    this.listeners.forEach((cb) => cb());
  }
}

export const DBEvents = new DBEventList();
