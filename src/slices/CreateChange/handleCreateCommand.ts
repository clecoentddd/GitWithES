import { createChangeCommand } from "./createChangeCommand";

export function handleCreateCommand(setChangeId: (id: string) => void): void {
  const newId = createChangeCommand();
  setChangeId(newId);
}
