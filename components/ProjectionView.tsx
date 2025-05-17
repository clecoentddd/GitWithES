"use client";

import React, { useState, useMemo } from "react";
import styles from "./projectionView.module.css";
import { formatMonthDisplay } from "./EventSourceEditor";
import { Entry, Event } from "./genericTypes";

type Props = {
  events: Event[];
  onReplay: () => void;
  publishedChangeIds: Set<string>;  // published changes only
  draftChangeId?: string | null;    // current draft change id
};

type Finances = {
  [monthKey: string]: {
    incomes: Entry[];
    expenses: Entry[];
    net: number;
  };
};

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthsInPeriod(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

export default function ProjectionScreen({
  events,
  onReplay,
  publishedChangeIds,
  draftChangeId = null,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [isEmptyView, setIsEmptyView] = useState(false);

  // Collect all cancelled changeIds from events
  const cancelledChangeIds = useMemo(() => {
    const cancelled = new Set<string>();
    for (const event of events) {
      if (event.type === "ChangeCancelled" && event.changeId) {
        cancelled.add(event.changeId);
      }
    }
    return cancelled;
  }, [events]);

  // Filter events: keep base events + published + current draft; exclude cancelled and others
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (!("belongsTo" in e) || !e.belongsTo) return true; // base events

      if (cancelledChangeIds.has(e.belongsTo)) return false; // exclude cancelled

      // Allow if published or current draft
      if (publishedChangeIds.has(e.belongsTo)) return true;
      if (draftChangeId && e.belongsTo === draftChangeId) return true;

      return false; // exclude other drafts/pending changes
    });
  }, [events, cancelledChangeIds, publishedChangeIds, draftChangeId]);

  // Build finances projection, mark entries as draft/published
  const finances: Finances = useMemo(() => {
    const data: Finances = {};

    filteredEvents.forEach((event) => {
      if (event.type === "IncomeAdded" || event.type === "ExpenseAdded") {
        const months = getMonthsInPeriod(event.period.start, event.period.end);

        months.forEach((month) => {
          const monthKey = formatMonthKey(month);
          if (!data[monthKey]) {
            data[monthKey] = { incomes: [], expenses: [], net: 0 };
          }

          const isDraft = event.belongsTo === draftChangeId;

          const entry: Entry = {
            amount: event.amount,
            description: event.description + (isDraft ? " (draft)" : ""),
            kind: event.type === "IncomeAdded" ? "income" : "expense",
            changeId: event.belongsTo || "",
            isDraft,
          };

          if (entry.kind === "income") {
            data[monthKey].incomes.push(entry);
            data[monthKey].net += entry.amount;
          } else {
            data[monthKey].expenses.push(entry);
            data[monthKey].net -= entry.amount;
          }
        });
      }
    });

    return data;
  }, [filteredEvents, draftChangeId]);

  // Months dropdown sorted
  const months = useMemo(() => Object.keys(finances).sort(), [finances]);

  // If selectedMonth is set, show only that month
  const displayedFinances =
    selectedMonth && finances[selectedMonth]
      ? { [selectedMonth]: finances[selectedMonth] }
      : finances;

  const displayData = isEmptyView ? {} : displayedFinances;

  return (
    <section className={styles.topRight} aria-labelledby="published-draft-summary">
      <h3 className={styles.infoMessage}>Published + Draft Events</h3>

      <div>
        <label htmlFor="month-select" className={styles.label}>
          Select Month:
        </label>
        <select
          id="month-select"
          className={styles.select}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          disabled={isEmptyView}
        >
          <option value="">All</option>
          {months.map((monthKey) => (
            <option key={monthKey} value={monthKey}>
              {formatMonthDisplay(monthKey)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.buttonGroup}>
        <button className={styles.controlButton} onClick={() => setIsEmptyView(true)}>
          Empty View
        </button>
        <button
          className={styles.controlButton}
          onClick={() => {
            setIsEmptyView(false);
            onReplay();
          }}
        >
          Replay Published Events
        </button>
      </div>

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
          {Object.entries(displayData).map(([monthKey, data]) => (
            <tr
              key={monthKey}
              style={{
                display: selectedMonth && monthKey !== selectedMonth ? "none" : "table-row",
              }}
            >
              <td>{formatMonthDisplay(monthKey)}</td>
              <td>
                <ul className={styles.entryList}>
                  {data.incomes.map((income, i) => (
                    <li
                      key={i}
                      style={{
                        color: income.isDraft ? "blue" : "black",
                        fontStyle: income.isDraft ? "italic" : "normal",
                      }}
                      title={income.isDraft ? "Draft entry" : "Published entry"}
                    >
                      ${income.amount} - {income.description}
                    </li>
                  ))}
                </ul>
              </td>
              <td>
                <ul className={styles.entryList}>
                  {data.expenses.map((expense, i) => (
                    <li
                      key={i}
                      style={{
                        color: expense.isDraft ? "blue" : "black",
                        fontStyle: expense.isDraft ? "italic" : "normal",
                      }}
                      title={expense.isDraft ? "Draft entry" : "Published entry"}
                    >
                      ${expense.amount} - {expense.description}
                    </li>
                  ))}
                </ul>
              </td>
              <td className={data.net >= 0 ? styles.netPositive : styles.netNegative}>
                ${data.net}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
