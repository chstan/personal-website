import {describe, expect, it} from 'vitest';
import {BIG_MONEY, BUILT_IN_BOTS, DEFAULT_POLICY, SMITHY_BIG_MONEY, WITCH_BOT, runMatch} from './bots';
import {MAX_TURNS, initialSupply, isGameOver, playGame} from './engine';
import {Policy, parsePolicy, validatePolicy} from './policy';
import {makeRng} from './rng';

const IDLE: Policy = {name: 'Idle', play: [], buy: []};

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const xs = Array.from({length: 5}, a);
    expect(Array.from({length: 5}, b)).toEqual(xs);
    expect(xs.every(x => x >= 0 && x < 1)).toBe(true);
    expect(Array.from({length: 5}, makeRng(43))).not.toEqual(xs);
  });
});

describe('engine', () => {
  it('replays identically for the same seed', () => {
    const a = playGame([BIG_MONEY, WITCH_BOT], {seed: 7, log: true});
    const b = playGame([BIG_MONEY, WITCH_BOT], {seed: 7, log: true});
    expect(b).toEqual(a);
    expect(a.log.length).toBeGreaterThan(10);
  });

  it('ends when the Provinces run out', () => {
    const r = playGame([BIG_MONEY, BIG_MONEY], {seed: 1, log: true});
    expect(r.log.some(l => l.includes('Provinces are gone'))).toBe(true);
    expect(Math.max(...r.turns)).toBeLessThan(MAX_TURNS);
    expect(r.scores.reduce((a, b) => a + b)).toBeGreaterThanOrEqual(48);
  });

  it('detects the three-pile ending', () => {
    const supply = initialSupply();
    expect(isGameOver(supply)).toBe(false);
    supply.Village = 0;
    supply.Smithy = 0;
    expect(isGameOver(supply)).toBe(false);
    supply.Curse = 0;
    expect(isGameOver(supply)).toBe(true);
  });

  it('stops passive games at the turn limit', () => {
    const r = playGame([IDLE, IDLE], {seed: 3});
    expect(r.turns).toEqual([MAX_TURNS, MAX_TURNS]);
    expect(r.scores).toEqual([3, 3]);
    expect(r.winner).toBeNull();
  });

  it('lets Witch hand out curses', () => {
    const r = playGame([WITCH_BOT, IDLE], {seed: 5, log: true});
    expect(r.log.some(l => l.includes('gains a Curse'))).toBe(true);
    expect(r.scores[1]).toBeLessThan(3);
  });
});

describe('bots', () => {
  it('Big Money beats a do-nothing bot', () => {
    const m = runMatch(BIG_MONEY, IDLE, 100, 11);
    expect(m.wins).toBe(100);
  });

  it('Smithy Big Money beats plain Big Money over many games', () => {
    const m = runMatch(SMITHY_BIG_MONEY, BIG_MONEY, 400, 99);
    expect(m.wins).toBeGreaterThan(m.losses);
  });

  it('built-in bots and the default policy are valid', () => {
    for (const b of BUILT_IN_BOTS) expect(validatePolicy(b).ok).toBe(true);
    expect(parsePolicy(DEFAULT_POLICY).ok).toBe(true);
  });
});

describe('policy validation', () => {
  const errorsOf = (src: string) => {
    const r = parsePolicy(src);
    return r.ok ? [] : r.errors;
  };

  it('reports bad JSON', () => {
    expect(errorsOf('{play: []}')[0]).toMatch(/Invalid JSON/);
  });

  it('requires a buy list', () => {
    expect(errorsOf('{"play": []}')).toContain('"buy" must be a list of buy rules.');
  });

  it('rejects unknown cards, non-actions, and bad keys', () => {
    const errs = errorsOf(JSON.stringify({
      play: ['Gold', 'Chapel'],
      buy: ['Platinum', {card: 'Gold', minCoins: -1, when: 'always'}],
      extra: 1,
    }));
    expect(errs).toEqual(expect.arrayContaining([
      'Unknown top-level key "extra".',
      'play[0]: Gold is not an action card.',
      'buy[1]: unknown key "when".',
      'buy[1].minCoins must be a non-negative integer.',
    ]));
    expect(errs.some(e => e.startsWith('play[1]: unknown card "Chapel"'))).toBe(true);
    expect(errs.some(e => e.startsWith('buy[0].card: unknown card "Platinum"'))).toBe(true);
  });

  it('expands string shorthand in buy rules', () => {
    const r = parsePolicy('{"buy": ["Gold", {"card": "Silver", "maxOwned": 3}]}');
    expect(r).toEqual({
      ok: true,
      policy: {name: 'Unnamed policy', play: [], buy: [{card: 'Gold'}, {card: 'Silver', maxOwned: 3}]},
    });
  });
});
