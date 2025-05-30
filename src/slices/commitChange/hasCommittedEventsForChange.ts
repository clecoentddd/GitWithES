import type { Event as DomainEvent } from "../shared/genericTypes";

export function hasCommittedEventsForChange(
  events: DomainEvent[],
  changeId: string | null
): boolean {
  if (!changeId) return false;

  return events.some(
    (e) => "belongsTo" in e && (e as any).belongsTo === changeId
  );
}
