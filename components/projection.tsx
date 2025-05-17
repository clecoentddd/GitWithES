"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { Event } from '../types/types';

// ProjectionEvent type for the projection layer
export type ProjectionEvent =
  | { type: "RequestCreated"; requestId: string; timestamp: number }
  | { type: "ChangeCreated"; changeId: string; timestamp: number }
  | {
      type: "IncomeAdded" | "ExpenseAdded";
      amount: number;
      description: string;
      belongsTo: string;
      period: { start: string; end: string }; // ISO string dates here
      timestamp: number;
    }
  | { type: "EntryRemoved"; index: number; belongsTo: string; timestamp: number }
  | { type: "ChangeCancelled"; changeId: string; timestamp: number }
  | { type: "ChangePublished"; changeId: string; timestamp: number };

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

function formatMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthsInPeriod(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (current <= last) {
    months.push(new Date(current));
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  return months;
}

function reduce(
  events: ProjectionEvent[],
  requestId: string,
  activeChangeId: string | null,
  includedChanges?: Set<string>
) {
  console.log("Starting reduce with events:", events);
  console.log("requestId:", requestId, "activeChangeId:", activeChangeId, "includedChanges:", includedChanges);

  const finances: MonthlyFinances = {};
  let isChangeCancelled = false;
  let isChangePublished = false;
  let latestTimestamp = 0;

  const applyEvent = (event: ProjectionEvent) => {
    console.log("Applying event:", event);
    latestTimestamp = Math.max(latestTimestamp, event.timestamp);

    if ((event.type === "IncomeAdded" || event.type === "ExpenseAdded") && event.period) {
      const start = new Date(event.period.start);
      const end = new Date(event.period.end);

      console.log(`Event period start: ${start.toISOString()}, end: ${end.toISOString()}`);

      const belongsToRelevant =
        event.belongsTo === requestId ||
        event.belongsTo === activeChangeId ||
        (includedChanges ? includedChanges.has(event.belongsTo) : false);

      console.log(`belongsToRelevant? ${belongsToRelevant} for belongsTo=${event.belongsTo}`);

      if (!belongsToRelevant) {
        console.log("Skipping event as it does not belong to relevant IDs");
        return;
      }

      const months = getMonthsInPeriod(start, end);
      console.log("Months in period:", months.map((m) => m.toISOString()));

      months.forEach((month) => {
        const monthKey = formatMonthKey(month);

        if (!finances[monthKey]) {
          finances[monthKey] = { incomes: [], expenses: [], net: 0 };
          console.log(`Created new month entry for ${monthKey}`);
        }

        const entry: Entry = {
          amount: event.amount,
          description: event.description,
          kind: event.type === "IncomeAdded" ? "income" : "expense",
          changeId: event.belongsTo,
        };

        console.log(`Adding entry to ${monthKey}:`, entry);

        if (entry.kind === "income") {
          finances[monthKey].incomes.push(entry);
          finances[monthKey].net += entry.amount;
        } else {
          finances[monthKey].expenses.push(entry);
          finances[monthKey].net -= entry.amount;
        }
        console.log(`Updated finances for ${monthKey}:`, finances[monthKey]);
      });
    } else if (event.type === "ChangeCancelled" && event.changeId === activeChangeId) {
      console.log("ChangeCancelled for activeChangeId");
      isChangeCancelled = true;
    } else if (event.type === "ChangePublished" && event.changeId === activeChangeId) {
      console.log("ChangePublished for activeChangeId");
      isChangePublished = true;
    } else {
      console.log(`Event of type ${event.type} did not affect finances`);
    }
  };

  events.forEach(applyEvent);

  const changeStatus = isChangeCancelled
    ? "cancelled"
    : isChangePublished
    ? "published"
    : activeChangeId
    ? "draft"
    : "completed";

  console.log("Finished reduce. Result:", {
    finances,
    requestId,
    changeId: activeChangeId,
    changeStatus,
    version: events.length,
    timestamp: latestTimestamp,
  });

  return {
    finances,
    requestId,
    changeId: activeChangeId,
    changeStatus,
    version: events.length,
    timestamp: latestTimestamp,
  };
}

type ProjectionProps = {
  events: Event[];
  requestId: string;
  activeChangeId: string | null;
  includedChanges?: Set<string>;
};

export default function Projection({
  events,
  requestId,
  activeChangeId = null,
  includedChanges,
}: ProjectionProps) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Convert period dates to ISO strings synchronously on every render (server & client)
  const projectionEvents: ProjectionEvent[] = events.map((e) => {
    if ("period" in e && e.period) {
      return {
        ...e,
        period: {
          start: e.period.start.toISOString(),
          end: e.period.end.toISOString(),
        },
      };
    }
    return e as ProjectionEvent;
  });

  const state = useMemo(
    () => reduce(projectionEvents, requestId, activeChangeId, includedChanges),
    [projectionEvents, requestId, activeChangeId, includedChanges]
  );

  if (!hydrated) {
    // Prevent render mismatch by rendering nothing on SSR
    return null;
  }

  if (!state.finances || Object.keys(state.finances).length === 0) {
    return <pre>{"{}"}</pre>;
  }

  return (
    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {JSON.stringify(state.finances, null, 2)}
    </pre>
  );
}
