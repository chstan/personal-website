// Board representation and legal move generation.
//
// Squares use the 0x88 layout: sq = rank * 16 + file, with rank 0 being
// White's back rank. Any square with (sq & 0x88) !== 0 is off the board,
// which makes edge detection for sliding pieces a single bit test.
//
// Pieces are signed integers: positive for White, negative for Black, and
// the magnitude selects the piece type.

export type Side = 1 | -1;
export const WHITE: Side = 1;
export const BLACK: Side = -1;

export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

export const FLAG_EN_PASSANT = 1;
export const FLAG_CASTLE = 2;
export const FLAG_DOUBLE_PUSH = 4;

const CASTLE_WK = 1;
const CASTLE_WQ = 2;
const CASTLE_BK = 4;
const CASTLE_BQ = 8;

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface Move {
  from: number;
  to: number;
  /** Signed piece being moved. */
  piece: number;
  /** Signed piece captured (0 if none). For en passant this is the enemy pawn. */
  captured: number;
  /** Unsigned piece type promoted to (0 if none). */
  promotion: number;
  flags: number;
}

interface Undo {
  move: Move;
  castling: number;
  ep: number;
  halfmove: number;
}

const KNIGHT_OFFSETS = [33, 31, 18, 14, -33, -31, -18, -14];
const BISHOP_OFFSETS = [15, 17, -15, -17];
const ROOK_OFFSETS = [1, -1, 16, -16];
const KING_OFFSETS = [1, -1, 16, -16, 15, 17, -15, -17];
const PROMOTION_PIECES = [QUEEN, ROOK, BISHOP, KNIGHT];

// Castling rights that survive a move touching each square.
const CASTLE_MASK = new Uint8Array(128).fill(15);
CASTLE_MASK[0] = 15 & ~CASTLE_WQ;
CASTLE_MASK[7] = 15 & ~CASTLE_WK;
CASTLE_MASK[4] = 15 & ~(CASTLE_WK | CASTLE_WQ);
CASTLE_MASK[112] = 15 & ~CASTLE_BQ;
CASTLE_MASK[119] = 15 & ~CASTLE_BK;
CASTLE_MASK[116] = 15 & ~(CASTLE_BK | CASTLE_BQ);

const FEN_PIECES: Record<string, number> = {
  p: PAWN, n: KNIGHT, b: BISHOP, r: ROOK, q: QUEEN, k: KING,
};
const PIECE_LETTERS = ['', 'p', 'n', 'b', 'r', 'q', 'k'];

export const onBoard = (sq: number): boolean => (sq & 0x88) === 0;
export const rankOf = (sq: number): number => sq >> 4;
export const fileOf = (sq: number): number => sq & 7;
export const makeSquare = (file: number, rank: number): number => rank * 16 + file;

export function squareName(sq: number): string {
  return 'abcdefgh'[fileOf(sq)] + (rankOf(sq) + 1);
}

export function parseSquare(name: string): number {
  const file = name.charCodeAt(0) - 97;
  const rank = name.charCodeAt(1) - 49;
  if (file < 0 || file > 7 || rank < 0 || rank > 7 || name.length !== 2) {
    throw new Error(`Bad square: ${name}`);
  }
  return makeSquare(file, rank);
}

export function moveToUci(m: Move): string {
  return squareName(m.from) + squareName(m.to) + (m.promotion ? PIECE_LETTERS[m.promotion] : '');
}

export class Position {
  board = new Int8Array(128);
  turn: Side = WHITE;
  castling = 0;
  ep = -1;
  halfmove = 0;
  fullmove = 1;
  /** King squares indexed by sideIndex(side). */
  kings = [-1, -1];
  private undos: Undo[] = [];

  /** Number of moves made on this object that can still be unmade. */
  get ply(): number {
    return this.undos.length;
  }

