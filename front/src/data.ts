import _BOOKS from './json/reading.json';
import _TALKS from './json/talks.json';
import _WRITING from './json/writing.json';
import _PROJECTS from './json/projects.json';
import _PAPERS from './json/papers.json';

export type Book = {
  title: string;
  author: string;
  finished: boolean;
  completionDate: string;
}

export type PaperInfo = { // less well typed than others. ...shrug
  name: string;
  authors: Array<string>;
  date: string;
  url: string;
  arxivId?: string;
  kind: string;
};

export enum TalkKind {
  ZANBATO = 'zanbato-tech-talk',
  INVITED = 'invited',
  OTHER = 'other',
}

export type Talk = {
  kind: TalkKind;
  name: string;
  date: string;
  location: string;
  presentationTitle: string;
  presentationUrl: string;
}

export type WritingInfo = {
  title: string;
  label: string;
  short: string;
  released: boolean;
  date: string;
}

const BOOKS: Array<Book> = _BOOKS;
const TALKS: Array<Talk> = _TALKS as any;
const PROJECTS: Array<ProjectInfo> = _PROJECTS;
const WRITING: Array<WritingInfo> = _WRITING;
const PAPERS: Array<PaperInfo> = _PAPERS;

const BASE_INFO = {
  address: '2517 Virginia St. Apt 5',
  addressCont: 'Berkeley CA, 94709',
  phone: '703 317 7012',
  emails: ['chstansbury@gmail.com', 'chstan@berkeley.edu', 'chstansbury@lbl.gov'],

  github: 'https://github.com/chstan',
  githubUser: 'chstan',
};

export type EducationContent = {
  school: string;
  content: Array<string>;
  gpa: number;
}

export type SkillDescription = {
  proficient: Array<string>;
  experienced: Array<string>;
}

export type ExperienceContent = {
  title: string;
  at?: string;
  start: string;
  end?: string;
  content: Array<string>;
}

export type ParagraphsContent = {
  paragraphs: Array<string>;
};

type ResumeRowContent = EducationContent | ParagraphsContent | Array<ExperienceContent>
  | Array<Talk> | SkillDescription;

export enum ResumeRowKind {
  Education = 'education',
  RawContent = 'raw_content',
  Experiences = 'experiences',
  Talks = 'talks',
  Skills = 'skills',
}

export type ResumeRow = {
  title: string;
  kind: ResumeRowKind;
  content: ResumeRowContent;
}

const CS_COURSES = [
  "Computer Organization and Systems",
  "Algorithms",
  "Optimization and Graduate Algorithms",
  "Data Mining",
  "Data Mining for Cyber Security",
  "Linear Dynamical Systems",
];

const PHYSICS_COURSES = [
  "Quantum Field Theory I",
  "General Relativity",
  "Low Temperature Physics Lab",
  "Lasers Laboratory",
  "Statistical Mechanics and Thermodynamics I + II",
  "Hamiltonian Mechanics",
  "Electricity and Magnetism",
  "Quantum Mechanics",
  "Introduction to Particle Physics",
  "Introduction to Cosmology",
  "Electrons and Photons",
];

const MATH_COURSES = [
  "Graduate Algebra I + II",
  "Functional Analysis",
  "Convex Optimization I + II",
];

const RESUME_INFO: Array<ResumeRow> = [{
  title: 'Education',
  kind: ResumeRowKind.Education,
  content: {
    school: "Stanford University",
    content: [
      "Graduated Jun 2015, BS Physics with Distinction and Honors, ",
      "concentration in theoretical physics"
    ],
    gpa: 4.01
  },
}, {
  title: 'Coursework',
  kind: ResumeRowKind.RawContent,
  content: {paragraphs: [CS_COURSES.join(', '), MATH_COURSES.join(', ')]},
}, {
  title: 'Experience',
  kind: ResumeRowKind.Experiences,
  content: [{
    title: 'Research Intern',
    at: 'SLAC National Laboratory',
    start: 'June 2013',
    end: 'June 2015',
    content: [
      `Working with the ATLAS group on two data analysis projects 
      to improve the resolution of Large Hadron Collier "
      experiments. Investigated several machine learning "
      techniques for jet finding and developed a jet classifier "
      competitive with state of the art.`,

      `Since June 2014, researched model based clustering 
      for jet finding. Wrote 10k+ lines of algorithmic C++ to 
      conduct and automate statistical analyses that handle TBs of data 
      and generate plots and histograms to communicate results.`,
    ]
  }, {
    title: 'Instructor',
    at: 'Stanford Physics 91SI',
    start: 'March 2015',
    end: 'June 2015',
    content: [
      `Designed and created lecture materials, met with faculty 
      to plan the curriculum, and lectured weekly for Physics 91SI, 
      scientific computing in Python, at Stanford.`
    ]
  }, {
    title: 'FEA',
    start: 'February 2015',
    content: [
      `Wrote a finite element analysis in C as well as a Scheme 
      interpreter to generate meshes and provide high level problem 
      definitions to the solver. Also implemented a lexer and 
      a recursive descent parser combinator for reading Scheme.`
    ],
  }, {
    title: 'Web Server + Web Development',
    start: 'September 2014',
    end: 'June 2015',
    content: [
      `Created a web server from the "
      ground up using Haskell + HTML5/CSS + JS. The site 
      running on it hosts completed and ongoing projects, 
      research, public documents, and papers. You're looking 
      at it! (or you were until recently, I've recently moved to 
      an SPA running on nginx/Clojure/LESS (and more recently nginx/TypeScript/LESS) 
      due more dynamic content accumulating on the site)`
    ]
  }, {
    title: 'Chess Engine',
    start: 'June 2012',
    end: 'December 2014',
    content: [
      `Designed and built a chess engine in C + x86 assembly. 
      The engine uses alpha-beta pruning with aspiration windows, 
      a variety of advanced data structures, and multithreading 
      to assess millions of positions per second. Ran Python-
      scripted tournaments to tune engine parameters with 
      machine learning.`
    ]
  }]
}, {
  title: 'Talks',
  kind: ResumeRowKind.Talks,
  content: []
}, {
  title: 'Skills',
  kind: ResumeRowKind.Skills,
  content: {
    proficient: [
      "C{++}", "Python", "Clojure/ClojureScript", "HTML/CSS", "JavaScript", 'React',
      "UNIX", "LaTeX", "ROOT",
    ],
    experienced: [
      'Ruby', 'Mathematica/Matlab', 'Haskell', 'Rust',
    ]
  }
}, {
  title: "Activities + Interests",
  kind: ResumeRowKind.RawContent,
  content: {paragraphs: [["Hiking", "running", "biking", "writing short stories", "cooking"].join(', ')]},
}];

export type ProjectInfo = {
  title: string;
  pictureUrl?: string;
  description: string;
  label?: string;
}

export {
  BOOKS,
  TALKS,
  WRITING,
  PROJECTS,
  PAPERS,

  BASE_INFO,

  // RESUME STUFF
  RESUME_INFO,
  CS_COURSES,
  PHYSICS_COURSES,
  MATH_COURSES,
}
