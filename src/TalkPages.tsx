import React from "react";
import {Navigate, useLocation, useParams} from "react-router-dom";
import {DynamicMarkdown, InlineMarkdown} from "./common";
import {Breadcrumb} from "./Blog";

// Port of the animated convexity illustration from the original ClojureScript talk:
// a point sweeps along x^2 while the matching point on the chord stays above it.
const CHORD_START = -1;
const CHORD_END = 1.3;
const STEP = 0.02;
const TICK_MS = 40;
const SCALE = 100;
const GREEN_Y = -0.5;

const f = (x: number) => x * x;

const CURVE_SEGMENTS: Array<[number, number]> = Array.from({length: 40}, (_, i) => {
  const x = -2 + i * 0.1;
  return [x, x + 0.1];
});

// Data coordinates to SVG coordinates (y axis flipped, range y ∈ [-1, 5]).
const sx = (x: number) => SCALE * x;
const sy = (y: number) => 400 - SCALE * y;

const CONVEXITY_FORMULA =
  "$\\color{red}{f(}\\color{green}{x(\\theta)}\\color{red}{)} \\leq " +
  "\\color{blue}{(1 - }\\color{green}{\\theta}\\color{blue}{)\\cdot f(-1) + }" +
  "\\color{green}{\\theta}\\color{blue}{\\cdot f(1.3)}$";

const ConvexityDemo: React.FC = () => {
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((i) => (CHORD_START + i * STEP > CHORD_END ? 0 : i + 1));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const cx = Math.min(CHORD_START + idx * STEP, CHORD_END);
  const theta = (cx - CHORD_START) / (CHORD_END - CHORD_START);
  const chordY = (1 - theta) * f(CHORD_START) + theta * f(CHORD_END);

  return (
    <figure className="convexity-demo" data-testid="convexity-demo" style={{maxWidth: "360px", margin: "1rem auto"}}>
      <InlineMarkdown>{CONVEXITY_FORMULA}</InlineMarkdown>
      <svg viewBox="-200 -100 400 600" width="100%" role="img" aria-label="A chord of x squared lies above the curve">
        {CURVE_SEGMENTS.map(([x1, x2]) =>
          <line key={x1} x1={sx(x1)} x2={sx(x2)} y1={sy(f(x1))} y2={sy(f(x2))}
                stroke={x1 > CHORD_END || x1 < CHORD_START ? "black" : "red"} strokeWidth={3} />
        )}
        <line x1={sx(CHORD_START)} x2={sx(CHORD_END)} y1={sy(f(CHORD_START))} y2={sy(f(CHORD_END))}
              stroke="blue" strokeWidth={5} />
        <line x1={sx(CHORD_START)} x2={sx(CHORD_END)} y1={sy(GREEN_Y)} y2={sy(GREEN_Y)}
              stroke="green" strokeWidth={3} />
        <circle cx={sx(cx)} cy={sy(f(cx))} r={15} fill="red" />
        <circle cx={sx(cx)} cy={sy(chordY)} r={15} fill="blue" />
        <circle cx={sx(cx)} cy={sy(GREEN_Y)} r={15} fill="green" />
      </svg>
    </figure>
  );
};

type TalkSection =
  | { kind: 'markdown', articleId: string }
  | { kind: 'component', Component: React.FC };

const TALK_PAGES: Record<string, Array<TalkSection>> = {
  'subgradient-iteration': [
    {kind: 'markdown', articleId: 'talk_subgradient_iteration_intro'},
    {kind: 'component', Component: ConvexityDemo},
    {kind: 'markdown', articleId: 'talk_subgradient_iteration'},
  ],
  'knockout-datasync': [
    {kind: 'markdown', articleId: 'talk_knockout_datasync'},
  ],
  'data-engineering': [
    {kind: 'markdown', articleId: 'talk_data_engineering'},
  ],
};

const TalkItem: React.FC = () => {
  const {talkId} = useParams() as { talkId: string };
  const sections = TALK_PAGES[talkId];
  if (!sections) {
    return <Navigate to="/talks" replace />;
  }

  return <div className="blog-item">
    <Breadcrumb crumbs={[['/talks', 'Talks']]}/>
    <article>
      {sections.map((s, i) => s.kind === 'markdown' ?
        <DynamicMarkdown key={s.articleId} articleId={s.articleId} /> :
        <s.Component key={i} />
      )}
    </article>
  </div>;
};

// Old links pointed at /unmigrated-talk#<talk-id>; forward them to the ported page.
const UnmigratedTalkRedirect: React.FC = () => {
  const {hash} = useLocation();
  const talkId = hash.replace(/^#/, '');
  return <Navigate to={talkId in TALK_PAGES ? `/talks/${talkId}` : '/talks'} replace />;
};

export {
  ConvexityDemo,
  TALK_PAGES,
  TalkItem,
  UnmigratedTalkRedirect,
};
