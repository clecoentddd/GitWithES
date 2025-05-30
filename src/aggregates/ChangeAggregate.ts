// src/aggregates/ChangeAggregate.ts
import type { Event } from "../slices/shared/genericTypes";
// src/aggregates/ChangeAggregate.ts

// aggregates/ChangeAggregate.ts

export class ChangeAggregate {
    private status: "draft" | "published" | "cancelled" = "draft";
    private committedEventCount = 0;
    private readonly changeId: string;
  
    constructor(changeId: string) {
      this.changeId = changeId;
    }
  
    public apply(event: Event) {
      if ("belongsTo" in event && event.belongsTo === this.changeId) {
        this.committedEventCount++;
      }
  
      if (event.type === "ChangePublished" && event.changeId === this.changeId) {
        this.status = "published";
      }
  
      if (event.type === "ChangeCancelled" && event.changeId === this.changeId) {
        this.status = "cancelled";
      }
    }
  
    public canPublish(): boolean {
      return this.status === "draft" && this.committedEventCount > 0;
    }
  
    public canCancel(): boolean {
      return this.status === "draft" && this.committedEventCount > 0;
    }
  
    public canCommit(): boolean {
      return this.status === "draft";
    }

    public canAddItem(): boolean {
        return this.status === "draft";
      }
  
    public getStatus() {
      return this.status;
    }
  }
  