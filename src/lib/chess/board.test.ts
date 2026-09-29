import {describe, expect, it} from 'vitest';
import {
  BLACK, FLAG_CASTLE, FLAG_EN_PASSANT, KNIGHT, Position, QUEEN, START_FEN, WHITE,
  gameStatus, moveToUci, perft,
} from './board';

const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
const POSITION_3 = '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1';
const POSITION_4 = 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1';

const uciMoves = (fen: string) => Position.fromFen(fen).legalMoves().map(moveToUci);

describe('FEN round trip', () => {
  it.each([START_FEN, KIWIPETE, POSITION_3, POSITION_4])('%s', (fen) => {
    expect(Position.fromFen(fen).toFen()).toBe(fen);
  });
});

describe('perft', () => {
  it.each([[1, 20], [2, 400], [3, 8902]])('start position depth %i = %i', (depth, nodes) => {
    expect(perft(Position.fromFen(START_FEN), depth)).toBe(nodes);
  });

  it.each([[1, 48], [2, 2039], [3, 97862]])('kiwipete depth %i = %i', (depth, nodes) => {
    expect(perft(Position.fromFen(KIWIPETE), depth)).toBe(nodes);
  });

  it.each([[1, 14], [2, 191], [3, 2812], [4, 43238]])('position 3 depth %i = %i', (depth, nodes) => {
    expect(perft(Position.fromFen(POSITION_3), depth)).toBe(nodes);
  });

  it.each([[1, 6], [2, 264], [3, 9467]])('position 4 depth %i = %i', (depth, nodes) => {
    expect(perft(Position.fromFen(POSITION_4), depth)).toBe(nodes);
  });

  it('leaves the position unchanged', () => {
    const pos = Position.fromFen(KIWIPETE);
    perft(pos, 3);
    expect(pos.toFen()).toBe(KIWIPETE);
  });
});

