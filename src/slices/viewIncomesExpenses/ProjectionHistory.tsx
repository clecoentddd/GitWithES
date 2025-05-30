"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./ProjectionHistory.module.css";
import { formatMonthDisplay } from "../shared/formatMonthDisplay";
import { VersionInfo, Finances } from "../shared/genericTypes";
import { openEventDB } from "../../utils/openEventDB";

type Props = {
  versions: VersionInfo[];
  replayVersionId: string;
  setReplayVersionId: (id: string) => void;
};

export default function ProjectionHistory({
  versions,
  replayVersionId,
  setReplayVersionId,
}: Props) {
  const [showVersions, setShowVersions] = useState(true);
  const [finances, setFinances] = useState<Finances>({});

  // Auto-select latest published version
  useEffect(() => {
    if (!replayVersionId && versions.length > 0) {
      const latestPublished = [...versions].reverse().find((v) => v.type === "published");
      if (latestPublished) {
        setReplayVersionId(latestPublished.id);
      }
    }
  }, [replayVersionId, versions, setReplayVersionId]);

  // Fetch finances from IndexedDB when version changes
  useEffect(() => {
    if (!replayVersionId) return;
    (async () => {
      const db = await openEventDB();
      const stored = await db.get("view_state_cumulative_finances", replayVersionId);
      setFinances(stored || {});
    })();
  }, [replayVersionId]);

  const replayScopeVersionIds = useMemo(() => {
    if (!replayVersionId) return new Set<string>();
    const idx = versions.findIndex((v) => v.id === replayVersionId);
    if (idx === -1) return new Set<string>();

    const scopeVersions = versions
      .slice(0, idx + 1)
      .filter((v) => v.type === "published" || v.id === replayVersionId);
    return new Set(scopeVersions.map((v) => v.id));
  }, [replayVersionId, versions]);

  const filteredFinances = useMemo(() => {
    const result: Finances = {};
    for (const [month, data] of Object.entries(finances)) {
      const incomes = data.incomes.filter(i => replayScopeVersionIds.has(i.changeId));
      const expenses = data.expenses.filter(e => replayScopeVersionIds.has(e.changeId));
      if (incomes.length || expenses.length) {
        const net = incomes.reduce((sum, i) => sum + i.amount, 0) -
                    expenses.reduce((sum, e) => sum + e.amount, 0);
        result[month] = { incomes, expenses, net };
      }
    }
    return result;
  }, [finances, replayScopeVersionIds]);

  const selectableVersions = useMemo(() => {
    return versions.filter(v => v.type === "published" || v.type === "cancelled");
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

      {showVersions && selectableVersions.length > 0 && (
        <ul className={styles.versionList}>
          {selectableVersions.map((v) => (
            <li key={v.id} className={styles.versionListItem}>
              <button
                className={replayVersionId === v.id ? styles.selectedVersion : styles.versionButton}
                onClick={() => setReplayVersionId(v.id)}
              >
                {v.description} — {new Date(v.timestamp).toLocaleString()} ({v.type === "published" ? "P" : "C"})
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
                      {data.incomes.map((i, idx) => (
                        <li key={idx}>{i.description} : CHF{i.amount}</li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul className={styles.entryList}>
                      {data.expenses.map((e, idx) => (
                        <li key={idx}>{e.description} : CHF{e.amount}</li>
                      ))}
                    </ul>
                  </td>
                  <td className={data.net >= 0 ? styles.netPositive : styles.netNegative}>
                    {data.net}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </section>
  );
}
