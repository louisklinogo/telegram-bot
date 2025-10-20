import { create } from "zustand";

interface VaultState {
  selectedDocuments: Set<string>;
  setSelectedDocuments: (documents: Set<string>) => void;
  toggleDocument: (documentId: string) => void;
  clearSelection: () => void;
  selectAll: (documentIds: string[]) => void;
}

export const useVaultStore = create<VaultState>()((set) => ({
  selectedDocuments: new Set(),

  setSelectedDocuments: (documents) => set({ selectedDocuments: documents }),

  toggleDocument: (documentId) =>
    set((state) => {
      const newSelection = new Set(state.selectedDocuments);
      if (newSelection.has(documentId)) {
        newSelection.delete(documentId);
      } else {
        newSelection.add(documentId);
      }
      return { selectedDocuments: newSelection };
    }),

  clearSelection: () => set({ selectedDocuments: new Set() }),

  selectAll: (documentIds) => set({ selectedDocuments: new Set(documentIds) }),
}));
