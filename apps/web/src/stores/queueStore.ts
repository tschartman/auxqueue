import { create } from 'zustand';
import type { QueueItem } from '@auxqueue/shared';

interface QueueStore {
  items: QueueItem[];
  nowPlaying: QueueItem | null;
  pendingApproval: QueueItem[];

  setQueue: (items: QueueItem[], nowPlaying: QueueItem | null) => void;
  addItem: (item: QueueItem) => void;
  reorderItems: (items: QueueItem[]) => void;
  removeItem: (itemId: string) => void;
  updateItemVote: (itemId: string, myVote: 1 | -1 | 0, netScore: number) => void;
  addPending: (item: QueueItem) => void;
  removePending: (itemId: string) => void;
  clear: () => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  items: [],
  nowPlaying: null,
  pendingApproval: [],

  setQueue: (items, nowPlaying) => set({ items, nowPlaying }),

  addItem: (item) => set((state) => ({ items: [...state.items, item] })),

  reorderItems: (incoming) =>
    set((state) => {
      const voteMap = new Map(state.items.map((i) => [i.id, i.myVote ?? 0]));
      return {
        items: incoming.map((i) => ({ ...i, myVote: (voteMap.get(i.id) ?? 0) as 0 | 1 | -1 })),
      };
    }),

  removeItem: (itemId) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),

  updateItemVote: (itemId, myVote, netScore) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === itemId ? { ...i, myVote, netScore } : i)),
    })),

  addPending: (item) => set((state) => ({ pendingApproval: [...state.pendingApproval, item] })),

  removePending: (itemId) =>
    set((state) => ({
      pendingApproval: state.pendingApproval.filter((i) => i.id !== itemId),
    })),

  clear: () => set({ items: [], nowPlaying: null, pendingApproval: [] }),
}));
