import React from "react";
import {
  BASE_INFO, RESUME_INFO, BOOKS,
  EducationContent, ParagraphsContent, ExperienceContent, Talk, SkillDescription,
  Book,
  ResumeRow, ResumeRowKind,
} from "./data";
import {TalkSummary} from "./Talks";
import {Expandable, SimpleButton} from "./common";
import { Baduk } from './lib/Baduk';
import {InlineMath} from "react-katex";

const WelcomePage: React.FC = () => {
  return (
    <div className="content-header statement">
      <p>Hi, I'm Conrad.</p>
      <p>
        <span>I am a graduate student in physics working as part of the </span>
        <a href="http://research.physics.berkeley.edu/lanzara/">Lanzara Lab</a>
        <span>.
        My current interests include developing and using powerful new
        spectroscopic tools like time resolved ARPES and THz optical reflectivity
        to understand topological states of matter and correlated systems.
        I am also interested in the problem of developing computational tools
        to better leverage the wealth of data that modern experimental probes
        and first principles calculations
        provide to drive discoveries of new phases of matter in physics and
        materials science.
        </span>
      </p>
      <p><span>
        Previous to my graduate student career I worked most recently as
        a software engineer at Zanbato to build efficient private markets.
      </span></p>
      <p>
        To see some of what I've been working on, take a look around
        or head over to my <a href={BASE_INFO.github}>GitHub</a>. Alternatively, if you want to get
        in touch, send me an email.
      </p>
      <p>Thanks for visiting.</p>
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
    <div className="book">
      <cite>{book.title}</cite>
    </div>
  );
};

class ReadingPage extends Expandable {
  render() {
    const renderBooks = this.state.expanded ? BOOKS: BOOKS.slice(0, 5);
    return (
      <div>
        <div className="book-header"><p>A record of books I've read lately, to come back to later.</p></div>
        {renderBooks.map(BookSummary)}
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

const TalkSection = (talks: Array<Talk>) => <div>{talks.map(t => <TalkSummary {...t}/>)}</div>;

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
  ContactPage,
  ReadingPage,
  Resume,
  GoPage,
};

