"use client";

import React, { useState, useEffect, useMemo } from "react";
import styles from "./projectionView.module.css";
import { formatMonthDisplay } from "../shared/formatMonthDisplay";
import { Entry } from '../shared/genericTypes';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt, faRedo } from "@fortawesome/free-solid-svg-icons";
import { openEventDB } from "../../utils/openEventDB";

type Props = {
  onReplay: () => void;
  publishedChangeIds: Set<string>;
  draftChangeId?: string | null;
  latestPublishedVersionId?: string | null;
  finances: Finances;
};

type Finances = {
  [monthKey: string]: {
    incomes: Entry[];
    expenses: Entry[];
    net: number;
  };
};

export default function ProjectionScreen({
  onReplay,
  publishedChangeIds,
  draftChangeId = null,
  latestPublishedVersionId = null,
  finances,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [isEmptyView, setIsEmptyView] = useState(false);

  

  const months = useMemo(() => Object.keys(finances).sort(), [finances]);

  const displayedFinances =
    selectedMonth && finances[selectedMonth]
      ? { [selectedMonth]: finances[selectedMonth] }
      : finances;

  const displayData = isEmptyView ? {} : displayedFinances;

  return (
    <section className={styles.topRight} aria-labelledby="published-draft-summary">
      <h3 className={styles.infoMessage}>Published and Committed Events</h3>

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
          <FontAwesomeIcon icon={faTrashAlt} />
        </button>
        <button
          className={styles.controlButton}
          onClick={() => {
            setIsEmptyView(false);
            onReplay();
          }}
        >
          <FontAwesomeIcon icon={faRedo} />
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
                    >
                      {income.description} : CHF{income.amount}
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
                    >
                      {expense.description} : CHF{expense.amount}
                    </li>
                  ))}
                </ul>
              </td>
              <td className={data.net >= 0 ? styles.netPositive : styles.netNegative}>
                CHF{data.net}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
