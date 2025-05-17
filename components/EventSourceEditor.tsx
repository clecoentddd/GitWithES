"use client";

import { useState, useMemo, useEffect } from "react";
import styles from "./Home.module.css";
import EventTime from "./ClientTime";
import { EventEntry } from "./EventEntry";

import { 
    addIncomeCommand, 
    addExpenseCommand, 
    createChangeCommand, 
    publishChangeCommand, 
    cancelChangeCommand } from "./commands";


type TimePeriod = {
  start: Date;
  end: Date;
};

export type Event = {
  timestamp: number;
} & (
  | { type: "RequestCreated"; requestId: string }
  | { type: "ChangeCreated"; changeId: string }
  | {
      type: "IncomeAdded";
      amount: number;
      description: string;
      belongsTo: string;
      period: TimePeriod;
    }
  | {
      type: "ExpenseAdded";
      amount: number;
      description: string;
      belongsTo: string;
      period: TimePeriod;
    }
  | { type: "EntryRemoved"; index: number; belongsTo: string }
  | { type: "ChangeCancelled"; changeId: string }
  | { type: "ChangePublished"; changeId: string }
);

type Entry = {
  amount: number;
  description: string;
  kind: "income" | "expense";
  changeId: string;
};

type MonthlyFinances = {
  [monthKey: string]: {
    incomes: Entry[];
    expenses: Entry[];
    net: number;
  };
};

export type State = {
  finances: MonthlyFinances;
  changeId: string | null;
  requestId: string;
  changeStatus: "completed" | "draft" | "published" | "cancelled";
  version: number;
  timestamp: number;
};

type VersionInfo = {
  id: string;
  type: "published" | "cancelled";
  timestamp: number;
  description: string;
};

type EventWithoutTimestamp =
  | Omit<Event, "timestamp"> & { type: "RequestCreated" }
  | Omit<Event, "timestamp"> & { type: "ChangeCreated" }
  | Omit<Event, "timestamp"> & { type: "IncomeAdded" }
  | Omit<Event, "timestamp"> & { type: "ExpenseAdded" }
  | Omit<Event, "timestamp"> & { type: "EntryRemoved" }
  | Omit<Event, "timestamp"> & { type: "ChangeCancelled" }
  | Omit<Event, "timestamp"> & { type: "ChangePublished" };

export function createEvent<T extends EventWithoutTimestamp>(
  event: T
): T & { timestamp: number } {
  const timestamp = Date.now();
  return {
    ...event,
    timestamp,
  };
}

function getMonthsInPeriod(period: TimePeriod): Date[] {
  const months: Date[] = [];
  const current = new Date(period.start);
  const end = new Date(period.end);

  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthDisplay(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);

  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
  });
  return formatter.format(date);
}

function reduce(
  events: Event[],
  requestId: string,
  activeChangeId: string | null,
  includedChanges?: Set<string>
): State {
  const finances: MonthlyFinances = {};
  let isChangeCancelled = false;
  let isChangePublished = false;
  let latestTimestamp = 0;

  const applyEvent = (event: Event) => {
    latestTimestamp = Math.max(latestTimestamp, event.timestamp);

    if (event.type === "IncomeAdded" || event.type === "ExpenseAdded") {
      const months = getMonthsInPeriod(event.period);
      months.forEach((month) => {
        const monthKey = formatMonthKey(month);
        finances[monthKey] = finances[monthKey] || {
          incomes: [],
          expenses: [],
          net: 0,
        };

        const entry: Entry = {
          amount: event.amount,
          description: event.description,
          kind: event.type === "IncomeAdded" ? "income" : "expense",
          changeId: event.belongsTo,
        };

        if (entry.kind === "income") {
          finances[monthKey].incomes.push(entry);
          finances[monthKey].net += entry.amount;
        } else {
          finances[monthKey].expenses.push(entry);
          finances[monthKey].net -= entry.amount;
        }
      });
    } else if (event.type === "EntryRemoved") {
      // Not implemented
    } else if (event.type === "ChangeCancelled" && event.changeId === activeChangeId) {
      isChangeCancelled = true;
    } else if (event.type === "ChangePublished" && event.changeId === activeChangeId) {
      isChangePublished = true;
    }
  };

  const baseEvents = events.filter(
    (e) => !("belongsTo" in e) || e.belongsTo === requestId
  );
  baseEvents.forEach(applyEvent);

  if (!isChangeCancelled) {
    const changeEvents = events.filter(
      (e) =>
        "belongsTo" in e &&
        e.belongsTo !== requestId &&
        (e.belongsTo === activeChangeId ||
          (includedChanges && includedChanges.has(e.belongsTo)))
    );
    changeEvents.forEach(applyEvent);
  }

  const changeStatus = isChangeCancelled
    ? "cancelled"
    : isChangePublished
    ? "published"
    : activeChangeId
    ? "draft"
    : "completed";

  return {
    finances,
    requestId,
    changeId: activeChangeId,
    changeStatus,
    version: events.length,
    timestamp: latestTimestamp,
  };
}

