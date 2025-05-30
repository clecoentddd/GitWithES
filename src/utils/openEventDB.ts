import { openDB } from 'idb';

export async function openEventDB() {
  return await openDB('EventSourcingDemo', 2, {  // 🔼 bump to version 2 (or higher if needed)
    upgrade(db) {
      if (!db.objectStoreNames.contains('view_state_incomes_expenses')) {
        db.createObjectStore('view_state_incomes_expenses');
      }
      if (!db.objectStoreNames.contains('view_state_cumulative_finances')) {
        db.createObjectStore('view_state_cumulative_finances');
      }
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events');
      }
    },
  });
}