  static fromFen(fen: string): Position {
    const pos = new Position();
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) throw new Error(`Bad FEN: ${fen}`);
    const rows = parts[0].split('/');
    if (rows.length !== 8) throw new Error(`Bad FEN: ${fen}`);
    rows.forEach((row, i) => {
      const rank = 7 - i;
      let file = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) {
          file += Number(ch);
        } else {
          const type = FEN_PIECES[ch.toLowerCase()];
          if (!type || file > 7) throw new Error(`Bad FEN: ${fen}`);
          const side: Side = ch === ch.toUpperCase() ? WHITE : BLACK;
          const sq = makeSquare(file, rank);
          pos.board[sq] = type * side;
          if (type === KING) pos.kings[sideIndex(side)] = sq;
          file++;
        }
      }
    });
    pos.turn = parts[1] === 'b' ? BLACK : WHITE;
    for (const ch of parts[2]) {
      if (ch === 'K') pos.castling |= CASTLE_WK;
      if (ch === 'Q') pos.castling |= CASTLE_WQ;
      if (ch === 'k') pos.castling |= CASTLE_BK;
      if (ch === 'q') pos.castling |= CASTLE_BQ;
    }
    pos.ep = parts[3] === '-' ? -1 : parseSquare(parts[3]);
    pos.halfmove = parts[4] ? Number(parts[4]) : 0;
    pos.fullmove = parts[5] ? Number(parts[5]) : 1;
    return pos;
  }

  toFen(): string {
    return `${this.key()} ${this.halfmove} ${this.fullmove}`;
  }

  /** The first four FEN fields: enough to identify repeated positions. */
  key(): string {
    const rows: string[] = [];
    for (let rank = 7; rank >= 0; rank--) {
      let row = '';
      let empty = 0;
      for (let file = 0; file < 8; file++) {
        const p = this.board[makeSquare(file, rank)];
        if (p === 0) {
          empty++;
        } else {
          if (empty) row += empty;
          empty = 0;
          const letter = PIECE_LETTERS[Math.abs(p)];
          row += p > 0 ? letter.toUpperCase() : letter;
        }
      }
      if (empty) row += empty;
      rows.push(row);
    }
    let castling = '';
    if (this.castling & CASTLE_WK) castling += 'K';
    if (this.castling & CASTLE_WQ) castling += 'Q';
    if (this.castling & CASTLE_BK) castling += 'k';
    if (this.castling & CASTLE_BQ) castling += 'q';
    return [
      rows.join('/'),
      this.turn === WHITE ? 'w' : 'b',
      castling || '-',
      this.ep === -1 ? '-' : squareName(this.ep),
    ].join(' ');
  }

  /** Is `sq` attacked by any piece belonging to `by`? */
  isAttacked(sq: number, by: Side): boolean {
    const b = this.board;
    // Pawns: a pawn of `by` attacks diagonally forward, so look backwards.
    const pawnFrom = sq - 16 * by;
    if (onBoard(pawnFrom - 1) && b[pawnFrom - 1] === PAWN * by) return true;
    if (onBoard(pawnFrom + 1) && b[pawnFrom + 1] === PAWN * by) return true;
    for (const o of KNIGHT_OFFSETS) {
      const s = sq + o;
      if (onBoard(s) && b[s] === KNIGHT * by) return true;
    }
    for (const o of KING_OFFSETS) {
      const s = sq + o;
      if (onBoard(s) && b[s] === KING * by) return true;
    }
    for (const o of BISHOP_OFFSETS) {
      for (let s = sq + o; onBoard(s); s += o) {
        const p = b[s];
        if (p === 0) continue;
        if (p === BISHOP * by || p === QUEEN * by) return true;
        break;
      }
    }
    for (const o of ROOK_OFFSETS) {
      for (let s = sq + o; onBoard(s); s += o) {
        const p = b[s];
        if (p === 0) continue;
        if (p === ROOK * by || p === QUEEN * by) return true;
        break;
      }
    }
    return false;
  }

  inCheck(side: Side = this.turn): boolean {
    return this.isAttacked(this.kings[sideIndex(side)], (-side) as Side);
  }

  /**
   * Pseudo-legal moves for the side to move (may leave the king in check).
   * With `capturesOnly`, quiet moves are skipped but promotions are kept.
   */
  pseudoMoves(capturesOnly = false): Move[] {
    const moves: Move[] = [];
    const b = this.board;
    const us = this.turn;
    const push = (from: number, to: number, piece: number, captured: number, flags = 0, promotion = 0) =>
      moves.push({from, to, piece, captured, promotion, flags});
    const pushPawn = (from: number, to: number, piece: number, captured: number) => {
      const lastRank = us === WHITE ? 7 : 0;
      if (rankOf(to) === lastRank) {
        for (const promo of PROMOTION_PIECES) push(from, to, piece, captured, 0, promo);
      } else {
        push(from, to, piece, captured);
      }
    };

    for (let from = 0; from < 128; from++) {
      if (!onBoard(from)) {
        from += 7;
        continue;
      }
      const piece = b[from];
      if (piece === 0 || Math.sign(piece) !== us) continue;
      const type = Math.abs(piece);

      if (type === PAWN) {
        const fwd = from + 16 * us;
        const startRank = us === WHITE ? 1 : 6;
        const promoting = rankOf(fwd) === (us === WHITE ? 7 : 0);
        if (onBoard(fwd) && b[fwd] === 0 && (!capturesOnly || promoting)) {
          pushPawn(from, fwd, piece, 0);
          const two = fwd + 16 * us;
          if (!capturesOnly && rankOf(from) === startRank && b[two] === 0) {
            push(from, two, piece, 0, FLAG_DOUBLE_PUSH);
          }
        }
        for (const side of [-1, 1]) {
          const to = fwd + side;
          if (!onBoard(to)) continue;
          const target = b[to];
          if (target !== 0 && Math.sign(target) === -us) {
            pushPawn(from, to, piece, target);
          } else if (to === this.ep) {
            push(from, to, piece, -PAWN * us, FLAG_EN_PASSANT);
          }
        }
        continue;
      }

      const offsets = type === KNIGHT ? KNIGHT_OFFSETS
        : type === BISHOP ? BISHOP_OFFSETS
          : type === ROOK ? ROOK_OFFSETS
            : KING_OFFSETS;
      const slides = type === BISHOP || type === ROOK || type === QUEEN;
      for (const o of offsets) {
        for (let to = from + o; onBoard(to); to += o) {
          const target = b[to];
          if (target === 0) {
            if (!capturesOnly) push(from, to, piece, 0);
          } else {
            if (Math.sign(target) === -us) push(from, to, piece, target);
            break;
          }
          if (!slides) break;
        }
      }

      if (type === KING && !capturesOnly) this.castlingMoves(from, piece, push);
    }
    return moves;
  }

  private castlingMoves(
    from: number,
    piece: number,
    push: (from: number, to: number, piece: number, captured: number, flags?: number) => void,
  ) {
    const us = this.turn;
    const them = (-us) as Side;
    const home = us === WHITE ? 4 : 116;
    if (from !== home) return;
    const kingSide = us === WHITE ? CASTLE_WK : CASTLE_BK;
    const queenSide = us === WHITE ? CASTLE_WQ : CASTLE_BQ;
    const b = this.board;
    if ((this.castling & kingSide) && b[home + 1] === 0 && b[home + 2] === 0 && b[home + 3] === ROOK * us
      && !this.isAttacked(home, them) && !this.isAttacked(home + 1, them) && !this.isAttacked(home + 2, them)) {
      push(home, home + 2, piece, 0, FLAG_CASTLE);
    }
    if ((this.castling & queenSide) && b[home - 1] === 0 && b[home - 2] === 0 && b[home - 3] === 0
      && b[home - 4] === ROOK * us
      && !this.isAttacked(home, them) && !this.isAttacked(home - 1, them) && !this.isAttacked(home - 2, them)) {
      push(home, home - 2, piece, 0, FLAG_CASTLE);
    }
  }

  makeMove(m: Move): void {
    const b = this.board;
    const us = this.turn;
    this.undos.push({move: m, castling: this.castling, ep: this.ep, halfmove: this.halfmove});

    b[m.to] = m.promotion ? m.promotion * us : m.piece;
    b[m.from] = 0;
    if (m.flags & FLAG_EN_PASSANT) b[m.to - 16 * us] = 0;
    if (m.flags & FLAG_CASTLE) {
      if (m.to > m.from) {
        b[m.from + 1] = b[m.from + 3];
        b[m.from + 3] = 0;
      } else {
        b[m.from - 1] = b[m.from - 4];
        b[m.from - 4] = 0;
      }
    }
    if (Math.abs(m.piece) === KING) this.kings[sideIndex(us)] = m.to;

    this.castling &= CASTLE_MASK[m.from] & CASTLE_MASK[m.to];
    this.ep = m.flags & FLAG_DOUBLE_PUSH ? m.from + 16 * us : -1;
    this.halfmove = Math.abs(m.piece) === PAWN || m.captured ? 0 : this.halfmove + 1;
    if (us === BLACK) this.fullmove++;
    this.turn = (-us) as Side;
  }

  unmakeMove(): void {
    const undo = this.undos.pop();
    if (!undo) throw new Error('Nothing to unmake');
    const m = undo.move;
    const b = this.board;
    const us = (-this.turn) as Side;
    this.turn = us;
    if (us === BLACK) this.fullmove--;
    this.castling = undo.castling;
    this.ep = undo.ep;
    this.halfmove = undo.halfmove;

    b[m.from] = m.piece;
    if (m.flags & FLAG_EN_PASSANT) {
      b[m.to] = 0;
      b[m.to - 16 * us] = m.captured;
    } else {
      b[m.to] = m.captured;
    }
    if (m.flags & FLAG_CASTLE) {
      if (m.to > m.from) {
        b[m.from + 3] = b[m.from + 1];
        b[m.from + 1] = 0;
      } else {
        b[m.from - 4] = b[m.from - 1];
        b[m.from - 1] = 0;
      }
    }
    if (Math.abs(m.piece) === KING) this.kings[sideIndex(us)] = m.from;
  }

  /** Make `m` if it does not leave the mover in check; returns whether it was made. */
  tryMove(m: Move): boolean {
    const us = this.turn;
    this.makeMove(m);
    if (this.inCheck(us)) {
      this.unmakeMove();
      return false;
    }
    return true;
  }

  legalMoves(): Move[] {
    return this.pseudoMoves().filter((m) => {
      if (!this.tryMove(m)) return false;
      this.unmakeMove();
      return true;
    });
  }

  hasLegalMove(): boolean {
    for (const m of this.pseudoMoves()) {
      if (this.tryMove(m)) {
        this.unmakeMove();
        return true;
      }
    }
    return false;
  }

  /** Neither side can possibly deliver mate: bare kings, or one minor piece. */
  insufficientMaterial(): boolean {
    let minors = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (!onBoard(sq)) continue;
      const type = Math.abs(this.board[sq]);
      if (type === PAWN || type === ROOK || type === QUEEN) return false;
      if (type === KNIGHT || type === BISHOP) minors++;
    }
    return minors <= 1;
  }

  /** Standard Algebraic Notation for a legal move `m` in this position. */
  toSan(m: Move): string {
    let san: string;
    const type = Math.abs(m.piece);
    if (m.flags & FLAG_CASTLE) {
      san = m.to > m.from ? 'O-O' : 'O-O-O';
    } else if (type === PAWN) {
      san = m.captured ? 'abcdefgh'[fileOf(m.from)] + 'x' : '';
      san += squareName(m.to);
      if (m.promotion) san += '=' + PIECE_LETTERS[m.promotion].toUpperCase();
    } else {
      const rivals = this.legalMoves().filter((o) =>
        o.piece === m.piece && o.to === m.to && o.from !== m.from);
      let disambiguation = '';
      if (rivals.length) {
        if (rivals.every((o) => fileOf(o.from) !== fileOf(m.from))) {
          disambiguation = 'abcdefgh'[fileOf(m.from)];
        } else if (rivals.every((o) => rankOf(o.from) !== rankOf(m.from))) {
          disambiguation = String(rankOf(m.from) + 1);
        } else {
          disambiguation = squareName(m.from);
        }
      }
      san = PIECE_LETTERS[type].toUpperCase() + disambiguation + (m.captured ? 'x' : '') + squareName(m.to);
    }
    this.makeMove(m);
    if (this.inCheck()) san += this.hasLegalMove() ? '+' : '#';
    this.unmakeMove();
    return san;
  }
}

