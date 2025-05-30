"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./Home.module.css";
import { useDB } from '../src/slices/shared/DBEVents';
import {
  addIncomeCommand,
  addExpenseCommand,
} from "./commands";
import { handleCreateCommand } from '../src/slices/CreateChange/handleCreateCommand';
import { handlePublishCommand } from '../src/slices/publishChange/handlePublishCommand';
import { handleCancelCommand } from '../src/slices/cancelChange/handleCancelCommand';
import { handleCommitCommand } from '../src/slices/commitChange/handleCommitCommand';

import { updateViewStateFinances } from '../src/slices/viewIncomesExpenses/updateViewStateFinances';
import { updateCumulativeFinances } from "../src/slices/viewIncomesExpenses/updateCumulativeFinances";

import ProjectionScreen from "../src/slices/viewIncomesExpenses/ProjectionView";
import ProjectionHistory from "../src/slices/viewIncomesExpenses/ProjectionHistory";
import { DBEvents } from '../src/slices/shared/DBEVents';
import { Finances, VersionInfo } from "../src/slices/shared/genericTypes";
import { Event } from '../src/slices/shared/genericTypes';
import { openEventDB } from "../src/utils/openEventDB";

import { ChangeAggregate } from "../src/aggregates/ChangeAggregate";

export default function EventSourceEditor() {
  useEffect(() => {
    (async () => {
      const db = await openEventDB();
  
      // Start transactions and access object stores immediately
      const tx1 = db.transaction("view_state_incomes_expenses", "readwrite");
      const tx2 = db.transaction("view_state_cumulative_finances", "readwrite");
      const tx3 = db.transaction("events", "readwrite");
  
      const store1 = tx1.objectStore("view_state_incomes_expenses");
      const store2 = tx2.objectStore("view_state_cumulative_finances");
      const store3 = tx3.objectStore("events");
  
      // Clear stores without awaiting between
      const clear1 = store1.clear();
      const clear2 = store2.clear();
      const clear3 = store3.clear();
  
      await Promise.all([clear1, clear2, clear3]);
      await Promise.all([tx1.done, tx2.done, tx3.done]);
  
      console.log("IndexedDB cleared.");
    })();
  }, []);
  
  
  
  const allEvents = useDB(DBEvents);
  const [changeId, setChangeId] = useState<string | null>(null);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [replayVersionId, setReplayVersionId] = useState<string>("");
  const [finances, setFinances] = useState<Finances>({});

  const currentAggregate = useMemo(() => {
    if (!changeId) return null;
    const aggregate = new ChangeAggregate(changeId);
    allEvents.forEach(e => aggregate.apply(e));
    return aggregate;
  }, [changeId, allEvents]);

  useEffect(() => {
    if (!changeId) return;
    const versionEvents = allEvents.filter(
      (e): e is Extract<Event, { type: "IncomeAdded" | "ExpenseAdded" }> =>
        (e.type === "IncomeAdded" || e.type === "ExpenseAdded") &&
        e.belongsTo === changeId
    );
  
    updateViewStateFinances(versionEvents, changeId).then(async () => {
      const db = await openEventDB();
      const stored = await db.get("view_state_incomes_expenses", changeId);
      if (stored) setFinances(stored);
    });
  }, [changeId, allEvents]);
  

  useEffect(() => {
    if (!replayVersionId) return;
    updateCumulativeFinances(allEvents, replayVersionId).then(async () => {
      const db = await openEventDB();
      const stored = await db.get("view_state_cumulative_finances", replayVersionId);
      if (stored) setFinances(stored);
    });
  }, [replayVersionId, allEvents]);

  const publishedChangeIds = useMemo(() => {
    return new Set(
      allEvents.filter((e) => e.type === "ChangePublished").map((e) => e.changeId)
    );
  }, [allEvents]);

  const versions = useMemo(() => {
    return allEvents
      .filter((e) => e.type === "ChangePublished" || e.type === "ChangeCancelled")
      .map((ev) => ({
        id: ev.changeId,
        description: ev.type === "ChangePublished" ? "Published" : "Cancelled",
        timestamp: ev.timestamp,
        type: ev.type === "ChangePublished" ? "published" as const : "cancelled" as const,
      }));
  }, [allEvents]);

  const latestPublishedVersionId = useMemo(() => {
    return [...versions].reverse().find(v => v.type === "published")?.id ?? null;
  }, [versions]);
  

  return (
    <main className={styles.main}>
      <section className={styles.leftColumn}>
        <div className={styles.topLeft}>
          <h1 className={styles.heading}>Event Sourcing Demo</h1>
          <p className={styles.paragraph}>
            Request UUID: 0x01 — Change ID:{" "}
            <strong className={styles.strongText}>{changeId || "None"}</strong> — Status:{" "}
            <strong className={styles.strongText}>
              {changeId ? currentAggregate?.getStatus() ?? "Unknown" : "None"}
            </strong>
          </p>


          <button className={`${styles.buttonBase} ${styles.btnCreateChange}`} onClick={() => handleCreateCommand(setChangeId)}>Create Change</button>

          <button
            className={`${styles.buttonBase} ${styles.btnIncome}`}
            onClick={async () => {
              if (!changeId || !currentAggregate?.canAddItem()) return;
              const newEvent = await addIncomeCommand(changeId);
              if (newEvent) setPendingEvents((prev) => [...prev, newEvent]);
            }}
            disabled={!changeId || !currentAggregate?.canAddItem()}
          >
            + Income
          </button>

          <button
            className={`${styles.buttonBase} ${styles.btnExpense}`}
            onClick={async () => {
              if (!changeId || !currentAggregate?.canAddItem()) return;
              const newEvent = await addExpenseCommand(changeId);
              if (newEvent) setPendingEvents((prev) => [...prev, newEvent]);
            }}
            disabled={!changeId || !currentAggregate?.canAddItem()}
          >
            + Expense
          </button>

          <button
            className={`${styles.buttonBase} ${styles.btnCommit}`}
            onClick={() => {
              if (changeId && currentAggregate?.canCommit()) {
                handleCommitCommand(changeId, pendingEvents, allEvents, setPendingEvents);
              }
            }}
            disabled={!changeId || !currentAggregate?.canCommit() || pendingEvents.length === 0}
          >
            Commit
          </button>

          <button
            className={`${styles.buttonBase} ${styles.btnPublish}`}
            onClick={() => changeId && currentAggregate?.canPublish() && handlePublishCommand(changeId, allEvents)}
            disabled={!changeId || !currentAggregate?.canPublish()}
          >
            Publish
          </button>

          <button
            className={`${styles.buttonBase} ${styles.btnCancel}`}
            onClick={() => changeId && currentAggregate?.canCancel() && handleCancelCommand(changeId, allEvents)}
            disabled={!changeId || !currentAggregate?.canCancel()}
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
                      {event.period.start.toLocaleDateString()} - {event.period.end.toLocaleDateString()}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className={styles.orangeTheme}>
          <div className={styles.allEventsContainer}>
            <h2>All Events (latest first)</h2>
            <div className={styles.eventList}>
              {[...allEvents].reverse().map((ev, idx) => (
                <pre key={`${ev.timestamp}-${idx}`} className={styles.eventItem}>
                  {JSON.stringify(ev, null, 2)}
                </pre>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
      <ProjectionScreen
          draftChangeId={changeId}
          publishedChangeIds={publishedChangeIds}
          onReplay={() => console.log("Replay Published Events clickedb2")}
          finances={finances}
        />



        <ProjectionHistory
          versions={versions}
          replayVersionId={replayVersionId}
          setReplayVersionId={setReplayVersionId}
        />
      </section>
    </main>
  );
}
