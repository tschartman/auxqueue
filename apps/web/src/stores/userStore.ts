import { create } from 'zustand';

type Role = 'host' | 'guest';

interface UserStore {
  userId: string | null;
  displayName: string;
  avatar: string;
  role: Role | null;
  sessionToken: string | null;
  accessToken: string | null;
  setUser: (data: {
    userId?: string;
    displayName: string;
    avatar: string;
    role: Role;
    sessionToken?: string;
    accessToken?: string;
  }) => void;
  setAvatar: (avatar: string) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  userId: null,
  displayName: '',
  avatar: '🎧',
  role: null,
  sessionToken: null,
  accessToken: null,

  setUser: (data) =>
    set({
      userId: data.userId ?? null,
      displayName: data.displayName,
      avatar: data.avatar,
      role: data.role,
      sessionToken: data.sessionToken ?? null,
      accessToken: data.accessToken ?? null,
    }),

  setAvatar: (avatar) => set({ avatar }),

  setAccessToken: (token) => set({ accessToken: token }),

  clear: () =>
    set({
      userId: null,
      displayName: '',
      avatar: '🎧',
      role: null,
      sessionToken: null,
      accessToken: null,
    }),
}));
