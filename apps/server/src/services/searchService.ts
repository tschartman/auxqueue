import type { StreamingAdapter } from '../streaming/adapter';

const adapters = new Map<string, StreamingAdapter>();

export function registerAdapter(partyId: string, adapter: StreamingAdapter) {
  adapters.set(partyId, adapter);
}

export function removeAdapter(partyId: string) {
  adapters.delete(partyId);
}

export async function search(partyId: string, query: string) {
  const adapter = adapters.get(partyId);
  if (!adapter) throw new Error('No streaming adapter registered for party');
  return adapter.search(query);
}
