import React from "react";
import {Talk, TalkKind, TALKS} from "./data";

const TalkWrapper: React.FC<{talk: Talk}> = ({talk, children}) => {
  let link = <a href="#">[upcoming]</a>;
  if (talk.presentationUrl) {
    link = <a href={talk.presentationUrl}>[slide deck]</a>
  }
  return (
    <div className="talks-wrapper">
      <p>
        <strong>{talk.presentationTitle}</strong>
        {children}
        {link}
      </p>
    </div>
  );
};

const TalkSummaryDefault: React.FC<Talk> = (t) =>
  <TalkWrapper talk={t}>{` at ${t.name}, ${t.location}. ${t.date}. `}</TalkWrapper>;

const TalkSummaryZanbato: React.FC<Talk> = (t) =>
  <TalkWrapper talk={t}>{`,  ${t.date}.`}</TalkWrapper>;

const TalkSummaryOther = TalkSummaryDefault;
const TalkSummary: React.FC<Talk> = (t) => {
  switch (t.kind) {
    case TalkKind.ZANBATO:
      return <TalkSummaryZanbato {...t} />;
    case TalkKind.OTHER:
      return <TalkSummaryOther {...t} />;
    case TalkKind.INVITED:
      return <TalkSummaryDefault {...t} />;
  }
};

const TalksPage: React.FC = () => {
  const orders = [
    [TalkKind.INVITED, 'Invited Talks'],
    [TalkKind.ZANBATO, 'Tech Talks at Zanbato'],
    [TalkKind.OTHER, 'Other Talks'],
  ];

  return (
    <div>
      {orders.map(([k, l]) =>
        <div className="talks-container">
          <div className="talks-section-header">
            <p>{l}</p>
            {TALKS.filter(t => t.kind === k).map(TalkSummary)}
          </div>
        </div>
      )}
    </div>
  );
};

export {
  TalkSummary,
  TalksPage,
}