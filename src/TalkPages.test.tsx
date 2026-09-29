import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// DynamicMarkdown async-imports a .md asset and fetches it; stub it (see Blog.test.tsx).
vi.mock('./common', async () => {
  const actual = await vi.importActual<typeof import('./common')>('./common');
  return {
    ...actual,
    DynamicMarkdown: ({ articleId }: { articleId: string }) => (
      <div data-testid="dynamic-markdown">{articleId}</div>
    ),
  };
});

import { ConvexityDemo, TALK_PAGES, TalkItem, UnmigratedTalkRedirect } from './TalkPages';
import { TALKS, TalkKind } from './data';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/talks" element={<div data-testid="talks-index">talks</div>} />
        <Route path="/talks/:talkId" element={<TalkItem />} />
        <Route path="/unmigrated-talk" element={<UnmigratedTalkRedirect />} />
      </Routes>
    </MemoryRouter>,
  );

describe('TalkItem', () => {
  it.each([
    ['subgradient-iteration', ['talk_subgradient_iteration_intro', 'talk_subgradient_iteration']],
    ['knockout-datasync', ['talk_knockout_datasync']],
    ['data-engineering', ['talk_data_engineering']],
  ])('renders /talks/%s', (talkId, articleIds) => {
    renderAt(`/talks/${talkId}`);
    expect(screen.getAllByTestId('dynamic-markdown').map((el) => el.textContent)).toEqual(articleIds);
    expect(screen.getByRole('link', { name: 'Talks' })).toHaveAttribute('href', '/talks');
  });

  it('includes the convexity demo on the subgradient talk', () => {
    renderAt('/talks/subgradient-iteration');
    expect(screen.getByTestId('convexity-demo')).toBeInTheDocument();
  });

  it('redirects unknown talk ids to /talks', () => {
    renderAt('/talks/not-a-talk');
    expect(screen.getByTestId('talks-index')).toBeInTheDocument();
  });
});

describe('UnmigratedTalkRedirect', () => {
  it('forwards /unmigrated-talk#<id> to /talks/<id>', () => {
    renderAt('/unmigrated-talk#knockout-datasync');
    expect(screen.getByTestId('dynamic-markdown')).toHaveTextContent('talk_knockout_datasync');
  });

  it('forwards a bare /unmigrated-talk to /talks', () => {
    renderAt('/unmigrated-talk');
    expect(screen.getByTestId('talks-index')).toBeInTheDocument();
  });
});

describe('talks.json', () => {
  it('points every Zanbato tech talk at a ported talk page', () => {
    const zanbato = TALKS.filter((t) => t.kind === TalkKind.ZANBATO);
    expect(zanbato).toHaveLength(3);
    for (const t of zanbato) {
      const match = /^\/talks\/(.+)$/.exec(t.presentationUrl);
      expect(match, t.presentationUrl).not.toBeNull();
      expect(TALK_PAGES).toHaveProperty([match![1]]);
    }
  });
});

describe('ConvexityDemo', () => {
  it('animates the sweeping point and cleans up its timer', () => {
    vi.useFakeTimers();
    try {
      const { container, unmount } = render(<ConvexityDemo />);
      const redDot = () => container.querySelector('circle[fill="red"]')!.getAttribute('cx');
      const before = redDot();
      act(() => { vi.advanceTimersByTime(400); });
      expect(redDot()).not.toEqual(before);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
