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
  cancelChangeCommand,
} from "./commands";

import ProjectionScreen from "./ProjectionScreen";
import ProjectionHistory from "./ProjectionHistory";

import {
  Entry,
  Event,
  EventWithoutTimestamp,
  MonthlyFinances,
  State,
  TimePeriod,
  VersionInfo,
} from "./genericTypes";


// Utility functions

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

export function formatMonthDisplay(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);

  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
  });
  return formatter.format(date);
}

export function createEvent<T extends EventWithoutTimestamp>(
  event: T
): T & { timestamp: number } {
  const timestamp = Date.now();
  return {
    ...event,
    timestamp,
  };
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

export default function EventSourceEditor() {
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

  const state: State = reduce(events, requestId, changeId);

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
            className={`${styles.buttonBase} ${styles.btnIncome}`}
            onClick={() => createChangeCommand(setEvents, setChangeId)}
          >
            Create Change
          </button>
          <button
          className={`${styles.buttonBase} ${styles.btnExpense}`}
           onClick={async () => {  // ✅ Add async here
            if (!changeId) return;
            const newEvent = await addIncomeCommand(changeId);  // ✅ Add await
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
            onClick={async () => {  // ✅ Add async here
                if (!changeId) return;
                const newEvent = await addExpenseCommand(changeId);  // ✅ Add await
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
          <div className={styles.pendingEvents}>
            <h3>Pending Commands:</h3>
                {pendingEvents.length === 0 ? (
                    <p>No pending commands.</p>
                ) : (
                    <ul>
                    {pendingEvents.map((event, index) => {
                        if (event.type !== "IncomeAdded" && event.type !== "ExpenseAdded") return null;
                        return (
                        <li key={index} style={{ marginBottom: "0.5em" }}>
                            <strong>Reference:</strong> {event.description} <br />
                            <strong>Amount:</strong> {event.amount} <br />
                            <strong>Period:</strong> {event.period.start.toLocaleDateString()} - {event.period.end.toLocaleDateString()}
                        </li>
                        );
                    })}
                    </ul>
                )}
                </div>


        </div>

        {/* Bottom Left: Event Entries */}
        <div className={styles.bottomLeft}>
          <h2>Events</h2>
          <div className={styles.eventList}>
            {[...events].reverse().map((event, idx) => (
              <EventEntry key={`${event.timestamp}-${idx}`} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* Right Side */}
      <section className={styles.rightColumn}>
        <ProjectionScreen
          finances={filteredMonthWithDrafts}
          selectedMonth={selectedMonth}
          onMonthSelect={setSelectedMonth}
          months={availableMonths}
        />
        <ProjectionHistory
            finances={replayed ? replayed.finances : {}}
            replayVersionId={replayVersionId}    // <-- correct prop name
            setReplayVersionId={setReplayVersionId} // Also provide this required callback
            versions={versions}                   // Also provide versions array, required by component
            />


      </section>
    </main>
  );
}
