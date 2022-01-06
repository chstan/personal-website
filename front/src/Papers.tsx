import React from "react";
import {PaperInfo, PAPERS, PapersKind} from "./data";
import {InlineMarkdown, WrapLink} from "./common";

const PaperSectionHeader: React.FC<{sectionTitle: string}> = ({sectionTitle, children}) => (
  <div className="talks-container">
    <header className="talks-section-header">{sectionTitle}</header>
    <ul>
      {children}
    </ul>
  </div>
);

const PaperSummary: React.FC<PaperInfo> = (paper) => {
  switch (paper.kind) {
    case PapersKind.Published:
      return (
        <div className="talks-wrapper">
          <p>
            {paper.authors.join(', ')}, <a href={paper.url}><InlineMarkdown>{paper.name}</InlineMarkdown></a>, <i>{paper.journal}</i>&nbsp;
            <strong>{paper.issue}</strong>, {paper.date}.
          </p>
        </div>
      );
    case PapersKind.Thesis:
      return (
        // My CSS needs cleaning up clearly
        <div className="talks-wrapper">
          <p>
            <a href={paper.url}>{paper.name}</a>, {paper.date}.
          </p>
        </div>
      );
    case PapersKind.Preprint:
      return (
        <div className="talks-wrapper">
          <p>
            {paper.authors.join(', ')}, <a href={paper.url}>{paper.name}</a>, {paper.arxivId}, {paper.date}.
          </p>
        </div>
      );
    case PapersKind.Longform:
    default:
      return (
        <div className="talks-wrapper">
          <WrapLink to={paper.url}>{paper.name}</WrapLink>, <span>{paper.date}</span>
        </div>
      );
  }
};

const PapersPage: React.FC = () => {
  const orders = [
    [PapersKind.Published, "Papers"],
    //['arxiv', 'Preprints'],
    [PapersKind.Longform, 'Other Longform Work'],
    [PapersKind.Thesis, 'Theses'],
  ];
  return (
    <div>
      {orders.map(([k, heading]) => (
        <PaperSectionHeader sectionTitle={heading}>
          {PAPERS.filter(p => p.kind === k).map(p => <li><PaperSummary {...p} /></li>)}
        </PaperSectionHeader>
      ))}
    </div>
  );
};

export default PapersPage;