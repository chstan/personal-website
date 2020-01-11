import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from 'react-router-dom';
import {ContactPage, GoPage, ReadingPage, Resume, WelcomePage} from "./staticPages";
import {ProjectsPage} from "./Project";
import {TalksPage} from "./Talks";
import PapersPage from "./Papers";
import DominionPage from "./DominionPage";
import ChessPage from "./ChessPage";
import {Expandable} from "./common";
import {BlogPage, BlogItem} from "./Blog";
import SlidePuzzlePage from "./SlidePuzzlePage";

const WrapLink: React.FC<{to: string,}> = ({to, children}) =>
  to.startsWith('http') ? <a className="external" href={to}>{children} <strong>⤤</strong></a> : <Link to={to}>{children}</Link>;

const Unimplemented: React.FC = () =>
  <p>Website migration in progress: this page has not been moved. You can still visit the old
    version at <WrapLink to={"http://historical.conradstansbury.com"}>the archived copy</WrapLink></p>;


class NavGroup extends Expandable {
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
  content: [
    ['/scheme', [Unimplemented, 'scheme']],
    ['/dominion', [DominionPage, 'dominion']],
    ['/go', [GoPage, 'go']],
    ['/chess', [ChessPage, 'chess']],
    ['/slide-puzzles', [SlidePuzzlePage, 'slide puzzles']],
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
  ['http://github.com/chstan', [Unimplemented, 'github']],

  SEPARATOR,

  ['/projects', [ProjectsPage, 'projects']],
  projectLinksSection,

  SEPARATOR,

  ['/writing', [BlogPage, 'writing']],
  ['/reading', [ReadingPage, 'reading']],
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
      <h3 id="name-header">Conrad Stansbury</h3>
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
        })}
      </ul>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="container">
        <div className="nav-container">
          <Navbar />
        </div>
        <div className="content-container">
          <Switch>
            <Route path='/writing/:blogId'><BlogItem /></Route>
            {flatLinks.map(([k, [C, _]]) =>
              <Route key={k} path={k}>
                <C />
              </Route>
            )}
          </Switch>
        </div>
      </div>
    </Router>
  );
};

export default App;
