// src/slices/createChange/createChangeCommand.ts

import { DBEvents } from '../shared/DBEVents'; // Ensure the import path matches the file name casing
import { createChangeEvent } from './createChangeEvent';

export function createChangeCommand(): string {
  const { event, changeId } = createChangeEvent();
  DBEvents.append(event);
  return changeId;
}
