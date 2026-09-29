// Evaluation and search, loosely following the structure of the original C
// engine (github.com/chstan/Chess-Engine): iterative deepening negamax with
// alpha-beta pruning, a capture-only quiescence search, and MVV-LVA ordering,
// all bounded by a wall-clock budget.

import {
  BISHOP, KING, KNIGHT, Move, PAWN, Position, QUEEN, ROOK, Side, WHITE, fileOf, onBoard, rankOf,
} from './board';

export const MATE = 100000;
const INFINITY = 1000000;

const PIECE_VALUES = [0, 100, 320, 330, 500, 900, 20000];

// Piece-square tables from White's point of view, rank 8 first, so that the
// table reads like a board diagram. (Values after Tomasz Michniewski's
// "Simplified Evaluation Function".)
const PST: Record<number, number[]> = {
  [PAWN]: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  [KNIGHT]: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  [BISHOP]: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  [ROOK]: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  [QUEEN]: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  [KING]: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

// Once the queens and most minor pieces are gone the king should walk to the
// centre rather than hide.
const KING_ENDGAME = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

/** Static evaluation in centipawns from the side to move's point of view. */
export function evaluate(pos: Position): number {
  let score = 0;
  let nonPawnMaterial = 0;
  const kings: number[] = [];
  for (let sq = 0; sq < 128; sq++) {
    if (!onBoard(sq)) {
      sq += 7;
      continue;
    }
    const p = pos.board[sq];
    if (p === 0) continue;
    const type = Math.abs(p);
    const side = Math.sign(p);
    if (type === KING) {
      kings.push(sq);
      continue;
    }
    if (type !== PAWN) nonPawnMaterial += PIECE_VALUES[type];
    score += side * (PIECE_VALUES[type] + PST[type][pstIndex(sq, side as Side)]);
  }
  const endgame = nonPawnMaterial <= 1300;
  for (const sq of kings) {
    const side = Math.sign(pos.board[sq]) as Side;
    score += side * (endgame ? KING_ENDGAME : PST[KING])[pstIndex(sq, side)];
  }
  return score * pos.turn;
}

function pstIndex(sq: number, side: Side): number {
  const rank = side === WHITE ? 7 - rankOf(sq) : rankOf(sq);
  return rank * 8 + fileOf(sq);
}

export interface SearchOptions {
  /** Deepest iteration to attempt. */
  maxDepth: number;
  /** Soft wall-clock budget; the last fully completed depth is used. */
  timeMs: number;
  now?: () => number;
}

export interface SearchResult {
  move: Move | null;
  /** Score in centipawns for the side to move; |score| > MATE - 1000 means mate. */
  score: number;
  depth: number;
  nodes: number;
}

class Timeout extends Error {}

const sameMove = (a: Move | null, b: Move): boolean =>
  a !== null && a.from === b.from && a.to === b.to && a.promotion === b.promotion;

export function search(pos: Position, options: SearchOptions): SearchResult {
  const now = options.now ?? (() => Date.now());
  const deadline = now() + options.timeMs;
  const maxPly = options.maxDepth + 32;
  const killers: (Move | null)[][] = Array.from({length: maxPly + 1}, () => [null, null]);
  let nodes = 0;
  let checkTime = false;

  const tick = () => {
    nodes++;
    if (checkTime && (nodes & 1023) === 0 && now() > deadline) throw new Timeout();
  };

  const orderScore = (m: Move, ply: number, best: Move | null): number => {
    if (sameMove(best, m)) return 1e7;
    let score = 0;
    if (m.captured) score += 1e6 + 10 * PIECE_VALUES[Math.abs(m.captured)] - PIECE_VALUES[Math.abs(m.piece)];
    if (m.promotion) score += 9e5 + PIECE_VALUES[m.promotion];
    if (!score) {
      if (sameMove(killers[ply][0], m)) score = 8e5;
      else if (sameMove(killers[ply][1], m)) score = 7e5;
    }
    return score;
  };

  const ordered = (moves: Move[], ply: number, best: Move | null): Move[] => {
    const scored = moves.map((m) => ({m, s: orderScore(m, ply, best)}));
    scored.sort((a, b) => b.s - a.s);
    return scored.map((x) => x.m);
  };

  const quiesce = (alpha: number, beta: number, ply: number): number => {
    tick();
    const standPat = evaluate(pos);
    if (standPat >= beta || ply >= maxPly) return standPat;
    if (standPat > alpha) alpha = standPat;
    for (const m of ordered(pos.pseudoMoves(true), ply, null)) {
      if (!pos.tryMove(m)) continue;
      const score = -quiesce(-beta, -alpha, ply + 1);
      pos.unmakeMove();
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  };

  const negamax = (depth: number, alpha: number, beta: number, ply: number): number => {
    tick();
    if (ply > 0 && pos.halfmove >= 100) return 0;
    if (ply >= maxPly) return evaluate(pos);
    const inCheck = pos.inCheck();
    if (inCheck) depth++;
    if (depth <= 0) return quiesce(alpha, beta, ply);

    let legal = 0;
    let best = -INFINITY;
    for (const m of ordered(pos.pseudoMoves(), ply, null)) {
      if (!pos.tryMove(m)) continue;
      legal++;
      const score = -negamax(depth - 1, -beta, -alpha, ply + 1);
      pos.unmakeMove();
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (!m.captured && !sameMove(killers[ply][0], m)) {
          killers[ply][1] = killers[ply][0];
          killers[ply][0] = m;
        }
        break;
      }
    }
    if (legal === 0) return inCheck ? -MATE + ply : 0;
    return best;
  };

  const rootPly = pos.ply;
  const rootMoves = pos.legalMoves();
  let result: SearchResult = {move: rootMoves[0] ?? null, score: 0, depth: 0, nodes: 0};
  if (rootMoves.length <= 1) return {...result, nodes};

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    checkTime = depth > 1;
    try {
      let alpha = -INFINITY;
      let bestMove: Move | null = null;
      for (const m of ordered(rootMoves, 0, result.move)) {
        pos.makeMove(m);
        const score = -negamax(depth - 1, -INFINITY, -alpha, 1);
        pos.unmakeMove();
        if (score > alpha) {
          alpha = score;
          bestMove = m;
        }
      }
      result = {move: bestMove, score: alpha, depth, nodes};
      if (Math.abs(alpha) > MATE - 1000) break;
      if (now() > deadline) break;
    } catch (e) {
      if (!(e instanceof Timeout)) throw e;
      // Restore the position: unwind any moves made below the root.
      while (pos.ply > rootPly) pos.unmakeMove();
      break;
    }
  }
  return {...result, nodes};
}
