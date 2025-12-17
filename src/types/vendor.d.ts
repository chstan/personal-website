declare module "react-markdown" {
  declare const ReactMarkdown: React.ComponentClass<any>;
  export default ReactMarkdown;
}
declare module "react-baduk" {
  declare const Baduk: React.ComponentClass<any>;
  declare const BadukBoard: React.ComponentClass<any>;
  declare const Piece: React.ComponentClass<any>;
  export {
    Baduk,
    BadukBoard,
    Piece,
  }
}
declare module 'remark-math' {}
declare module 'react-katex' {
  declare const InlineMath: any;
  declare const BlockMath: any;
}
declare module 'react-vis' {
  declare const XYPlot: any;
  declare const XAxis: any;
  declare const YAxis: any;
  declare const HeatmapSeries: any;
  declare const Hint: any;
}
