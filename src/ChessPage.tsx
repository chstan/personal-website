import React from "react";
import {Expandable, DynamicMarkdown, SimpleButton, SuperSecretCat} from "./common";
import {
  BISHOP, BLACK, KING, KNIGHT, Move, PAWN, Position, QUEEN, ROOK, START_FEN, Side, WHITE,
  fileOf, gameStatus, makeSquare, moveToUci, rankOf, squareName,
} from "./lib/chess/board";
import {EngineClient} from "./lib/chess/engine";
import {EngineRecord, formatRecord, loadRecord, saveRecord} from "./lib/chess/record";

// Search budget per engine move. Iterative deepening stops at whichever limit
// it reaches first, so the reply comes within about this long.
const ENGINE_OPTIONS = {maxDepth: 6, timeMs: 1500};

// Filled glyphs for both colours (styled via CSS); U+FE0E asks for the text
// rather than emoji presentation of the pawn.
const GLYPHS: Record<number, string> = {
  [PAWN]: '♟︎', [KNIGHT]: '♞', [BISHOP]: '♝',
  [ROOK]: '♜', [QUEEN]: '♛', [KING]: '♚',
};
const PIECE_NAMES: Record<number, string> = {
  [PAWN]: 'pawn', [KNIGHT]: 'knight', [BISHOP]: 'bishop', [ROOK]: 'rook', [QUEEN]: 'queen', [KING]: 'king',
};
const PROMOTION_CHOICES = [QUEEN, ROOK, BISHOP, KNIGHT];

const sideName = (side: Side) => side === WHITE ? 'white' : 'black';

interface PlayChessState {
  fen: string;
  /** Position keys since the start of the game, for repetition detection. */
  history: string[];
  sans: string[];
  playerSide: Side;
  selected: number | null;
  lastMove: {from: number, to: number} | null;
  promotion: {from: number, to: number} | null;
  thinking: boolean;
  error: string | null;
  record: EngineRecord;
}

function freshGame(playerSide: Side): Pick<PlayChessState,
  'fen' | 'history' | 'sans' | 'playerSide' | 'selected' | 'lastMove' | 'promotion' | 'thinking' | 'error'> {
  return {
    fen: START_FEN,
    history: [Position.fromFen(START_FEN).key()],
    sans: [],
    playerSide,
    selected: null,
    lastMove: null,
    promotion: null,
    thinking: playerSide === BLACK,
    error: null,
  };
}

export class PlayChess extends React.Component<object, PlayChessState> {
  readonly state: PlayChessState = {...freshGame(WHITE), record: loadRecord()};
  private engine: EngineClient | null = null;
  // Bumped on every new game so replies for an abandoned game are ignored.
  private gameId = 0;

  componentDidMount() {
    this.engine = new EngineClient();
    if (this.state.thinking) this.engineMove();
  }

  componentWillUnmount() {
    this.gameId++;
    this.engine?.dispose();
    this.engine = null;
  }

  newGame(playerSide: Side) {
    this.gameId++;
    this.setState(freshGame(playerSide), () => {
      if (this.state.thinking) this.engineMove();
    });
  }

  play(move: Move) {
    const {fen, history, sans, playerSide} = this.state;
    const pos = Position.fromFen(fen);
    const san = pos.toSan(move);
    pos.makeMove(move);
    const nextHistory = [...history, pos.key()];
    const status = gameStatus(pos, nextHistory);

    let record = this.state.record;
    if (status.over) {
      record = status.winner === null ? {...record, draws: record.draws + 1}
        : status.winner === playerSide ? {...record, losses: record.losses + 1}
          : {...record, wins: record.wins + 1};
      saveRecord(record);
    }

    const engineToMove = !status.over && pos.turn !== playerSide;
    this.setState({
      fen: pos.toFen(),
      history: nextHistory,
      sans: [...sans, san],
      selected: null,
      promotion: null,
      lastMove: {from: move.from, to: move.to},
      thinking: engineToMove,
      record,
    }, () => {
      if (engineToMove) this.engineMove();
    });
  }

  engineMove() {
    const engine = this.engine;
    if (!engine) return;
    const gameId = this.gameId;
    engine.bestMove(this.state.fen, ENGINE_OPTIONS).then((reply) => {
      if (gameId !== this.gameId) return;
      const move = Position.fromFen(this.state.fen).legalMoves().find((m) => moveToUci(m) === reply.move);
      if (!move) throw new Error(`Engine returned an illegal move: ${reply.move}`);
      this.play(move);
    }).catch((err: Error) => {
      if (gameId !== this.gameId) return;
      this.setState({thinking: false, error: `The engine crashed (${err.message}). Start a new game?`});
    });
  }

  onSquare(sq: number) {
    const {fen, selected, playerSide, thinking} = this.state;
    const pos = Position.fromFen(fen);
    if (thinking || pos.turn !== playerSide || gameStatus(pos, this.state.history).over) return;

    if (selected !== null) {
      const candidates = pos.legalMoves().filter((m) => m.from === selected && m.to === sq);
      if (candidates.some((m) => m.promotion)) {
        this.setState({promotion: {from: selected, to: sq}});
        return;
      }
      if (candidates.length) {
        this.play(candidates[0]);
        return;
      }
    }
    const piece = pos.board[sq];
    const own = piece !== 0 && Math.sign(piece) === playerSide && sq !== selected;
    this.setState({selected: own ? sq : null, promotion: null});
  }

