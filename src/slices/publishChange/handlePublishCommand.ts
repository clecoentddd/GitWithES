// src/slices/publishChange/handlePublishCommand.ts
import { DBEvents } from "../shared/DBEVents";
import { ChangeAggregate } from "../../aggregates/ChangeAggregate";
import type { Event } from "../shared/genericTypes";

export async function handlePublishCommand(changeId: string, allEvents: Event[]) {
  const aggregate = new ChangeAggregate(changeId);
  allEvents.forEach(e => aggregate.apply(e));

  if (!aggregate.canPublish()) {
    throw new Error("Cannot publish this change: it must be a draft with committed events.");
  }

  const publishEvent: Event = {
    type: "ChangePublished",
    timestamp: Date.now(),
    changeId,
  };

  await DBEvents.append([publishEvent]);
}
