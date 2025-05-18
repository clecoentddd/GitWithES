"use client";

import { useState, useMemo } from "react";
import styles from "./Home.module.css";
import { useDB } from "./DBEVents";
import {
  addIncomeCommand,
  addExpenseCommand,
  createChangeCommand,
  publishChangeCommand,
  cancelChangeCommand,
} from "./commands";
import ProjectionScreen from "./ProjectionView";
import ProjectionHistory from "./ProjectionHistory";
import { DBEvents } from "./DBEVents";
import { VersionInfo, Event, MonthlyFinances } from "./genericTypes";

export function createEvent<T>(event: T): T & { timestamp: number } {
  return { ...event, timestamp: Date.now() };
}

export function formatMonthDisplay(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long" }).format(date);
}

export default function EventSourceEditor() {
    const allEvents = useDB(DBEvents); // All committed events from DB
    const [changeId, setChangeId] = useState<string | null>(null);
    const [pendingEvents, setPendingEvents] = useState<Event[]>([]); // typed as Event[]
    const [replayVersionId, setReplayVersionId] = useState<string>("");

    // Filter published or cancelled events for ProjectionHistory
    const publishedOrCancelledEvents = useMemo(() => {
      return allEvents.filter(
        (e) => e.type === "ChangePublished" || e.type === "ChangeCancelled"
      );
    }, [allEvents]);

    // Map to VersionInfo[] for ProjectionHistory
    const versions: VersionInfo[] = useMemo(() => {
      return publishedOrCancelledEvents.map(ev => ({
        id: ev.changeId,
        description: ev.type === "ChangePublished" ? "Published" : "Cancelled",
        timestamp: ev.timestamp,
        type: ev.type === "ChangePublished" ? "published" : "cancelled",  // lowercase strings as expected by VersionInfo
      }));
    }, [publishedOrCancelledEvents]);

    // Filter published change IDs
    const publishedChangeIds = useMemo(() => {
      return new Set(
        allEvents
          .filter((e) => e.type === "ChangePublished")
          .map((e) => e.changeId)
      );
    }, [allEvents]);

    // Include all committed events for ProjectionScreen
    const publishedAndCommittedEvents = useMemo(() => {
      return allEvents.filter((e) => {
        // Include all committed events, regardless of publication status
        return true; // This includes all events
      });
    }, [allEvents]);

    // Filter events for ProjectionHistory
    const historyEvents = useMemo(() => {
      return allEvents.filter(
        (e) => e.type === "ChangePublished" || e.type === "ChangeCancelled"
      );
    }, [allEvents]);

    // Example implementation to compute finances

    const finances = useMemo(() => {
        if (!replayVersionId) return {};
      
        const versionEvents = allEvents.filter(
          (e): e is Extract<Event, { type: "IncomeAdded" | "ExpenseAdded" }> =>
            (e.type === "IncomeAdded" || e.type === "ExpenseAdded") &&
            e.belongsTo === replayVersionId
        );
      
        const finances: MonthlyFinances = {};
      
        versionEvents.forEach((event) => {
          const startDate = new Date(event.period.start);
          const endDate = new Date(event.period.end);
      
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn("⚠️ Invalid date range in event:", event);
            return;
          }
      
          // Create a loop over months in the period range
          let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      
          while (current <= endDate) {
            const monthKey = `${current.getFullYear()}-${current.getMonth() + 1}`;
      
            if (!finances[monthKey]) {
              finances[monthKey] = { incomes: [], expenses: [], net: 0 };
            }
      
            if (event.type === "IncomeAdded") {
              finances[monthKey].incomes.push({
                amount: event.amount,
                description: event.description,
                kind: "income",
                changeId: event.belongsTo,
              });
              finances[monthKey].net += event.amount;
            } else if (event.type === "ExpenseAdded") {
              finances[monthKey].expenses.push({
                amount: event.amount,
                description: event.description,
                kind: "expense",
                changeId: event.belongsTo,
              });
              finances[monthKey].net -= event.amount;
            }
      
            // Move to the next month
            current.setMonth(current.getMonth() + 1);
          }
        });
      
        console.log("✅ Final Finances Object:", finances);
        return finances;
      }, [replayVersionId, allEvents]);
      
      

      const cumulativeFinances = useMemo(() => {
        if (!replayVersionId) return {};
      
        // Get all published change IDs in order
        const publishedChangeEvents = allEvents
          .filter((e): e is Extract<Event, { type: "ChangePublished" }> => e.type === "ChangePublished")
          .sort((a, b) => a.timestamp - b.timestamp);
      
        // Determine which versions should be included
        const relevantChangeIds: string[] = [];
        for (const ev of publishedChangeEvents) {
          relevantChangeIds.push(ev.changeId);
          if (ev.changeId === replayVersionId) break;
        }
      
        const versionEvents = allEvents.filter(
            (e): e is Extract<Event, { type: "IncomeAdded" | "ExpenseAdded" }> =>
              (e.type === "IncomeAdded" || e.type === "ExpenseAdded") &&
              typeof e.belongsTo === "string" &&
              relevantChangeIds.includes(e.belongsTo)
          );
      
        // Build monthly finances from events
        const finances: MonthlyFinances = {};
      
        versionEvents.forEach((event) => {
          const startDate = new Date(event.period.start);
          const endDate = new Date(event.period.end);
      
          // Loop through every month from start to end
          const current = new Date(startDate);
          current.setDate(1); // Ensure it's the 1st of the month
      
          while (current <= endDate) {
            const monthKey = `${current.getFullYear()}-${current.getMonth() + 1}`;
      
            if (!finances[monthKey]) {
              finances[monthKey] = { incomes: [], expenses: [], net: 0 };
            }
      
            if (event.type === "IncomeAdded") {
              finances[monthKey].incomes.push({
                amount: event.amount,
                description: event.description,
                kind: "income",
                changeId: event.belongsTo,
              });
              finances[monthKey].net += event.amount;
            } else if (event.type === "ExpenseAdded") {
              finances[monthKey].expenses.push({
                amount: event.amount,
                description: event.description,
                kind: "expense",
                changeId: event.belongsTo,
              });
              finances[monthKey].net -= event.amount;
            }
      
            // Move to next month
            current.setMonth(current.getMonth() + 1);
          }
        });
      
        return finances;
      }, [replayVersionId, allEvents]);
      
  
  

    // Pending events not committed yet
    const hasCommittedEventsForChange = allEvents.some(
      (e) => 'belongsTo' in e && e.belongsTo === changeId
    );

    const handleCommit = () => {
      DBEvents.append(pendingEvents);
      setPendingEvents([]);
    };

    const handlePublish = () => {
      if (!changeId) return;
      const event = publishChangeCommand(changeId);
      if (event) {
        DBEvents.append([event]);
        setChangeId(null);
      }
    };

    const handleCancel = () => {
      if (!changeId) return;
      const event = cancelChangeCommand(changeId);
      if (event) {
        DBEvents.append([event]);
        setChangeId(null);
        setPendingEvents([]);
      }
    };

    const handleCreateChange = () => {
      const newId = createChangeCommand();
      setChangeId(newId);
    };

    // Add missing onReplay handler required by ProjectionScreen
    const handleReplay = () => {
      console.log("Replay Published Events clicked");
      // Implement any reset or replay logic here as needed
    };

    return (
      <main className={styles.main}>
        <section className={styles.leftColumn}>
          <div className={styles.topLeft}>
            <h1>Event Sourcing Demo</h1>
            <p>
              Change in progress: <strong>{changeId || "None"}</strong>
            </p>

            <button
              className={`${styles.buttonBase} ${styles.btnIncome}`}
              onClick={handleCreateChange}
            >
              Create Change
            </button>

            <button
              className={`${styles.buttonBase} ${styles.btnIncome}`}
              onClick={async () => {
                if (!changeId) return;
                const newEvent = await addIncomeCommand(changeId);
                if (newEvent) setPendingEvents((prev) => [...prev, newEvent]);
              }}
              disabled={!changeId}
            >
              + Income
            </button>

            <button
              className={`${styles.buttonBase} ${styles.btnExpense}`}
              onClick={async () => {
                if (!changeId) return;
                const newEvent = await addExpenseCommand(changeId);
                if (newEvent) setPendingEvents((prev) => [...prev, newEvent]);
              }}
              disabled={!changeId}
            >
              + Expense
            </button>

            <button
              className={`${styles.buttonBase} ${styles.btnCommit}`}
              onClick={handleCommit}
              disabled={pendingEvents.length === 0}
            >
              Commit
            </button>

            <button
              className={`${styles.buttonBase} ${styles.btnPublish}`}
              onClick={handlePublish}
              disabled={!changeId || !hasCommittedEventsForChange}
            >
              Publish
            </button>

            <button
              className={`${styles.buttonBase} ${styles.btnCancel}`}
              onClick={handleCancel}
              disabled={!changeId || !hasCommittedEventsForChange}
            >
              Cancel
            </button>

            <div className={styles.pendingEvents}>
              <h3>Pending Events</h3>
              {pendingEvents.length === 0 ? (
                <p>No pending commands.</p>
              ) : (
                <ul>
                  {pendingEvents.map((event, index) => {
                    if (event.type !== "IncomeAdded" && event.type !== "ExpenseAdded") return null;
                    return (
                      <li key={index} style={{ marginBottom: "0.5em" }}>
                        <strong>Description:</strong> {event.description} <br />
                        <strong>Amount:</strong> {event.amount} <br />
                        <strong>Period:</strong>{" "}
                        {event.period.start.toLocaleDateString()} -
                        {event.period.end.toLocaleDateString()}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className={styles.orangeTheme}>
              <div className={styles.allEventsContainer}>
                <h2>All Events (latest first)</h2>
                <div className={styles.eventList}>
                  {[...allEvents]
                    .reverse()
                    .map((ev, idx) => (
                      <pre key={`${ev.timestamp}-${idx}`} className={styles.eventItem}>
                        {JSON.stringify(ev, null, 2)}
                      </pre>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.rightColumn}>
          <ProjectionScreen
            events={publishedAndCommittedEvents}
            draftChangeId={changeId}
            publishedChangeIds={publishedChangeIds}
            onReplay={handleReplay}
          />

          <ProjectionHistory
            versions={versions}
            replayVersionId={replayVersionId}
            setReplayVersionId={setReplayVersionId}
            finances={cumulativeFinances}
          />
        </section>
      </main>
    );
  }
