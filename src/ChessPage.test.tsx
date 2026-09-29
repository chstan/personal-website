import {afterEach, describe, expect, it} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {PlayChess} from './ChessPage';
import {RECORD_KEY} from './lib/chess/record';

describe('PlayChess', () => {
  afterEach(() => window.localStorage.clear());

  it('highlights legal moves, plays them, and gets a reply from the engine', async () => {
    const {container} = render(<PlayChess />);
    expect(screen.getByRole('status')).toHaveTextContent('Your move (white).');

    fireEvent.click(screen.getByLabelText('e2 white pawn'));
    const targets = Array.from(container.querySelectorAll('.chess-square.target'))
      .map((el) => el.getAttribute('aria-label'));
    expect(targets.sort()).toEqual(['e3', 'e4']);

    fireEvent.click(screen.getByLabelText('e4'));
    expect(screen.getByLabelText('e4 white pawn')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('thinking');

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Your move'), {timeout: 10000});
    expect(container.querySelectorAll('.chess-moves li')).toHaveLength(1);
    expect(container.querySelectorAll('.chess-piece.black')).toHaveLength(16);
  }, 15000);

  it('flips the board and lets the engine open when playing black', async () => {
    const {container} = render(<PlayChess />);
    fireEvent.click(screen.getByText('New game as Black'));
    const first = container.querySelector('.chess-square');
    expect(first).toHaveAttribute('aria-label', 'h1 white rook');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Your move (black).'), {timeout: 10000});
  }, 15000);

  it('shows the stored record', () => {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify({wins: 30, losses: 9, draws: 5}));
    render(<PlayChess />);
    expect(screen.getByText(/record against visitors from this browser is 30-9-5/)).toBeInTheDocument();
  });
});
