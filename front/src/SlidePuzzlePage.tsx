import React from "react";
import raw from "raw.macro";
import {Markdown} from "./common";

const SlidePuzzlePage = () =>
  <div>
    <header>
      <strong>Historical Note: </strong>This code no longer runs inline. Clojure build tooling has become too
      complicated so I now use React. This makes my life simpler but some old projects suffered.
    </header>
    <Markdown source={raw('./md/slide_puzzle.md')} />
  </div>;

export default SlidePuzzlePage;