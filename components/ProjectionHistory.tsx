"use client";

import React, { useState } from "react";
import styles from "./Home.module.css";
import { formatMonthDisplay } from "./EventSourceEditor";
import { VersionInfo } from "./genericTypes";

type Finances = {
  [monthKey: string]: {
    incomes: { amount: number; description: string }[];
    expenses: { amount: number; description: string }[];
    net: number;
  };
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
  finances,
}: Props) {
  const [showVersions, setShowVersions] = useState(true);

  return (
    <section className={styles.bottomRight} aria-labelledby="version-history">
      
        <h3 className={styles.infoMessage}>
        Please select a photo (history)
        </h3>

      {/* Toggle Button */}
      <button
        type="button"
        className={styles.versionDropdownToggle}
        onClick={() => setShowVersions((prev) => !prev)}
      >
        {showVersions ? "Hide Versions ▲" : "Show Versions ▼"}
      </button>
  
      {/* Version List (dropdown style) */}
      {showVersions && versions.length > 0 && (
        <ul className={styles.versionList}>
        {versions.map((version) => (
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
              {version.description} —{" "}
              {new Date(version.timestamp).toLocaleString()}
            </button>
          </li>
        ))}
      </ul>
      
      )}
  
      {/* Selected Version Details */}
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
              {Object.entries(finances || {}).map(([monthKey, data]) => (
                <tr key={monthKey}>
                  <td>{formatMonthDisplay(monthKey)}</td>
                  <td>
                    <ul className={styles.entryList}>
                      {data.incomes.map((income, i) => (
                        <li key={i}>
                          ${income.amount} - {income.description}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul className={styles.entryList}>
                      {data.expenses.map((expense, i) => (
                        <li key={i}>
                          ${expense.amount} - {expense.description}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td
                    className={
                      data.net >= 0
                        ? styles.netPositive
                        : styles.netNegative
                    }
                  >
                    ${data.net}
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
