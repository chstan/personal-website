import React from "react";
import {
  BASE_INFO, RESUME_INFO, BOOKS,
  EducationContent, ParagraphsContent, ExperienceContent, Talk, SkillDescription,
  Book,
  ResumeRow, ResumeRowKind,
} from "./data";
import {TalkSummary} from "./Talks";
import {DynamicMarkdown, Expandable, SimpleButton, WrapLink} from "./common";
import { Baduk, AutoplayBaduk } from './lib/Baduk';
import moves from './json/alpha_go_lee_sedol_1.json';
import {ExampleMarriageDiagram} from "./Marriage";

const HOUR = 3600;
const NYT_MOIRE = "https://www.nytimes.com/2019/10/30/science/graphene-physics-superconductor.html";
const LANZARA_LAB = "http://research.physics.berkeley.edu/lanzara/";
const AUTODIDAQT_DEMO_VIDEO = "/video/autodidaqt-demo.mp4";
const AUTODIDAQT_DEMO_POSTER = "/video/autodidaqt-demo-poster.jpg";
const PYARPES_PAPER_URL = "https://www.sciencedirect.com/science/article/pii/S2352711019301633"

const PyARPESBlurb = () => {
  return (
    <article className="welcome-portal-item">
      <header><h2>PyARPES: A modern analysis framework for photoemission</h2></header>
      <object data="/img/PyARPES-Logo.svg" type="image/svg+xml">
        <img src="/img/PyARPES-Logo.png" />
      </object>
      Read the paper: <WrapLink to={PYARPES_PAPER_URL}>10.1016/j.softx.2020.100472</WrapLink>.
    </article>
  );
};

const AutodiDAQtBlurb = () => {
  return (
    <article className="welcome-portal-item">
      <header><h2>AutodiDAQt: Batteries-included scientific DAQ</h2></header>
      <video controls={false} autoPlay={true} muted={true} loop={true} width={350} poster={AUTODIDAQT_DEMO_POSTER}>
        <source src={AUTODIDAQT_DEMO_VIDEO} type="video/mp4"></source>
      </video>
    </article>
  );
};

const CrystalStructureBlurb = () => {
  const IMAGE_PERIOD = HOUR / 6;

  const images = [
    "/img/crystal_structure/structure-fenbs2.png",
    "/img/crystal_structure/structure-moire-ws2-wse2.png",
  ];

  const imageIdx = Math.floor(secondsSince1970() / IMAGE_PERIOD) % images.length;
  const imageUrl = images[imageIdx];

  return (
    <article className="welcome-portal-item">
      <header><h2>Ray-Tracing Crystal Structures and Moirés</h2></header>
      <img src={imageUrl} width="350px" />
    </article>
  );
};

const portalOptions = [
  ["https://arpes.readthedocs.io", () => <PyARPESBlurb />],
  ["/writing/crystal_structure", () => <CrystalStructureBlurb />],
  ["https://github.com/chstan/autodidaqt", () => <AutodiDAQtBlurb />],
  ['/go', () => (
      <article className="go-game go-game-small" id="go-game" style={{marginLeft: "2rem"}}>
          <AutoplayBaduk size={19} every={.25} sequence={moves} onClick={() => null}/>
      </article>
  )],
  ['/marriage', () => <ExampleMarriageDiagram />,]
];

const secondsSince1970 = () => Math.round(new Date().getTime() / 1000);

