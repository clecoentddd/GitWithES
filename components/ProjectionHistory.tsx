"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./ProjectionHistory.module.css";
import { formatMonthDisplay } from "./EventSourceEditor";
import { VersionInfo, Finances } from "./genericTypes";

// Temporary type - can be removed later


// ... (rest of your component remains exactly the same)
type EnrichedEvent = {
  amount: number;
  description: string;
  kind: "income" | "expense";
  changeId: string;
  changeType: "published" | "cancelled" | "unknown";
  changeTimestamp: number;
  month: string;
};

type Props = {
  versions: VersionInfo[];
  replayVersionId: string;
  setReplayVersionId: (id: string) => void;
  finances: Finances;
};

export default function ProjectionHistory({
  versions,
  replayVersionId,
  setReplayVersionId,
  finances: allFinances,
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

  // Get all version IDs in the replay scope
  const replayScopeVersionIds = useMemo(() => {
    if (!replayVersionId) return new Set<string>();
    
    const selectedIndex = versions.findIndex((v) => v.id === replayVersionId);
    if (selectedIndex === -1) return new Set<string>();

    // Include all published versions before the selected one, plus the selected version itself
    const scopeVersions = versions
      .slice(0, selectedIndex + 1)
      .filter((v) => v.type === "published" || v.id === replayVersionId);

    return new Set(scopeVersions.map(v => v.id));
  }, [versions, replayVersionId]);

  // Filter finances to only include entries from the replay scope
  const filteredFinances = useMemo(() => {
    const result: Finances = {};
    
    for (const [month, data] of Object.entries(allFinances)) {
      const filteredIncomes = data.incomes.filter(income => 
        income.changeId ? replayScopeVersionIds.has(income.changeId) : false
      );
      
      const filteredExpenses = data.expenses.filter(expense => 
        expense.changeId ? replayScopeVersionIds.has(expense.changeId) : false
      );
      
      if (filteredIncomes.length > 0 || filteredExpenses.length > 0) {
        const net = filteredIncomes.reduce((sum, i) => sum + i.amount, 0) - 
                   filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        result[month] = {
          incomes: filteredIncomes,
          expenses: filteredExpenses,
          net
        };
      }
    }
    
    return result;
  }, [allFinances, replayScopeVersionIds]);

  // This is used just for the dropdown UI
  const allSelectableVersions = useMemo(() => {
    return versions.filter((v) => v.type === "published" || v.type === "cancelled");
  }, [versions]);

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
              {Object.entries(filteredFinances).map(([monthKey, data]) => (
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
        <pre><strong>Replay version ID:</strong> {replayVersionId}</pre>
        <pre><strong>Replay scope version IDs:</strong> {JSON.stringify(Array.from(replayScopeVersionIds), null, 2)}</pre>
        <pre><strong>All finances data:</strong> {JSON.stringify(allFinances, null, 2)}</pre>
        <pre><strong>Filtered finances data:</strong> {JSON.stringify(filteredFinances, null, 2)}</pre>
        <pre><strong>All selectable versions:</strong> {JSON.stringify(allSelectableVersions, null, 2)}</pre>
      </div>
    </section>
  );
}