import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// DynamicMarkdown async-imports a .md asset and fetches it; under jsdom that
// resolves to a relative URL which Node's undici can't parse. Stub it.
vi.mock('./common', async () => {
  const actual = await vi.importActual<typeof import('./common')>('./common');
  return {
    ...actual,
    DynamicMarkdown: ({ articleId }: { articleId: string }) => (
      <div data-testid="dynamic-markdown">{articleId}</div>
    ),
  };
});

import { BlogPage, BlogItem } from './Blog';
import { WRITING } from './data';

describe('BlogPage', () => {
  it('renders a heading for every released entry and skips unreleased', () => {
    render(
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>,
    );
    for (const w of WRITING) {
      const heading = screen.queryByRole('heading', { level: 2, name: w.title });
      if (w.released) {
        expect(heading, `expected released entry "${w.title}" to render`).not.toBeNull();
      } else {
        expect(heading, `expected unreleased entry "${w.title}" to be hidden`).toBeNull();
      }
    }
  });

  it('links external entries to their externalUrl, internal entries to /writing/:label', () => {
    render(
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>,
    );
    for (const w of WRITING) {
      if (!w.released) continue;
      const link = screen.getByRole('link', { name: w.title });
      const expected = w.externalUrl ?? `/writing/${w.label}`;
      expect(link).toHaveAttribute('href', expected);
    }
  });
});

describe('BlogItem', () => {
  it('reads :blogId from the route and renders a writing breadcrumb', () => {
    render(
      <MemoryRouter initialEntries={['/writing/note_transcription']}>
        <Routes>
          <Route path="/writing/:blogId" element={<BlogItem />} />
        </Routes>
      </MemoryRouter>,
    );
    const breadcrumb = screen.getByRole('banner'); // <header>
    expect(breadcrumb).toHaveTextContent('Writing');
  });
});
