import React from 'react';
import ReactGA from 'react-ga';
import {BrowserRouter, Route, Routes, } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import {ContactPage, GoPage, ReadingPage, Resume, WelcomePage, UnmigratedTalksPage} from "./staticPages";
import {ProjectsPage} from "./Project";
import {TalksPage} from "./Talks";
import PapersPage from "./Papers";
import DominionPage from "./DominionPage";
import ChessPage from "./ChessPage";
import {Expandable, WrapLink} from "./common";
import {BlogItem, BlogPage} from "./Blog";
import SlidePuzzlePage from "./SlidePuzzlePage";
import {TaxExplorerPage,} from "./Marriage";

const history = createBrowserHistory();
history.listen(update => {
  const location = update.location;
  if (process.env.NODE_ENV !== 'development') {
    ReactGA.set({page: location.pathname});
    ReactGA.pageview(location.pathname);
  }
});

const Unimplemented: React.FC = () =>
  <p>Website migration in progress: this page has not been moved. You can still visit the old
    version at <WrapLink to={"http://historical.conradstansbury.com"}>the archived copy</WrapLink></p>;


class NavGroup extends Expandable {
  componentDidMount() {
    this.setState({ expanded: this.props.defaultOpen, });
  }

  render() {
    return <section className="nav-section">
      <header><button onClick={this.toggle}>
        {this.props.title} [{this.state.expanded ? '-' : '+'}]
      </button></header>
      <div className="contents" style={{display: this.state.expanded ? 'block' : 'none'}}>{this.props.children}</div>
    </section>;
  }
}

const projectLinksSection = {
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

const openSourceSection = {
  kind: 'navgroup',
  title: 'Open-source',
  defaultOpen: true,
  content: [
    ['https://arpes.readthedocs.io/', [Unimplemented, 'PyARPES']],
    ['https://daquiri.readthedocs.io/', [Unimplemented, 'DAQuiri']],
    ['https://extra-qt.readthedocs.io/', [Unimplemented, 'extra_qt']],
  ]
};

const SEPARATOR = { kind: 'separator' };
const linkify = (c: any) => {
  if (c.kind) {
    return c;
  }
  return {
    kind: 'link',
    content: c,
  }
};

const links = [
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
].map(linkify);

const flatLinks: Array<[string, [React.FC, string]]> = [].concat(...links.map((section: any) => {
  if (section.kind === 'separator') {
    return [];
  } else if (section.kind === 'link') {
    return [section.content];
  } else {
    return section.content; // navgroup
  }
})).filter((ls: any) => !ls[0].startsWith('http')).reverse();

const Navbar: React.FC = () => {
  return (
    <nav>
      <WrapLink to="/"><h3 id="name-header">Conrad Stansbury</h3></WrapLink>
      <ul>
        {links.map(({kind, content, ...rest}) => {
          if (kind === 'link') {
            const [k, [_, l]] = content;
            return <li key={k}><WrapLink to={k}>{l}</WrapLink></li>
          } else if (kind === 'separator') {
            return <li><div className="nav-separator"></div></li>
          } else if (kind === 'navgroup') {
            return <li><NavGroup {...rest}>
              <ul>
                {content.map(([k, [_, l]]: any) => <li key={k}><WrapLink to={k}>{l}</WrapLink></li>)}
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
            {flatLinks.map(([k, [C, _]]) =>
              <Route key={k} path={k} element={<C />} />
            )}
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
