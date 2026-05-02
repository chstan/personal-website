import React from 'react';
import {BrowserRouter, Route, Routes, } from 'react-router-dom';
import {ContactPage, GoPage, Resume, WelcomePage, UnmigratedTalksPage} from "./staticPages";
import {ProjectsPage} from "./Project";
import {TalksPage} from "./Talks";
import PapersPage from "./Papers";
import DominionPage from "./DominionPage";
import ChessPage from "./ChessPage";
import {WrapLink} from "./common";
import {BlogItem, BlogPage} from "./Blog";
import SlidePuzzlePage from "./SlidePuzzlePage";
import {TaxExplorerPage,} from "./Marriage";

const Unimplemented: React.FC = () =>
  <p>Website migration in progress: this page has not been moved. You can still visit the old
    version at <WrapLink to={"http://historical.conradstansbury.com"}>the archived copy</WrapLink></p>;


type NavGroupProps = React.PropsWithChildren<{
  title: string;
  defaultOpen: boolean;
}>;

const NavGroup: React.FC<NavGroupProps> = ({title, defaultOpen, children}) => {
  const [expanded, setExpanded] = React.useState(defaultOpen);
  return (
    <section className="nav-section">
      <header>
        <button onClick={() => setExpanded((v) => !v)}>
          {title} [{expanded ? '-' : '+'}]
        </button>
      </header>
      <div className="contents" style={{display: expanded ? 'block' : 'none'}}>{children}</div>
    </section>
  );
};

const projectLinksSection: NavLinkSection = {
  kind: 'navgroup',
  title: 'Quicklinks',
  defaultOpen: false,
  content: [
    ['/scheme', [Unimplemented, 'scheme']],
    ['/dominion', [DominionPage, 'dominion']],
    ['/go', [GoPage, 'go']],
    ['/chess', [ChessPage, 'chess']],
    ['/slide-puzzles', [SlidePuzzlePage, 'slide puzzles']],
  ]
};

const openSourceSection: NavLinkSection = {
  kind: 'navgroup',
  title: 'Open-source',
  defaultOpen: true,
  content: [
    ['https://arpes.readthedocs.io/', [Unimplemented, 'PyARPES']],
    ['https://daquiri.readthedocs.io/', [Unimplemented, 'DAQuiri']],
    ['https://extra-qt.readthedocs.io/', [Unimplemented, 'extra_qt']],
  ]
};

const SEPARATOR = { kind: 'separator' } as const;

type NavLinkItem = [string, [React.FC, string]];
type NavLinkSection = 
  | { kind: 'link', content: NavLinkItem }
  | { kind: 'separator' }
  | { kind: 'navgroup', title: string, content: Array<NavLinkItem>, defaultOpen: boolean };

const linkify = (c: NavLinkItem | NavLinkSection): NavLinkSection => {
  if ('kind' in c) {
    return c;
  }
  return {
    kind: 'link',
    content: c,
  }
};

const links: Array<NavLinkSection> = ([
  ['/', [WelcomePage, '/']],
  ['/talks', [TalksPage, 'talks']],
  ['/papers', [PapersPage, 'papers']],

  SEPARATOR,

  ['http://github.com/chstan', [Unimplemented, 'github']],
  openSourceSection,

  SEPARATOR,

  ['/projects', [ProjectsPage, 'projects']],
  projectLinksSection,

  SEPARATOR,

  ['/marriage', [TaxExplorerPage, 'civics, marriage, taxes']],

  SEPARATOR,

  ['/writing', [BlogPage, 'writing']],
  //['/reading', [ReadingPage, 'reading']],
  ['/contact', [ContactPage, 'contact']],

  SEPARATOR,

  ['/resume', [Resume, 'resume']],
] as Array<NavLinkItem | NavLinkSection>).map(linkify);

const flatLinks: Array<[string, [React.FC, string]]> = ([] as Array<NavLinkItem>).concat(...links.map((section) => {
  if (section.kind === 'separator') {
    return [];
  } else if (section.kind === 'link') {
    return [section.content];
  } else {
    return section.content; // navgroup
  }
})).filter((ls) => !ls[0].startsWith('http')).reverse();

const Navbar: React.FC = () => {
  return (
    <nav>
      <WrapLink to="/"><h3 id="name-header">Conrad Stansbury</h3></WrapLink>
      <ul>
        {links.map((section, index) => {
          if (section.kind === 'link') {
            const [k, [__, l]] = section.content;
            return <li key={k}><WrapLink to={k}>{l}</WrapLink></li>
          } else if (section.kind === 'separator') {
            return <li key={`sep-${index}`}><div className="nav-separator"></div></li>
          } else if (section.kind === 'navgroup') {
            return <li key={`${section.title}-${index}`}><NavGroup title={section.title} defaultOpen={section.defaultOpen}>
              <ul>
                {section.content.map(([k, [___, l]]) => <li key={k}><WrapLink to={k}>{l}</WrapLink></li>)}
              </ul>
            </NavGroup></li>
          }
          return null;
        })}
      </ul>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="container">
        <div className="nav-container">
          <Navbar />
        </div>
        <div className="content-container">
          <Routes>
            <Route path="/unmigrated-talk" element={<UnmigratedTalksPage />} />
            <Route path='/writing/:blogId' element={<BlogItem />}/>
            {flatLinks.map(([k, [C, __]]) =>
              <Route key={k} path={k} element={<C />} />
            )}
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