export default function HomePage() {
  const requestId = "0x01";
  const [changeId, setChangeId] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);

  useEffect(() => {
    setEvents([
      createEvent({
        type: "RequestCreated",
        requestId,
      }),
    ]);
  }, [requestId]);

  const [replayVersionId, setReplayVersionId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const state = reduce(events, requestId, changeId);

  const { versions, includedChangesLookup } = useMemo(() => {
    const versions: VersionInfo[] = [];
    const includedChangesLookup: Record<string, Set<string>> = {};
    const allChanges: {
      id: string;
      type: "published" | "cancelled";
      timestamp: number;
    }[] = [];

    for (const event of events) {
      if (event.type === "ChangePublished" || event.type === "ChangeCancelled") {
        allChanges.push({
          id: event.changeId,
          type: event.type === "ChangePublished" ? "published" : "cancelled",
          timestamp: event.timestamp,
        });
      }
    }

    allChanges.sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < allChanges.length; i++) {
      const change = allChanges[i];
      versions.push({
        id: change.id,
        type: change.type,
        timestamp: change.timestamp,
        description: `${change.type} ${change.id}`,
      });

      const included = new Set<string>();
      for (let j = 0; j <= i; j++) {
        const candidate = allChanges[j];
        if (candidate.type === "published" || candidate.id === change.id) {
          included.add(candidate.id);
        }
      }
      includedChangesLookup[change.id] = included;
    }

    return {
      versions: versions.sort((a, b) => b.timestamp - a.timestamp),
      includedChangesLookup,
    };
  }, [events]);

  const replayVersion = (
    versionId: string,
    activeChangeId: string | null = null
  ): State | null => {
    const includedChangesRaw = includedChangesLookup[versionId];
    if (!includedChangesRaw) return null;

    const includedChanges = new Set(includedChangesRaw);

    return reduce(events, requestId, activeChangeId, includedChanges);
  };

  const replayed = replayVersionId ? replayVersion(replayVersionId) : null;
  const displayState = replayed || state;

  const availableMonths = useMemo(() => {
    const months = Object.keys(displayState.finances);
    months.sort();
    return months;
  }, [displayState.finances]);

  const filteredMonth =
    selectedMonth && displayState.finances[selectedMonth]
      ? { [selectedMonth]: displayState.finances[selectedMonth] }
      : displayState.finances;

  // Collect all published change ids
  const publishedChangeIds = useMemo(() => {
    return versions.filter((v) => v.type === "published").map((v) => v.id);
  }, [versions]);

  // Create a Set of all published changes + current draft (if any)
  const includedChangesWithDraft = useMemo(() => {
    const set = new Set(publishedChangeIds);
    if (changeId) set.add(changeId);
    return set;
  }, [publishedChangeIds, changeId]);

  // Get the combined state including published + draft
  const stateWithDrafts = useMemo(() => {
    if (!includedChangesWithDraft.size) {
      // No included changes, fallback to base state
      return reduce(events, requestId, null);
    }
    return reduce(events, requestId, null, includedChangesWithDraft);
  }, [events, requestId, includedChangesWithDraft]);

  const filteredMonthWithDrafts =
    selectedMonth && stateWithDrafts.finances[selectedMonth]
      ? { [selectedMonth]: stateWithDrafts.finances[selectedMonth] }
      : stateWithDrafts.finances;

  // Check if there are any committed events for the current changeId
  const hasCommittedEventsForChange = events.some(
    (e) => "belongsTo" in e && e.belongsTo === changeId
  );

  return (
    <main className={styles.main}>
      {/* Left Side */}
      <section className={styles.leftColumn}>
        {/* Top Left: Event Sourcing Demo */}
        <div className={styles.topLeft}>
          <h1>Event Sourcing Demo</h1>
          <p>
            Status: <strong>{state.changeStatus}</strong>
          </p>
          <button
            className={`${styles.buttonBase} ${styles.btnCreateChange}`}
            onClick={() => createChangeCommand(setEvents, setChangeId)}
          >
            Create Change
          </button>
          <button
            className={`${styles.buttonBase} ${styles.btnIncome}`}
            onClick={() => {
              if (!changeId) return;
              const newEvent = addIncomeCommand(changeId);
              if (newEvent) {
                setPendingEvents((prev) => [...prev, newEvent]);
              }
            }}
            disabled={!changeId}
          >
            + Income
          </button>
          <button
            className={`${styles.buttonBase} ${styles.btnExpense}`}
            onClick={() => {
              if (!changeId) return;
              const newEvent = addExpenseCommand(changeId);
              if (newEvent) {
                setPendingEvents((prev) => [...prev, newEvent]);
              }
            }}
            disabled={!changeId}
          >
            + Expense
          </button>
          <button
            className={`${styles.buttonBase} ${styles.btnCommit}`}
            onClick={() => {
              setEvents((prev) => [...prev, ...pendingEvents]);
              setPendingEvents([]);
            }}
            disabled={pendingEvents.length === 0}
          >
            Commit
          </button>
          <button
            className={`${styles.buttonBase} ${styles.btnPublish}`}
            onClick={() => {
              if (!changeId) return;
              publishChangeCommand(changeId, setEvents, setChangeId);
            }}
            disabled={!changeId || !hasCommittedEventsForChange}
          >
            Publish
          </button>
          <button
            className={`${styles.buttonBase} ${styles.btnCancel}`}
            onClick={() => {
              if (!changeId) return;
              cancelChangeCommand(changeId, setEvents, setChangeId);
              setPendingEvents([]);
            }}
            disabled={!changeId || !hasCommittedEventsForChange}
          >
            Cancel
          </button>
          <p>
            Current ChangeId: <code>{changeId ?? "None"}</code>
          </p>
          <p>Committed Events: {events.length}</p>
          <p>Pending Events: {pendingEvents.length}</p>
          <div style={{ marginTop: "1rem" }}>
            <h3>Pending Events (Uncommitted)</h3>
            <ul>
              {pendingEvents.map((event, i) => (
                <li key={i}>
                  {event.type === "IncomeAdded" || event.type === "ExpenseAdded"
                    ? `${event.type === "IncomeAdded" ? "+" : "-"} ${event.amount} - ${event.description}`
                    : event.type}
                </li>
              ))}
            </ul>
          </div>
        </div>
  
        {/* Bottom Left: Event Source DB */}
        <div className={styles.bottomLeft}>
          <h2>Event Source DB</h2>
          <ol style={{ borderLeft: "3px solid orange", paddingLeft: "1rem" }}>
            {events.map((event, idx) => (
              <li key={idx} style={{ marginBottom: "1rem" }}>
                <EventEntry event={event} />
                <EventTime timestamp={event.timestamp} />
              </li>
            ))}
          </ol>
        </div>
      </section>
  
        {/* Top Right: Current State (Published + Committed) */}
        <div className={styles.topRight}>
        {/* Top Right: Published + Draft Events Summary */}
<section className={styles.topRight} aria-labelledby="published-draft-summary">
  <h2 id="published-draft-summary">Published + Draft Events Summary</h2>
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
      {Object.entries(filteredMonthWithDrafts).map(([monthKey, data]) => (
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
          <td className={data.net >= 0 ? styles.netPositive : styles.netNegative}>
            ${data.net}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</section>

{/* Version History Selection */}
<section className={styles.versionHistory} aria-labelledby="version-history-label">
  <h3 id="version-history-label">Version History</h3>
  <select
    value={replayVersionId}
    onChange={(e) => setReplayVersionId(e.target.value)}
    style={{ width: "100%", marginBottom: "1rem" }}
  >
    <option value="">-- Choose Version --</option>
    {versions.map((version) => (
      <option key={version.id} value={version.id}>
        {version.description} ({new Date(version.timestamp).toLocaleString()})
      </option>
    ))}
  </select>
</section>

{/* Bottom Right: Selected Version Details */}
<section className={styles.bottomRight} aria-labelledby="selected-version-details">
  {replayVersionId ? (
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
        {Object.entries(filteredMonth).map(([monthKey, data]) => (
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
            <td className={data.net >= 0 ? styles.netPositive : styles.netNegative}>
              ${data.net}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p>Please select a version to see history.</p>
  )}
</section>

        </div>

    </main>
  );
  
  

}
