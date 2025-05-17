// genericTypes.ts

export type TimePeriod = {
    start: Date;
    end: Date;
  };
  
  export type Entry = {
    amount: number;
    description: string;
    kind: "income" | "expense";
    changeId: string;
  };
  
  export type MonthlyFinances = {
    [monthKey: string]: {
      incomes: Entry[];
      expenses: Entry[];
      net: number;
    };
  };
  
  export type State = {
    finances: MonthlyFinances;
    changeId: string | null;
    requestId: string;
    changeStatus: "completed" | "draft" | "published" | "cancelled";
    version: number;
    timestamp: number;
  };
  
  export type VersionInfo = {
    id: string;
    type: "published" | "cancelled";
    timestamp: number;
    description: string;
  };
  
  export type Event = {
    timestamp: number;
  } & (
    | { type: "RequestCreated"; requestId: string }
    | { type: "ChangeCreated"; changeId: string }
    | {
        type: "IncomeAdded";
        amount: number;
        description: string;
        belongsTo: string;
        period: TimePeriod;
      }
    | {
        type: "ExpenseAdded";
        amount: number;
        description: string;
        belongsTo: string;
        period: TimePeriod;
      }
    | { type: "EntryRemoved"; index: number; belongsTo: string }
    | { type: "ChangeCancelled"; changeId: string }
    | { type: "ChangePublished"; changeId: string }
  );
  
  export type EventWithoutTimestamp =
    | Omit<Event, "timestamp"> & { type: "RequestCreated" }
    | Omit<Event, "timestamp"> & { type: "ChangeCreated" }
    | Omit<Event, "timestamp"> & { type: "IncomeAdded" }
    | Omit<Event, "timestamp"> & { type: "ExpenseAdded" }
    | Omit<Event, "timestamp"> & { type: "EntryRemoved" }
    | Omit<Event, "timestamp"> & { type: "ChangeCancelled" }
    | Omit<Event, "timestamp"> & { type: "ChangePublished" };
  