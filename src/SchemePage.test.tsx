import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SchemePage from './SchemePage';

const renderPage = () => render(<MemoryRouter><SchemePage /></MemoryRouter>);

const enter = (input: HTMLElement, text: string) => {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('SchemePage', () => {
  it('evaluates input on Enter and keeps state between entries', () => {
    renderPage();
    const input = screen.getByLabelText('Scheme input');
    enter(input, '(define (square x) (* x x))');
    enter(input, '(square 12)');
    expect(screen.getByText('144')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('shows errors in the history', () => {
    renderPage();
    enter(screen.getByLabelText('Scheme input'), 'nope');
    expect(screen.getByText('error: unbound variable: nope')).toBeInTheDocument();
  });

  it('does not submit incomplete expressions', () => {
    renderPage();
    const input = screen.getByLabelText('Scheme input');
    enter(input, '(+ 1');
    expect(input).toHaveValue('(+ 1');
  });

  it('credits the original C interpreter', () => {
    renderPage();
    expect(screen.getByText(/Scheme interpreter written in C/).closest('a'))
      .toHaveAttribute('href', 'https://github.com/chstan/SchemeREPL');
  });
});
