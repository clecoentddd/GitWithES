"use client";

import { useEffect, useState } from 'react';
import { openEventDB } from '../src/utils/openEventDB'; // Make sure the path is correct

export default function IndexedDBView() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const db = await openEventDB(); // ✅ Use your helper to ensure stores exist
        const tx = db.transaction("view_state_incomes_expenses", "readonly");
        const store = tx.objectStore("view_state_incomes_expenses");

        const allKeys = await store.getAllKeys();
        const allValues = await Promise.all(
          allKeys.map((key) => store.get(key))
        );

        setData(allValues);
      } catch (err) {
        console.error("Failed to read from IndexedDB:", err);
      }
    })();
  }, []);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>IndexedDB: view_state_incomes_expenses</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
