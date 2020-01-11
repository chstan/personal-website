import React from "react";
import {Expandable, Markdown, SimpleButton, SuperSecretCat} from "./common";
import raw from "raw.macro";

const chessContent = raw('./md/chess.md');

class PlayChess extends React.Component<any, any> {
  render() {
    return <p>Not Migrated.</p>;
  }
}

class Opponent extends Expandable {
  render() {
    let kashi;
    if (this.state.expanded) {
      kashi = <SuperSecretCat />
    }
    return <div style={{marginTop: '2rem'}}>
      {kashi}
      <SimpleButton onClick={this.toggle}>{this.state.expanded ? 'Too Intimidating!': 'See your opponent?'}</SimpleButton>
    </div>;
  }
}

const ChessPage: React.FC = () => {
  return (
    <div id="chess">
      <section id="no-indent"> <Markdown source={chessContent} /></section>
      <PlayChess />
      <Opponent />
    </div>
  );
};

export default ChessPage;