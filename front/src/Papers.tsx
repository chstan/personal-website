import React from "react";
import {PaperInfo, PAPERS} from "./data";
import {WrapLink} from "./common";

const PaperSectionHeader: React.FC<{sectionTitle: string}> = ({sectionTitle, children}) => (
  <div className="talks-container">
    <header className="talks-section-header">{sectionTitle}</header>
    {children}
  </div>
);

const PaperSummary: React.FC<PaperInfo> = (paper) => {
  switch (paper.kind) {
    case 'published':
      return (
        <div className="talks-wrapper">
          <p>
            {paper.authors.join(', ')}, <a href={paper.url}>{paper.name}</a>, <i>{paper.journal}</i>&nbsp;
            <strong>{paper.issue}</strong>, {paper.date}.
          </p>
        </div>
      );
    case 'thesis':
      return (
        // My CSS needs cleaning up clearly
        <div className="talks-wrapper">
          <p>
            <a href={paper.url}>{paper.name}</a>, {paper.date}.
          </p>
        </div>
      );
    case 'arxiv':
      return (
        <div className="talks-wrapper">
          <p>
            {paper.authors.join(', ')}, <a href={paper.url}>{paper.name}</a>, {paper.arxivId}, {paper.date}.
          </p>
        </div>
      );
    case 'longform':
    default:
      return (
        <div className="talks-wrapper">
          <WrapLink to={paper.url}>{paper.name}</WrapLink>, <span>{paper.date}</span>
        </div>
      );
  }
};

const PapersPage : React.FC = () => {
  const kinds = [
    ['published', "Papers"],
    //['arxiv', 'Preprints'],
    ['longform', 'Other Longform Work'],
    ['thesis', 'Theses'],
  ];
  return (
    <div>
      {kinds.map(([k, heading]) => (
        <PaperSectionHeader sectionTitle={heading}>
          {PAPERS.filter(p => p.kind === k).map(p => <PaperSummary {...p} />)}
        </PaperSectionHeader>
      ))}
    </div>
  );
};

export default PapersPage;