import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// See Blog.test.tsx: DynamicMarkdown can't fetch .md assets under jsdom.
vi.mock('./common', async () => {
  const actual = await vi.importActual<typeof import('./common')>('./common');
  return {
    ...actual,
    DynamicMarkdown: ({ articleId }: { articleId: string }) => (
      <div data-testid="dynamic-markdown">{articleId}</div>
    ),
  };
});

import DominionPage from './DominionPage';

describe('DominionPage', () => {
  it('runs the default policy against every bot', async () => {
    render(<DominionPage />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText(/Game over/)).toBeInTheDocument();
  });

  it('shows validation errors instead of running', () => {
    render(<DominionPage />);
    fireEvent.change(screen.getByLabelText('Policy'), { target: { value: '{"buy": ["Platinum"]}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }));
    expect(screen.getByText(/unknown card "Platinum"/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