describe('special moves', () => {
  it('castles both ways when the path is clear and safe', () => {
    const moves = uciMoves('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(moves).toContain('e1g1');
    expect(moves).toContain('e1c1');
  });

  it('forbids castling through or out of check', () => {
    // Black rook on f8 covers f1; kingside castling passes through it.
    const through = uciMoves('5r2/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(through).not.toContain('e1g1');
    expect(through).toContain('e1c1');
    // Black rook on e8 gives check: no castling at all.
    const inCheck = uciMoves('4r3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(inCheck).not.toContain('e1g1');
    expect(inCheck).not.toContain('e1c1');
  });

  it('moves the rook and drops rights when castling', () => {
    const pos = Position.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const castle = pos.legalMoves().find((m) => moveToUci(m) === 'e1c1');
    expect(castle?.flags).toBe(FLAG_CASTLE);
    pos.makeMove(castle!);
    expect(pos.toFen()).toBe('r3k2r/8/8/8/8/8/8/2KR3R b kq - 1 1');
    pos.unmakeMove();
    expect(pos.toFen()).toBe('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  });

  it('loses castling rights when a rook is captured', () => {
    const pos = Position.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    pos.makeMove(pos.legalMoves().find((m) => moveToUci(m) === 'a1a8')!);
    expect(pos.key()).toBe('R3k2r/8/8/8/8/8/8/4K2R b Kk -');
  });

  it('captures en passant, removing the passed pawn', () => {
    const pos = Position.fromFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2');
    const ep = pos.legalMoves().find((m) => moveToUci(m) === 'e5d6');
    expect(ep?.flags).toBe(FLAG_EN_PASSANT);
    expect(pos.toSan(ep!)).toBe('exd6');
    pos.makeMove(ep!);
    expect(pos.key()).toBe('4k3/8/3P4/8/8/8/8/4K3 b - -');
    pos.unmakeMove();
    expect(pos.key()).toBe('4k3/8/8/3pP3/8/8/8/4K3 w - d6');
  });

  it('sets the en passant square after a double push', () => {
    const pos = Position.fromFen(START_FEN);
    pos.makeMove(pos.legalMoves().find((m) => moveToUci(m) === 'e2e4')!);
    expect(pos.toFen()).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
  });

  it('rejects en passant that would expose the king', () => {
    // Capturing d5xe6 e.p. would open the fifth rank to the rook on h5.
    expect(uciMoves('8/8/8/K2pP2r/8/8/8/7k w - d6 0 1')).not.toContain('e5d6');
  });

  it('offers all four promotions, including by capture', () => {
    const pos = Position.fromFen('1n5k/P7/8/8/8/8/8/K7 w - - 0 1');
    const promos = pos.legalMoves().filter((m) => m.promotion).map(moveToUci).sort();
    expect(promos).toEqual(['a7a8b', 'a7a8n', 'a7a8q', 'a7a8r', 'a7b8b', 'a7b8n', 'a7b8q', 'a7b8r']);
    const queen = pos.legalMoves().find((m) => moveToUci(m) === 'a7a8q')!;
    expect(pos.toSan(queen)).toBe('a8=Q');
    pos.makeMove(queen);
    expect(pos.board[0x70]).toBe(QUEEN * WHITE);
    pos.unmakeMove();
    const knight = pos.legalMoves().find((m) => moveToUci(m) === 'a7b8n')!;
    pos.makeMove(knight);
    expect(pos.board[0x71]).toBe(KNIGHT * WHITE);
  });

  it('promotes black pawns on the first rank', () => {
    const moves = uciMoves('k7/8/8/8/8/8/p7/7K b - - 0 1');
    expect(moves).toContain('a2a1q');
  });
});

describe('game status', () => {
  it('detects checkmate (fool\'s mate)', () => {
    const pos = Position.fromFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    expect(gameStatus(pos)).toEqual({over: true, winner: BLACK, reason: 'checkmate'});
  });

  it('detects stalemate', () => {
    const pos = Position.fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(gameStatus(pos)).toEqual({over: true, winner: null, reason: 'stalemate'});
  });

  it('reports check without ending the game', () => {
    const pos = Position.fromFen('4k3/8/8/8/8/8/8/4K2R b K - 0 1');
    expect(gameStatus(pos)).toEqual({over: false, check: false});
    const checked = Position.fromFen('4k3/8/8/8/8/8/8/4R2K b - - 0 1');
    expect(gameStatus(checked)).toEqual({over: false, check: true});
  });

  it('detects insufficient material, fifty moves and repetition', () => {
    expect(gameStatus(Position.fromFen('8/8/4k3/8/8/2N5/8/4K3 w - - 0 1')))
      .toMatchObject({over: true, reason: 'insufficient'});
    expect(gameStatus(Position.fromFen('8/8/4k3/8/8/2R5/8/4K3 w - - 100 80')))
      .toMatchObject({over: true, reason: 'fifty-move'});
    const pos = Position.fromFen('8/8/4k3/8/8/2R5/8/4K3 w - - 0 1');
    const key = pos.key();
    expect(gameStatus(pos, [key, 'x', key])).toMatchObject({over: false});
    expect(gameStatus(pos, [key, 'x', key, 'y', key])).toMatchObject({over: true, reason: 'repetition'});
  });
});

describe('SAN', () => {
  it('disambiguates by file and marks captures', () => {
    const pos = Position.fromFen('4k3/8/8/8/8/8/4K3/R6R w - - 0 1');
    const move = pos.legalMoves().find((m) => moveToUci(m) === 'a1d1')!;
    expect(pos.toSan(move)).toBe('Rad1');
    const castle = Position.fromFen('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
    expect(castle.toSan(castle.legalMoves().find((m) => moveToUci(m) === 'e1g1')!)).toBe('O-O');
  });

  it('marks mate with #', () => {
    const pos = Position.fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    expect(pos.toSan(pos.legalMoves().find((m) => moveToUci(m) === 'a1a8')!)).toBe('Ra8#');
  });
});
