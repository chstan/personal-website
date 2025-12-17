import React from 'react';
import {DynamicMarkdown} from "./common";

const DEFAULT_POLICY = `;; Example policy always forfeits turn.
;; Write your own policy here!

{:plays
 (fn [_ _]
   {:intent :finish-turn})}`;

class PlayDominion extends React.Component<any, any> {
  render() {
    return <p>Not migrated, you can look at the old version of the site.</p>;
  }
}

const DominionPage: React.FC = () => {
  return (
    <div id="dominion">
      <section id="no-indent"> <DynamicMarkdown articleId="dominion_header" /></section>
      <PlayDominion/>
      <section id="no-indent"><DynamicMarkdown articleId="dominion" /></section>
    </div>
  );
};

export default DominionPage;
