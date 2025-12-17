import React from "react";
import {DynamicMarkdown} from "./common";


const SlidePuzzlePage = () =>
  <div>
    <header>
      <strong>Historical Note: </strong>This code no longer runs inline. Clojure build tooling has become too
      complicated so I now use React. This makes my life simpler but some old projects suffered.
    </header>
    <DynamicMarkdown articleId="slide_puzzle"/>
  </div>;

export default SlidePuzzlePage;