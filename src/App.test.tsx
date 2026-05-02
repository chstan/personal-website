import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock heavy page modules so the App routing test stays cheap and dependency-free.
// Each mock renders an identifiable marker so we can assert on what mounted.
vi.mock('./Marriage', () => ({ TaxExplorerPage: () => <div data-testid="page">marriage</div> }));
vi.mock('./Project', () => ({ ProjectsPage: () => <div data-testid="page">projects</div> }));
vi.mock('./Talks', () => ({ TalksPage: () => <div data-testid="page">talks</div> }));
vi.mock('./Papers', () => ({ default: () => <div data-testid="page">papers</div> }));
vi.mock('./DominionPage', () => ({ default: () => <div data-testid="page">dominion</div> }));
vi.mock('./ChessPage', () => ({ default: () => <div data-testid="page">chess</div> }));
vi.mock('./SlidePuzzlePage', () => ({ default: () => <div data-testid="page">slide-puzzles</div> }));
vi.mock('./Blog', () => ({
  BlogPage: () => <div data-testid="page">writing</div>,
  BlogItem: () => <div data-testid="page">writing-item</div>,
}));
vi.mock('./staticPages', () => ({
  WelcomePage: () => <div data-testid="page">welcome</div>,
  ContactPage: () => <div data-testid="page">contact</div>,
  GoPage: () => <div data-testid="page">go</div>,
  Resume: () => <div data-testid="page">resume</div>,
  UnmigratedTalksPage: () => <div data-testid="page">unmigrated</div>,
}));

// react-ga performs window-only side effects on import; stub it to a no-op.
vi.mock('react-ga', () => ({ default: { initialize: vi.fn(), set: vi.fn(), pageview: vi.fn() } }));

// App ships its own <BrowserRouter>, so navigate via jsdom's history before mounting.
const App = (await import('./App')).default;

const renderAt = (path: string) => {
  window.history.pushState({}, '', path);
  return render(<App />);
};

describe('App routing', () => {
  it.each([
    ['/', 'welcome'],
    ['/talks', 'talks'],
    ['/papers', 'papers'],
    ['/projects', 'projects'],
    ['/marriage', 'marriage'],
    ['/writing', 'writing'],
    ['/contact', 'contact'],
    ['/resume', 'resume'],
    ['/dominion', 'dominion'],
    ['/chess', 'chess'],
    ['/slide-puzzles', 'slide-puzzles'],
    ['/go', 'go'],
    ['/writing/some-post', 'writing-item'],
    ['/unmigrated-talk', 'unmigrated'],
  ])('mounts the right page for %s', (path, marker) => {
    const { unmount } = renderAt(path);
    expect(screen.getAllByTestId('page').some((el) => el.textContent === marker)).toBe(true);
    unmount();
  });

  it('renders the navbar with the site title', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Conrad Stansbury' })).toBeInTheDocument();
  });
});
