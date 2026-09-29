import {describe, expect, it} from 'vitest';
import {Position, START_FEN, moveToUci} from './board';
import {MATE, evaluate, search} from './search';

const quick = {maxDepth: 4, timeMs: 5000};

describe('evaluate', () => {
  it('is symmetric in the start position', () => {
    expect(evaluate(Position.fromFen(START_FEN))).toBe(0);
  });

  it('scores from the side to move', () => {
    const white = evaluate(Position.fromFen('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1'));
    const black = evaluate(Position.fromFen('4k3/8/8/8/8/8/8/Q3K3 b - - 0 1'));
    expect(white).toBeGreaterThan(800);
    expect(black).toBe(-white);
  });
});

describe('search', () => {
  it('finds mate in one', () => {
    const pos = Position.fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    const result = search(pos, quick);
    expect(moveToUci(result.move!)).toBe('a1a8');
    expect(result.score).toBeGreaterThan(MATE - 1000);
  });

  it('finds mate in two', () => {
    // 1. Kb6 Kb8 2. Rh8#
    const pos = Position.fromFen('k7/8/2K5/8/8/8/8/7R w - - 0 1');
    const result = search(pos, quick);
    expect(moveToUci(result.move!)).toBe('c6b6');
    expect(result.score).toBe(MATE - 3);
  });

  it('takes a hanging queen', () => {
    const pos = Position.fromFen('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1');
    expect(moveToUci(search(pos, quick).move!)).toBe('d1d5');
  });

  it('promotes to a queen when it wins', () => {
    const pos = Position.fromFen('7k/P7/8/8/8/8/8/K7 w - - 0 1');
    expect(moveToUci(search(pos, quick).move!)).toBe('a7a8q');
  });

  it('returns no move when the game is over', () => {
    const mated = Position.fromFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    expect(search(mated, quick).move).toBeNull();
  });

  it('respects the time budget and leaves the position intact', () => {
    const fen = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
    const pos = Position.fromFen(fen);
    let t = 0;
    // A fake clock that advances with every call guarantees a timeout.
    const result = search(pos, {maxDepth: 20, timeMs: 50, now: () => (t += 1)});
    expect(result.move).not.toBeNull();
    expect(result.depth).toBeGreaterThanOrEqual(1);
    expect(result.depth).toBeLessThan(20);
    expect(pos.toFen()).toBe(fen);
    expect(pos.ply).toBe(0);
  });
});
