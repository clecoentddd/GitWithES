"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./ProjectionHistory.module.css";
import { formatMonthDisplay } from "./EventSourceEditor";
import { VersionInfo, Finances } from "./genericTypes";

// Import or define EnrichedEvent type
type EnrichedEvent = {
  amount: number;
  description: string;
  kind: "income" | "expense";
  changeId: string;
  changeType: "published" | "cancelled" | "unknown";
  changeTimestamp: number;
  month: string; // e.g. "2024-05"
};


type Props = {
  versions: VersionInfo[];
  replayVersionId: string;
  setReplayVersionId: (id: string) => void;
  finances: Finances; // 🔁 changed from EnrichedEvent[]
};

function transformEnrichedEventsToFinances(events: EnrichedEvent[]): Finances {
  const finances: Finances = {};

  for (const ev of events) {
    // ✅ Skip unknown changeTypes
    if (ev.changeType !== "published" && ev.changeType !== "cancelled") {
      continue;
    }

    const monthKey = ev.month;

    if (!finances[monthKey]) {
      finances[monthKey] = { incomes: [], expenses: [], net: 0 };
    }

    const entry = {
      amount: ev.amount,
      description: ev.description,
      changeType: ev.changeType, // now narrowed to "published" | "cancelled"
    };

    if (ev.kind === "income") {
      finances[monthKey].incomes.push(entry);
      finances[monthKey].net += ev.amount;
    } else {
      finances[monthKey].expenses.push(entry);
      finances[monthKey].net -= ev.amount;
    }
  }

  return finances;
}



export default function ProjectionHistory({
  versions,
  replayVersionId,
  setReplayVersionId,
  finances,
}: Props) {
  const [showVersions, setShowVersions] = useState(true);

  // Auto-select latest published version if none selected
  useEffect(() => {
    if (!replayVersionId && versions.length > 0) {
      const latestPublished = [...versions].reverse().find((v) => v.type === "published");
      if (latestPublished) {
        setReplayVersionId(latestPublished.id);
      }
    }
  }, [replayVersionId, versions, setReplayVersionId]);

 
// ✅ This is used just for the dropdown UI
const allSelectableVersions = useMemo(() => {
  return versions.filter((v) => v.type === "published" || v.type === "cancelled");
}, [versions]);

// ✅ This is used to compute finance replay scope
const replayScopeVersions = useMemo(() => {
  if (!replayVersionId) return [];

  const selectedIndex = versions.findIndex((v) => v.id === replayVersionId);
  if (selectedIndex === -1) return [];

  const previousPublished = versions
    .slice(0, selectedIndex)
    .filter((v) => v.type === "published");

  return [...previousPublished, versions[selectedIndex]];
}, [versions, replayVersionId]);




  return (
    <section className={styles.bottomRight} aria-labelledby="version-history">
      <h3 className={styles.infoMessage}>Please select a photo (history)</h3>

      <button
        type="button"
        className={styles.versionDropdownToggle}
        onClick={() => setShowVersions((prev) => !prev)}
      >
        {showVersions ? "Hide Versions ▲" : "Show Versions ▼"}
      </button>

     {showVersions && allSelectableVersions.length > 0 && (
         <ul className={styles.versionList}>
    {allSelectableVersions.map((version) => (
      <li key={version.id} className={styles.versionListItem}>
        <button
          className={
            replayVersionId === version.id
              ? styles.selectedVersion
              : styles.versionButton
          }
          onClick={() => setReplayVersionId(version.id)}
          type="button"
        >
          {version.description} — {new Date(version.timestamp).toLocaleString()} (
          {version.type === "published" ? "P" : "C"})
        </button>
      </li>
    ))}
  </ul>

      )}

      {replayVersionId && (
        <section aria-labelledby="selected-version-details">
          <h3 id="selected-version-details">Selected Version Details</h3>
          <table className={styles.financeTable}>
            <thead>
              <tr>
                <th>Month</th>
                <th>Incomes</th>
                <th>Expenses</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(finances).map(([monthKey, data]) => (
                <tr key={monthKey}>
                  <td>{formatMonthDisplay(monthKey)}</td>
                  <td>
                    <ul className={styles.entryList}>
                      {data.incomes.map((income, i) => (
                        <li key={i}>
                          {income.description} : CHF{income.amount}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul className={styles.entryList}>
                      {data.expenses.map((expense, i) => (
                        <li key={i}>
                          {expense.description} : CHF{expense.amount}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td
                    className={data.net >= 0 ? styles.netPositive : styles.netNegative}
                  >
                    {data.net}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <div style={{ marginTop: "2rem", backgroundColor: "#f9f9f9", padding: "1rem", border: "1px solid #ccc" }}>
  <h4>Debug Info</h4>
  <pre><strong>All versions:</strong> {JSON.stringify(versions, null, 2)}</pre>
  <pre><strong>Replay version ID:</strong> {replayVersionId}</pre>
  <pre><strong>Filtered versions:</strong> {JSON.stringify(allSelectableVersions, null, 2)}</pre>
</div>
    </section>
  );
}
