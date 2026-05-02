import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WRITING,
  TALKS,
  PAPERS,
  PROJECTS,
  BOOKS,
  PapersKind,
  TalkKind,
} from './data';

const SRC_DIR = dirname(fileURLToPath(import.meta.url));
const MD_DIR = join(SRC_DIR, 'md');

describe('WRITING', () => {
  it('every released, non-external entry has a matching markdown file', () => {
    const mdFiles = new Set(
      readdirSync(MD_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, '')),
    );

    const missing = WRITING.filter(
      (w) => w.released && !w.externalUrl && !mdFiles.has(w.label),
    ).map((w) => w.label);

    expect(missing, `writing.json entries missing src/md/<label>.md`).toEqual([]);
  });

  it('has the required fields on every entry', () => {
    for (const w of WRITING) {
      expect(typeof w.title).toBe('string');
      expect(typeof w.label).toBe('string');
      expect(typeof w.short).toBe('string');
      expect(typeof w.released).toBe('boolean');
      expect(typeof w.date).toBe('string');
      if (w.externalUrl !== undefined) {
        expect(w.externalUrl).toMatch(/^https?:\/\//);
      }
    }
  });

  it('labels are unique', () => {
    const labels = WRITING.map((w) => w.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('TALKS', () => {
  it('every entry has a known kind and the fields used in rendering', () => {
    const kinds = new Set<string>(Object.values(TalkKind));
    for (const t of TALKS) {
      expect(kinds.has(t.kind)).toBe(true);
      expect(typeof t.date).toBe('string');
      expect(typeof t.location).toBe('string');
      expect(typeof t.presentationTitle).toBe('string');
      // ZANBATO summaries don't render `name`; everywhere else it's used.
      if (t.kind !== TalkKind.ZANBATO) {
        expect(typeof t.name).toBe('string');
      }
    }
  });

  it('the (date, presentationTitle) tuple is unique (TalksPage uses it as a React key)', () => {
    const keys = TALKS.map((t) => `${t.date}-${t.presentationTitle}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('PAPERS', () => {
  it('every entry has a known kind and authors list', () => {
    const kinds = new Set<string>(Object.values(PapersKind));
    for (const p of PAPERS) {
      expect(kinds.has(p.kind)).toBe(true);
      expect(typeof p.name).toBe('string');
      expect(Array.isArray(p.authors)).toBe(true);
      expect(typeof p.date).toBe('string');
    }
  });
});

describe('PROJECTS', () => {
  it('every entry has a title and description', () => {
    for (const p of PROJECTS) {
      expect(typeof p.title).toBe('string');
      expect(typeof p.description).toBe('string');
    }
  });
});

describe('BOOKS', () => {
  it('every entry has the required shape', () => {
    for (const b of BOOKS) {
      expect(typeof b.title).toBe('string');
      expect(typeof b.author).toBe('string');
      expect(typeof b.finished).toBe('boolean');
      // impression and completionDate are nullable strings
      if (b.impression !== null) expect(typeof b.impression).toBe('string');
      if (b.completionDate !== null) expect(typeof b.completionDate).toBe('string');
    }
  });
});

describe('referenced public assets', () => {
  it("the SuperSecretCat image referenced in common.tsx exists in public/img", () => {
    const publicImg = join(SRC_DIR, '..', 'public', 'img', 'kash.jpg');
    expect(existsSync(publicImg)).toBe(true);
  });
});
