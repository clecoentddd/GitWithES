// src/slices/publish/createPublishEvent.ts
import { createEvent } from "../shared/createEvent";
import type { Event as DomainEvent } from "../shared/genericTypes";

export function createPublishEvent(changeId: string): DomainEvent {
  return createEvent({ type: "ChangePublished", changeId });
}