  promote(type: number) {
    const {promotion, fen} = this.state;
    if (!promotion) return;
    const move = Position.fromFen(fen).legalMoves().find((m) =>
      m.from === promotion.from && m.to === promotion.to && m.promotion === type);
    if (move) this.play(move);
  }

  statusText(pos: Position): string {
    const {thinking, playerSide, history, error} = this.state;
    if (error) return error;
    const status = gameStatus(pos, history);
    if (status.over) {
      switch (status.reason) {
      case 'checkmate':
        return status.winner === playerSide ? 'Checkmate. You win!' : 'Checkmate. The engine wins.';
      case 'stalemate':
        return 'Stalemate. The game is drawn.';
      case 'fifty-move':
        return 'Draw by the fifty-move rule.';
      case 'repetition':
        return 'Draw by threefold repetition.';
      case 'insufficient':
        return 'Draw: neither side can checkmate.';
      }
    }
    if (thinking) return 'The engine is thinking…';
    return status.check ? 'Check! Your move.' : `Your move (${sideName(playerSide)}).`;
  }

  renderSquare(pos: Position, sq: number, legalTargets: Set<number>, checkedKing: number, index: number) {
    const {selected, lastMove} = this.state;
    const piece = pos.board[sq];
    const type = Math.abs(piece);
    const dark = (rankOf(sq) + fileOf(sq)) % 2 === 0;
    const classes = ['chess-square'];
    if (dark) classes.push('dark');
    if (sq === selected) classes.push('selected');
    if (lastMove && (sq === lastMove.from || sq === lastMove.to)) classes.push('last-move');
    if (legalTargets.has(sq)) classes.push('target');
    if (piece) classes.push('occupied');
    if (sq === checkedKing) classes.push('in-check');
    const label = squareName(sq) + (piece ? ` ${sideName(Math.sign(piece) as Side)} ${PIECE_NAMES[type]}` : '');
    const row = Math.floor(index / 8);
    const col = index % 8;
    return (
      <button key={sq} type="button" className={classes.join(' ')} aria-label={label}
        aria-pressed={sq === selected} onClick={() => this.onSquare(sq)}>
        {col === 0 && <span className="chess-coord rank">{rankOf(sq) + 1}</span>}
        {row === 7 && <span className="chess-coord file">{'abcdefgh'[fileOf(sq)]}</span>}
        {piece !== 0 &&
          <span className={`chess-piece ${sideName(Math.sign(piece) as Side)}`}>{GLYPHS[type]}</span>}
      </button>
    );
  }

  render() {
    const {fen, selected, playerSide, promotion, sans, record, thinking} = this.state;
    const pos = Position.fromFen(fen);
    const legalTargets = new Set(selected === null ? []
      : pos.legalMoves().filter((m) => m.from === selected).map((m) => m.to));
    const checkedKing = pos.inCheck() ? pos.kings[pos.turn === WHITE ? 0 : 1] : -1;

    // Draw from the player's side of the board.
    const squares: number[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        squares.push(playerSide === WHITE ? makeSquare(col, 7 - row) : makeSquare(7 - col, row));
      }
    }

    const moveRows: string[] = [];
    for (let i = 0; i < sans.length; i += 2) {
      moveRows.push(sans.slice(i, i + 2).join(' '));
    }

    return (
      <div className="chess-game">
        <p>
          Click a piece to see where it can move, then click a destination.
          Once you've played a move, please give a moment or two for the engine to reply.
        </p>
        <div className="chess-status" role="status">{this.statusText(pos)}</div>
        <div className="chess-board" aria-busy={thinking}>
          {squares.map((sq, i) => this.renderSquare(pos, sq, legalTargets, checkedKing, i))}
        </div>
        {promotion &&
          <div className="chess-promotion">
            Promote to:
            {PROMOTION_CHOICES.map((type) =>
              <button key={type} type="button" aria-label={PIECE_NAMES[type]} onClick={() => this.promote(type)}>
                <span className={`chess-piece ${sideName(playerSide)}`}>{GLYPHS[type]}</span>
              </button>)}
          </div>}
        <div className="chess-controls">
          <SimpleButton onClick={() => this.newGame(WHITE)}>New game as White</SimpleButton>
          <SimpleButton onClick={() => this.newGame(BLACK)}>New game as Black</SimpleButton>
        </div>
        {moveRows.length > 0 &&
          <ol className="chess-moves">
            {moveRows.map((row, i) => <li key={i}>{row}</li>)}
          </ol>}
        <p className="chess-record">
          The engine's record against visitors from this browser is {formatRecord(record)}.
        </p>
      </div>
    );
  }
}

class Opponent extends Expandable {
  render() {
    let kashi;
    if (this.state.expanded) {
      kashi = <SuperSecretCat />
    }
    return <div style={{marginTop: '2rem'}}>
      {kashi}
      <SimpleButton onClick={this.toggle}>{this.state.expanded ? 'Too Intimidating!': 'See your opponent?'}</SimpleButton>
    </div>;
  }
}

const ChessPage: React.FC = () => {
  return (
    <div id="chess">
      <section id="no-indent">
        <DynamicMarkdown articleId="chess" />
      </section>
      <PlayChess />
      <Opponent />
    </div>
  );
};

export default ChessPage;
