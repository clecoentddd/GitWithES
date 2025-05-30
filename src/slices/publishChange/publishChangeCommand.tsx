// src/slices/publish/publishChangeCommand.ts
import { DBEvents } from "../shared/DBEVents";
import { createPublishEvent } from './createPublishEvent';

export function publishChangeCommand(changeId: string) {
  const event = createPublishEvent(changeId);
  DBEvents.append(event);
}
