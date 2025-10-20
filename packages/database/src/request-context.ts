import { AsyncLocalStorage } from "node:async_hooks";

type QueryLog = {
  sql: string;
  ms: number;
};

export type RequestContext = {
  reqId: string;
  procedure?: string;
  startAt?: number;
  queries: QueryLog[];
  queryCount: number;
};

const als = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: Omit<RequestContext, "queries" | "queryCount">, fn: () => Promise<T> | T): Promise<T> | T {
  const initial: RequestContext = { ...ctx, queries: [], queryCount: 0 };
  return als.run(initial, fn as any);
}

export function addQueryLog(entry: QueryLog) {
  const store = als.getStore();
  if (store) {
    store.queryCount += 1;
    store.queries.push(entry);
  }
}

export function getRequestContext(): RequestContext | undefined {
  return als.getStore();
}
