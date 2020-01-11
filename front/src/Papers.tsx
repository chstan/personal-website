import React from "react";
import {PaperInfo, PAPERS} from "./data";

const PaperSectionHeader: React.FC<{sectionTitle: string}> = ({sectionTitle, children}) => (
  <div className="talks-container">
    <div className="talks-section-header">
      <p>{sectionTitle}</p>
    </div>
    {children}
  </div>
);

const PaperSummary: React.FC<PaperInfo> = (paper) => {
  switch (paper.kind) {
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
      return <p>TODO</p>;
  }
};

const PapersPage : React.FC = () => {
  const kinds = [
    ['arxiv', 'Preprints'],
    ['thesis', 'Theses'],
    ['longform', 'Other Longform Work'],
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