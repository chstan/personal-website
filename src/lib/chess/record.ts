// The engine's win/loss/draw record against this browser's visitor. The 2015
// site kept a global record on the server; with no backend it now lives in
// localStorage, and every access is guarded because storage can be missing
// or throw (private windows, blocked site data).

export interface EngineRecord {
  wins: number;
  losses: number;
  draws: number;
}

export const RECORD_KEY = 'chess:engine-record';

export const EMPTY_RECORD: EngineRecord = {wins: 0, losses: 0, draws: 0};

const count = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

export function loadRecord(): EngineRecord {
  try {
    const raw = window.localStorage.getItem(RECORD_KEY);
    if (!raw) return EMPTY_RECORD;
    const parsed = JSON.parse(raw) as Partial<Record<keyof EngineRecord, unknown>>;
    return {wins: count(parsed.wins), losses: count(parsed.losses), draws: count(parsed.draws)};
  } catch {
    return EMPTY_RECORD;
  }
}

export function saveRecord(record: EngineRecord): void {
  try {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable: the record just won't persist.
  }
}

export const formatRecord = ({wins, losses, draws}: EngineRecord): string => `${wins}-${losses}-${draws}`;