const WelcomePortal = (props: { fixIndex: number | null }) => {
  // stable over the course of a visit but repeat visits will be different
  const PORTAL_PERIOD = 8 * HOUR;
  let portalNumber = Math.floor(secondsSince1970() / PORTAL_PERIOD);
  portalNumber = portalNumber % portalOptions.length

  if (props.fixIndex !== null) {
    portalNumber = props.fixIndex;
  }

  const [portalUrl, Portal] = portalOptions[portalNumber];

  const PortalWrapper: React.FC<{depth: number,}> = ({children, depth}) => {
    if (depth > 10) depth = 10;
    if (depth < 0) return <div style={{margin: '10px'}}>{children}</div>;
    const N_LEVELS = 4;
    const scale = (N_LEVELS-Math.abs(depth - N_LEVELS));
    return (
      <div
        className="portal-wrapper"
        style={{
          border: '0.5px solid rgba(0, 0, 0, 0.15)',
          backgroundColor: `rgb(${255 - 5 * scale}, ${255 - 5 * scale}, ${255 - 5 * scale})`,
          padding: '2px',
        }}
      >
        <PortalWrapper depth={depth - 1}>
          {children}
        </PortalWrapper>
      </div>
    );
  };

  return (
    <section id='welcome-portal'>
      <header>
          <h1>Here's a glimpse <WrapLink to={portalUrl as string}>elsewhere on the site.</WrapLink></h1>
      </header>
      <section style={{marginTop: '1rem'}}>
        <PortalWrapper depth={7}>
          <Portal />
        </PortalWrapper>
      </section>
    </section>
  )
};
const WelcomePage: React.FC = () => {
  return (
    <div className="content-header statement">
      <p>Hi, I'm Conrad.</p>
      <p>
        <strong>Note, April 2022 -:</strong> I'm currently looking for a post-PhD role.
        If you work on a problem with asymmetric, positive human impact and
        you're looking for a data scientist, research engineer, or ML engineer
        who will bring technical leadership and cross-discipline expertise
        I would love to learn more about it.
      </p>

      <p>
        I am completing a physics PhD as a member of
        the <WrapLink to={LANZARA_LAB}>Lanzara Lab</WrapLink>
        at the University of California, Berkeley.

        My graduate work focused on developing and using powerful new
        spectroscopic tools like nanoscale and time-resolved ARPES
        to understand correlated phases of matter in two dimensional 
        <WrapLink to={NYT_MOIRE}>moirés</WrapLink>.
      </p>

      <p>
        ARPES, a data heavy discipline producing 1-10s of GBs/hour of high dimensional 
        electron spectra, requires sophisticated approaches to acquisition and interpretation.
        A core component of my PhD centered around better solving this problem, developing 
        ML approaches to the analysis of this data, and building open source software to better
        serve the interests of scientists.
      </p>
      <p>
        Notably, I am the author and maintainer for:
      </p>
      <p>
        <ul className="welcome-callout">
          <li>
            <WrapLink to="https://arpes.readthedocs.io/"><strong>PyARPES</strong></WrapLink>:
            a data analysis framework for angle resolved photoemission spectroscopy.
          </li>
          <li>
            <WrapLink to="https://daquiri.readthedocs.io/"><strong>DAQuiri</strong></WrapLink>:
            a LabView alternative providing user interface (UI) generation and high level primitives
            for managing scientific experiments.
          </li>
          <li>
            <WrapLink to="https://extra-qt.readthedocs.io/"><strong>extra-qt</strong></WrapLink>:
            a <WrapLink to="https://reactjs.org">React</WrapLink> inspired pure functional view layer
            around the desktop UI framework <WrapLink to="https://qt.io/">Qt5</WrapLink>.
          </li>
          <li>
            <WrapLink to="https://github.com/chstan/py-flex-motion"><strong>PyFlexMotion</strong></WrapLink>:
            a Python abstraction layer around National Instruments' Flex Motion library for PC-integrated
            motion controllers.
          </li>
          <li>
            <WrapLink to="https://github.com/chstan/pyseswrapper"><strong>PySESWrapper</strong></WrapLink>:
            a Python abstraction layer around Scienta Omicrom GmbH's hemispherical electron analyzers.
          </li>
        </ul>
      </p>
      <p>
        When not doing experiments in the lab, I also work on developing machine learning
        techniques to better understand the huge amounts of data ARPES provides on quantum materials.
      </p>
      <p>
        Recently, I operated as Head of Machine Learning for a startup developing a novel diagnostic test
        for respiratory viruses. I lead a small team building data infrastructure, developing vision-inspired
        classification models, and productionizing ML services and APIs.

        Prior to graduate school, I worked as a full-stack software engineer, a data scientist,
        and in technical recruiting at <WrapLink to="https://zanbato.com">Zanbato</WrapLink>.
      </p>
      <p>
        To see some of what I've been working on, take a look around
        or head over to my <WrapLink to={BASE_INFO.github}>GitHub</WrapLink>. 
        Alternatively, if you want to get in touch, send me an email. 
        
        These days&mdash;more than recent years&mdash;a coffee someplace in the Berkeley/SF/Oakland area 
        is another welcome way to connect.
      </p>
      <p>Thanks for visiting!</p>
      <WelcomePortal fixIndex={2} />
    </div>
  );
};

