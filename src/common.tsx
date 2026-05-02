import React, {MouseEventHandler} from "react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import 'katex/dist/katex.min.css';
import {Link} from "react-router-dom";

const SimpleButton: React.FC<React.PropsWithChildren<{onClick: MouseEventHandler}>> = ({onClick, children}) =>
  <button className="simple-button" onClick={onClick}>{children}</button>;

function renderSyntax(language: string = 'python') {
  const outerLanguage = language;

  const Renderer: React.FC<{value: string, language?: string,}> = ({value, language}) =>
    <SyntaxHighlighter
      style={atomOneLight}
      language={language || outerLanguage}>{value}</SyntaxHighlighter>;

  return Renderer;
}

const initialExpandState = {expanded: false};
type ExpandState = Readonly<typeof initialExpandState>;
class Expandable<P = object, S = object> extends React.Component<P, ExpandState & S> {
  readonly state: ExpandState & S = initialExpandState as ExpandState & S;
  toggle = () => {
    this.setState((prevState) => ({ ...prevState, expanded: !prevState.expanded }));
  };
}

const LabeledInputGroup: React.FC<React.PropsWithChildren<{label: string,}>> = ({label, children,}) =>
  <label className="input-group input-group-label">
    {children}
    <span className="label-text">{label}</span>
  </label>;

type MarkdownProps = {
  children: string;
  components?: Record<string, React.ComponentType>;
};

const Markdown = (props: MarkdownProps) => {
  const newProps = {
    ...props,
    className: 'markdown',
    remarkPlugins: [
      remarkMath,
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeRaw,
    ],
    components: {
      ...props.components,
      code({inline, className, children, ...rest}: {inline?: boolean, className?: string, children: React.ReactNode}) {
        const match = /language-(\w+)/.exec(className || 'python')
        return !inline && match ? (
          <SyntaxHighlighter
            style={atomOneLight}
            language={match[1]}
            PreTag="div"
            {...(rest as Record<string, unknown>)}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        ) : (
          <code className={className} {...(rest as Record<string, unknown>)}>
            {children}
          </code>
        )
      }
    }
  };
  return <ReactMarkdown {...newProps} />;
};

const InlineMarkdown = (props: MarkdownProps) => {
  return <span className="inline-markdown"><Markdown {...props}/></span>
};

const SuperSecretCat: React.FC = () => <section><img width="320px" src="img/kash.jpg" alt="Formidable!"/></section>;

const WrapLink: React.FC<React.PropsWithChildren<{ to: string, }>> = ({to, children}) =>
  to.startsWith('http') ? <a className="external" href={to}>{children} <strong className="link-decoration">⤤</strong></a> :
    <Link to={to}>{children}</Link>;

type DynamicMarkdownProps = {
  articleId: string
}
type DynamicMarkdownState = {
  markdown: string
};
class DynamicMarkdown extends React.Component<DynamicMarkdownProps, DynamicMarkdownState> {
  constructor(props: DynamicMarkdownProps) {
    super(props);
    this.state = { markdown: "" }
  }

  async componentDidMount() {
    const file = await import(`./md/${this.props.articleId}.md`);
    const response = await fetch(file.default);
    const text = await response.text();
    
    this.setState({markdown: text });
  }

  render() {
    return (
      <Markdown>{this.state.markdown}</Markdown>
    );
  }
}

export {
  SimpleButton,
  LabeledInputGroup,
  WrapLink,
  renderSyntax,
  DynamicMarkdown,
  Markdown,
  InlineMarkdown,
  SuperSecretCat,

  // virtual components
  Expandable,
}
