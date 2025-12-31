declare module "react-baduk" {
  declare const Baduk: React.ComponentType<unknown>;
  declare const BadukBoard: React.ComponentType<unknown>;
  declare const Piece: React.ComponentType<unknown>;
  export {
    Baduk,
    BadukBoard,
    Piece,
  }
}
declare module 'remark-math' {}
declare module 'react-katex' {
  declare const InlineMath: React.ComponentType<unknown>;
  declare const BlockMath: React.ComponentType<unknown>;
}
declare module 'react-vis' {
  declare const XYPlot: React.ComponentType<unknown>;
  declare const XAxis: React.ComponentType<unknown>;
  declare const YAxis: React.ComponentType<unknown>;
  declare const HeatmapSeries: React.ComponentType<unknown>;
  declare const Hint: React.ComponentType<unknown>;
}
