import React, {MouseEventHandler} from "react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import ReactMarkdown from 'react-markdown';
import RemarkMathPlugin from 'remark-math';
import { BlockMath, InlineMath } from 'react-katex';

import 'katex/dist/katex.min.css';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const SimpleButton: React.FC<{onClick: MouseEventHandler}> = ({onClick, children}) =>
  <button className="simple-button" onClick={onClick}>{children}</button>;

function renderSyntax(language: string = 'python') {
  let outerLanguage = language;

  const Renderer: React.FC<{value: string, language?: string,}> = ({value, language}) =>
    <SyntaxHighlighter
      style={atomOneLight}
      language={language || outerLanguage}>{value}</SyntaxHighlighter>;

  return Renderer;
}

const initialExpandState = {expanded: false};
type ExpandState = Readonly<typeof initialExpandState>;
class Expandable extends React.Component<any, any> {
  readonly state: ExpandState = initialExpandState;
  toggle = () => {
    this.setState({expanded: !this.state.expanded});
  };
}

const Markdown = (props: any) => {
  const newProps = {
    ...props,
    className: 'markdown',
    plugins: [
      RemarkMathPlugin,
    ],
    escapeHtml: false,
    renderers: {
      ...props.renderers,
      code: renderSyntax(),
      math: (props: {value: string}) => <BlockMath>{props.value}</BlockMath>,
      inlineMath: (props: {value: string}) => <InlineMath>{props.value}</InlineMath>,
    }
  };
  return <ReactMarkdown {...newProps} />;
};

const SuperSecretCat: React.FC = () => <section><img width="320px" src="img/kash.jpg" alt="Formidable!"/></section>;

export {
  SimpleButton,
  renderSyntax,
  Markdown,
  SuperSecretCat,

  // virtual components
  Expandable,
}