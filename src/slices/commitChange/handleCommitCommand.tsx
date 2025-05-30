// src/slices/commit/handleCommit.ts
import { DBEvents } from "../shared/DBEVents";
import { ChangeAggregate } from "../../aggregates/ChangeAggregate";
import type { Event } from "../shared/genericTypes";

export async function handleCommitCommand(
    changeId: string,
    pendingEvents: Event[],
    allEvents: Event[],
    setPendingEvents: (e: Event[]) => void
  ) {
    const aggregate = new ChangeAggregate(changeId);
    allEvents.forEach(e => aggregate.apply(e));
  
    if (!aggregate.canCommit()) {
      throw new Error("Cannot commit: change must be in draft.");
    }
  
    await DBEvents.append(pendingEvents);
    setPendingEvents([]);
  }
  