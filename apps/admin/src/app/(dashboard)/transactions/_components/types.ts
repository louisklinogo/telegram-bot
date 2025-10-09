export type FilterState = {
  type?: "payment" | "expense" | "refund" | "adjustment";
  search?: string;
  startDate?: string; // ISO 8601 at day start (00:00:00Z)
  endDate?: string; // ISO 8601 at day end (23:59:59Z)
  statuses?: Array<"pending" | "completed" | "failed" | "cancelled">;
  hasAttachments?: boolean; // undefined = any
  isRecurring?: boolean;
  categories?: string[]; // slugs
  accounts?: string[]; // ids
  assignees?: string[]; // ids
  tags?: string[]; // ids
  amountMin?: number;
  amountMax?: number;
  limit?: number; // default 50
};
