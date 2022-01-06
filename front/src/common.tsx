import React, {MouseEventHandler} from "react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

import 'katex/dist/katex.min.css';
import {atomOneLight} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {Link} from "react-router-dom";

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

const LabeledInputGroup: React.FC<{label: string,}> = ({label, children,}) =>
  <label className="input-group input-group-label">
    {children}
    <span className="label-text">{label}</span>
  </label>;

const Markdown = (props: any) => {
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
    escapeHtml: false,
    components: {
      ...props.components,
      code({node, inline, className, children, ...props}: any) {
        const match = /language-(\w+)/.exec(className || 'python')
        return !inline && match ? (
          <SyntaxHighlighter
            children={String(children).replace(/\n$/, '')}
            style={atomOneLight}
            language={match[1]}
            PreTag="div"
            {...props}
          />
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        )
      }
    }
  };
  return <ReactMarkdown {...newProps} />;
};

const InlineMarkdown = (props: any) => {
  return <span className="inline-markdown"><Markdown {...props}/></span>
};

const SuperSecretCat: React.FC = () => <section><img width="320px" src="img/kash.jpg" alt="Formidable!"/></section>;

const WrapLink: React.FC<{ to: string, }> = ({to, children}) =>
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
