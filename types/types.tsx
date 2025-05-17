type TimePeriod = {
    start: Date;
    end: Date;
  };
  
  export type Event = 
  | { type: 'RequestCreated'; requestId: string; timestamp: number }
  | { type: 'ChangeCreated'; changeId: string; timestamp: number }
  | { type: 'IncomeAdded'; amount: number; description: string; belongsTo: string; period: { start: Date; end: Date }; timestamp: number }
  | { type: 'ExpenseAdded'; amount: number; description: string; belongsTo: string; period: { start: Date; end: Date }; timestamp: number }
  | { type: 'EntryRemoved'; index: number; belongsTo: string; timestamp: number }
  | { type: 'ChangeCancelled'; changeId: string; timestamp: number }
  | { type: 'ChangePublished'; changeId: string; timestamp: number };

  

export type Entry = {
  amount: number;
  description: string;
  kind: 'income' | 'expense';
};

export type State = {
  entries: Entry[];
  changeId: string | null;
  requestId: string;
  changeStatus: 'completed' | 'draft' | 'published';
};
