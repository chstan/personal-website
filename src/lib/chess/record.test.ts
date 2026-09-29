import {afterEach, describe, expect, it, vi} from 'vitest';
import {EMPTY_RECORD, RECORD_KEY, formatRecord, loadRecord, saveRecord} from './record';

describe('engine record', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('round-trips through localStorage', () => {
    expect(loadRecord()).toEqual(EMPTY_RECORD);
    saveRecord({wins: 30, losses: 9, draws: 5});
    expect(loadRecord()).toEqual({wins: 30, losses: 9, draws: 5});
    expect(formatRecord(loadRecord())).toBe('30-9-5');
  });

  it('ignores corrupt data', () => {
    window.localStorage.setItem(RECORD_KEY, '{nope');
    expect(loadRecord()).toEqual(EMPTY_RECORD);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify({wins: -1, losses: 'x', draws: 2}));
    expect(loadRecord()).toEqual({wins: 0, losses: 0, draws: 2});
  });

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(loadRecord()).toEqual(EMPTY_RECORD);
    expect(() => saveRecord({wins: 1, losses: 0, draws: 0})).not.toThrow();
  });
});
