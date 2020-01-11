import React from 'react';
import {Markdown} from "./common";

import raw from 'raw.macro';
const dominionContent = raw('./md/dominion.md');
const dominionHeader = raw('./md/dominion_header.md');

const DEFAULT_POLICY = `;; Example policy always forfeits turn.
;; Write your own policy here!

{:plays
 (fn [_ _]
   {:intent :finish-turn})}`;

class PlayDominion extends React.Component<any, any> {
  render() {
    return <p>Not Migrated.</p>;
  }
}

const DominionPage: React.FC = () => {
  return (
    <div id="dominion">
      <section id="no-indent"> <Markdown source={dominionHeader} /></section>
      <PlayDominion/>
      <section id="no-indent"><Markdown source={dominionContent} /></section>
    </div>
  );
};

export default DominionPage;
