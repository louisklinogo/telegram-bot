import type { WASocket } from "@whiskeysockets/baileys";

const sockets = new Map<string, WASocket>();

export const Registry = {
  has(accountId: string) {
    return sockets.has(accountId);
  },
  get(accountId: string) {
    return sockets.get(accountId) || null;
  },
  set(accountId: string, sock: WASocket) {
    sockets.set(accountId, sock);
  },
  delete(accountId: string) {
    sockets.delete(accountId);
  },
  entries() {
    return Array.from(sockets.entries());
  },
};