const ContactPage: React.FC = () => {
  return (
    <div className="contact-table contact-container">
      <div className="table">
        <div className="heading-left"><p>Phone</p></div>
        <div className="right"><p className="phone-number">{BASE_INFO.phone}</p></div>
      </div>
      <div className="table">
        <div className="heading-left"><p>Email</p></div>
        <div className="right">{BASE_INFO.emails.map(e => <p>{e}</p>)}</div>
      </div>
    </div>
  );
};

const BookSummary: React.FC<Book> = (book: Book,) => {
  return (
    <li className="book" key={book.title}>
      <cite>{book.title}</cite>
      <div className="just-container">
        <p className="just-left-container">{book.author}</p>
        <p className="just-right-container">{book.completionDate}</p>
      </div>
    </li>
  );
};

class ReadingPage extends Expandable {
  render() {
    const renderBooks = this.state.expanded ? BOOKS: BOOKS.slice(0, 5);
    return (
      <div>
        <div className="books-header"><p>A record of books I've read lately, to come back to later.</p></div>
        <ul>
          {renderBooks.map(BookSummary)}
        </ul>
        <SimpleButton onClick={this.toggle}>{this.state.expanded ? 'Hide' : 'Older'}</SimpleButton>
      </div>
    );
  }
}

const EducationSection = ({gpa, content, school}: EducationContent) => (
  <div>
    <div className="table"><i>{school}</i><div className="right"><p>{`GPA ${gpa}`}</p></div></div>
    <div>{content.map(c => <p>{c}</p>)}</div>
  </div>
);

const RawContentSection = ({paragraphs}: ParagraphsContent) => (
  <div className="resume-paragraphs">{paragraphs.map(p => <p>{p}</p>)}</div>
);

const SkillGroup = ({title, skills}: { title: string, skills: Array<string>}) => (
  <div className="table">
    <p><i>{title}</i></p>
    <p className="right"><span>{skills.join(", ")}</span></p>
  </div>
);

const SkillsSection = ({experienced, proficient}: SkillDescription) => (
  <div>
    <SkillGroup title="Proficient" skills={proficient} />
    <SkillGroup title="Experienced" skills={experienced} />
  </div>
);

const Experience = ({title, at, start, end, content}: ExperienceContent) => (
  <div>
    <div className="table experience-header">
      <p><strong>{title}</strong><span> {at}</span></p>
      <p className="right"><span>{`${start} - ${end || 'present'}`}</span></p>
    </div>
    <RawContentSection paragraphs={content} />
  </div>
);

const ExperienceSection = (experiences: Array<ExperienceContent>) => (
  <div className="experience-sections">
    {experiences.map(e => <Experience {...e} />)}
  </div>
);

const TalkSection = (talks: Array<Talk>) => <div>{talks.map(t => <TalkSummary talk={t}/>)}</div>;

const buildResumeRow: React.FC<ResumeRow> = ({kind, title, content}) => {
  const Components = new Map<ResumeRowKind, any>([
    [ResumeRowKind.Education, EducationSection],
    [ResumeRowKind.RawContent, RawContentSection],
    [ResumeRowKind.Skills, SkillsSection],
    [ResumeRowKind.Experiences, ExperienceSection],
    [ResumeRowKind.Talks, TalkSection],
  ]);

  const C: React.FC<any> = Components.get(kind);

  return (
    <div className="table resume-row">
      <div><h2>{title}</h2></div>
      {C(content)}
    </div>
  );
};

const Resume: React.FC = () => {
  return (
    <article id="resume">
      <div id="resume-header" className="hruled">
        <h1>Conrad Stansbury</h1>
        <p>{BASE_INFO.address}</p>
        <p>{BASE_INFO.addressCont}</p>
      </div>
      {RESUME_INFO.map(buildResumeRow)}
    </article>
  );
};

const UnmigratedTalksPage: React.FC = () => {
  return (
    <DynamicMarkdown articleId="talks_page" />
  );
}


const GoPage: React.FC = () =>
  <section className="markdown">
    <header><h1>Go Board React Component</h1></header>
    <p>
      A small npm package React components and  utilities for the game of Go.
      There are a few examples to play with, but many more uses are described on
      the <a href="https://github.com/chstan/react-baduk">project website</a>.
    </p>
    <p>Here's an example, you can click to add pieces.</p>
    <article id="go-game" style={{marginLeft: "2rem"}}>
      <Baduk size={19} />
    </article>
  </section>;

export {
  WelcomePage,
  UnmigratedTalksPage,
  ContactPage,
  ReadingPage,
  Resume,
  GoPage,
};

