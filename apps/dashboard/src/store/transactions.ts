import type { RowSelectionState, Updater } from "@tanstack/react-table";
import { create } from "zustand";

interface TransactionsState {
  rowSelection: RowSelectionState;
  setRowSelection: (updater: Updater<RowSelectionState>) => void;
  clearSelection: () => void;
}

export const useTransactionsStore = create<TransactionsState>()((set) => ({
  rowSelection: {},
  setRowSelection: (updater: Updater<RowSelectionState>) =>
    set((state) => ({
      rowSelection: typeof updater === "function" ? updater(state.rowSelection) : updater,
    })),
  clearSelection: () => set({ rowSelection: {} }),
}));
