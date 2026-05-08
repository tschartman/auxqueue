import { create } from 'zustand';
import type { PartySettings, GuestSession } from '@auxqueue/shared';

interface PartyStore {
  partyId: string | null;
  roomCode: string | null;
  partyName: string;
  settings: PartySettings;
  connectedService: string | null;
  guests: GuestSession[];
  guestCount: number;

  setParty: (data: {
    partyId: string;
    roomCode: string;
    partyName?: string;
    settings: PartySettings;
    connectedService: string;
  }) => void;
  updateSettings: (settings: Partial<PartySettings>) => void;
  setGuests: (guests: GuestSession[]) => void;
  addGuest: (guest: GuestSession) => void;
  removeGuest: (guestId: string) => void;
  updateGuestStatus: (guestId: string, status: GuestSession['status']) => void;
  clear: () => void;
}

const defaultSettings: PartySettings = {
  queueMode: 'vote',
  approvalRequired: false,
  explicitFilter: false,
  maxPerGuest: 5,
  voteOutThreshold: -3,
  lockOnDeck: true,
};

export const usePartyStore = create<PartyStore>((set) => ({
  partyId: null,
  roomCode: null,
  partyName: '',
  settings: defaultSettings,
  connectedService: null,
  guests: [],
  guestCount: 0,

  setParty: (data) =>
    set({
      partyId: data.partyId,
      roomCode: data.roomCode,
      partyName: data.partyName ?? '',
      settings: data.settings,
      connectedService: data.connectedService,
    }),

  updateSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),

  setGuests: (guests) => set({ guests, guestCount: guests.length }),

  addGuest: (guest) =>
    set((state) => ({
      guests: [...state.guests, guest],
      guestCount: state.guestCount + 1,
    })),

  removeGuest: (guestId) =>
    set((state) => ({
      guests: state.guests.filter((g) => g.id !== guestId),
      guestCount: Math.max(0, state.guestCount - 1),
    })),

  updateGuestStatus: (guestId, status) =>
    set((state) => ({
      guests: state.guests.map((g) => (g.id === guestId ? { ...g, status } : g)),
    })),

  clear: () =>
    set({
      partyId: null,
      roomCode: null,
      partyName: '',
      settings: defaultSettings,
      connectedService: null,
      guests: [],
      guestCount: 0,
    }),
}));
