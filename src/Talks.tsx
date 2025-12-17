import React from "react";
import {Talk, TalkKind, TALKS} from "./data";
import {InlineMarkdown} from "./common";

const TalkWrapper: React.FC<{talk: Talk}> = ({talk, children}) => {
  let link = <span>[upcoming]</span>;
  if (talk.presentationUrl) {
    link = <a href={talk.presentationUrl}>[slide deck]</a>
  }
  return (
    <div className="talks-wrapper">
      <p>
        <strong><InlineMarkdown>{talk.presentationTitle}</InlineMarkdown></strong>
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
const TalkSummary: React.FC<{talk: Talk}> = ({talk,}) => {
  switch (talk.kind) {
    case TalkKind.ZANBATO:
      return <TalkSummaryZanbato {...talk} />;
    case TalkKind.OTHER:
      return <TalkSummaryOther {...talk} />;
    case TalkKind.CONFERENCE:
    case TalkKind.INVITED:
      return <TalkSummaryDefault {...talk} />;
  }
};

const TalksPage: React.FC = () => {
  const orders = [
    [TalkKind.INVITED, 'Invited Talks'],
    [TalkKind.CONFERENCE, 'Conference Talks'],
    [TalkKind.ZANBATO, 'Tech Talks at Zanbato'],
    [TalkKind.OTHER, 'Other Talks'],
  ];

  return (
    <div>
      {orders.map(([k, l]) =>
        <div className="talks-container">
          <header className="talks-section-header">{l}</header>
          <ul>
            {TALKS.filter(t => t.kind === k).map(t => <li><TalkSummary talk={t} /></li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export {
  TalkSummary,
  TalksPage,
}