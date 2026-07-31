import { create } from "zustand";
import { fetchFriendsList, type Friend } from "@/src/lib/api/friends";

type FriendsState = {
  friends: Friend[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  mutationRevision: number;
  refreshQueued: boolean;

  loadFriends: (opts?: { force?: boolean }) => Promise<void>;
  upsertFriend: (friend: Friend) => void;
  removeFriend: (friendId: number) => void;
  clearFriends: () => void;
};

const TTL_MS = 5 * 60 * 1000;

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  mutationRevision: 0,
  refreshQueued: false,

  loadFriends: async (opts) => {
    const force = opts?.force ?? false;
    const { loading, lastFetchedAt } = get();
    if (loading) {
      if (force) set({ refreshQueued: true });
      return;
    }

    if (!force && lastFetchedAt && Date.now() - lastFetchedAt < TTL_MS) return;

    const requestRevision = get().mutationRevision;
    set({ loading: true, error: null, refreshQueued: false });

    try {
      const list = await fetchFriendsList();
      if (get().mutationRevision === requestRevision) {
        set({ friends: list, lastFetchedAt: Date.now() });
      }
    } catch (e: any) {
      set({ error: e?.message ?? "failed to load friends" });
    } finally {
      const shouldRefreshAgain = get().refreshQueued;
      set({ loading: false, refreshQueued: false });

      if (shouldRefreshAgain) {
        await get().loadFriends({ force: true });
      }
    }
  },

  upsertFriend: (friend) =>
    set((state) => {
      const exists = state.friends.some((item) => item.id === friend.id);

      return {
        friends: exists
          ? state.friends.map((item) =>
              item.id === friend.id ? { ...item, ...friend } : item,
            )
          : [friend, ...state.friends],
        lastFetchedAt: Date.now(),
        mutationRevision: state.mutationRevision + 1,
      };
    }),

  removeFriend: (friendId) =>
    set((state) => ({
      friends: state.friends.filter((friend) => friend.id !== friendId),
      lastFetchedAt: Date.now(),
      mutationRevision: state.mutationRevision + 1,
    })),

  clearFriends: () =>
    set((state) => ({
      friends: [],
      loading: false,
      error: null,
      lastFetchedAt: null,
      mutationRevision: state.mutationRevision + 1,
      refreshQueued: false,
    })),
}));