export const sideIndex = (side: Side): number => (side === WHITE ? 0 : 1);

export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  let nodes = 0;
  for (const m of pos.pseudoMoves()) {
    if (!pos.tryMove(m)) continue;
    nodes += depth === 1 ? 1 : perft(pos, depth - 1);
    pos.unmakeMove();
  }
  return nodes;
}

export type GameStatus =
  | {over: false; check: boolean}
  | {over: true; winner: Side | null; reason: 'checkmate' | 'stalemate' | 'fifty-move' | 'repetition' | 'insufficient'};

/**
 * Game-level outcome. `history` holds `key()`s of earlier positions (including
 * the current one) so threefold repetition can be detected.
 */
export function gameStatus(pos: Position, history: string[] = []): GameStatus {
  const check = pos.inCheck();
  if (!pos.hasLegalMove()) {
    return check
      ? {over: true, winner: (-pos.turn) as Side, reason: 'checkmate'}
      : {over: true, winner: null, reason: 'stalemate'};
  }
  if (pos.halfmove >= 100) return {over: true, winner: null, reason: 'fifty-move'};
  if (pos.insufficientMaterial()) return {over: true, winner: null, reason: 'insufficient'};
  const key = pos.key();
  if (history.filter((k) => k === key).length >= 3) return {over: true, winner: null, reason: 'repetition'};
  return {over: false, check};
}
