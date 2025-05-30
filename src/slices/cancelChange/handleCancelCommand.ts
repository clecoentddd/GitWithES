import { DBEvents } from "../shared/DBEVents";
import { ChangeAggregate } from "../../aggregates/ChangeAggregate";
import type { Event } from "../shared/genericTypes";

export async function handleCancelCommand(changeId: string, allEvents: Event[]) {
  const aggregate = new ChangeAggregate(changeId);
  allEvents.forEach(e => aggregate.apply(e));

  if (!aggregate.canCancel()) {
    throw new Error("Cannot cancel: change is not in draft or has no committed events.");
  }

  const cancelEvent: Event = {
    type: "ChangeCancelled",
    timestamp: Date.now(),
    changeId,
  };

  await DBEvents.append([cancelEvent]);
}
