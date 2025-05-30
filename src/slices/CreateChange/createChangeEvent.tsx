import { createEvent } from "../shared/createEvent";
import type { Event as DomainEvent } from "../shared/genericTypes"; // or wherever it's defined

export function createChangeEvent(): { event: DomainEvent, changeId: string } {
  const newId = `0x${(Math.random() * 10000).toFixed(0)}`;
  return {
    event: createEvent({ type: "ChangeCreated", changeId: newId }),
    changeId: newId
  };
}
