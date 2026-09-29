import React from "react";
import {WrapLink} from "./common";
import {Interpreter, isComplete} from "./lib/scheme";

type ConsoleLineKind = 'input' | 'output' | 'value' | 'error';
type ConsoleLine = { kind: ConsoleLineKind, text: string };

const PROMPT = '> ';

const WELCOME: Array<ConsoleLine> = [
  {kind: 'output', text: 'Try (define (square x) (* x x)) and then (map square \'(1 2 3)).'},
];

const SchemeConsole: React.FC = () => {
  const [interpreter] = React.useState(() => new Interpreter());
  const [lines, setLines] = React.useState<Array<ConsoleLine>>(WELCOME);
  const [input, setInput] = React.useState('');
  const [history, setHistory] = React.useState<Array<string>>([]);
  const [historyIndex, setHistoryIndex] = React.useState<number | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lines]);

  const submit = (src: string) => {
    const result = interpreter.run(src);
    const produced: Array<ConsoleLine> = [{kind: 'input', text: src}];
    if (result.output !== '') {
      produced.push({kind: 'output', text: result.output});
    }
    result.values.forEach((text) => produced.push({kind: 'value', text}));
    if (result.error !== undefined) {
      produced.push({kind: 'error', text: `error: ${result.error}`});
    }
    setLines((prev) => prev.concat(produced));
    setHistory((prev) => prev.concat([src]));
    setHistoryIndex(null);
    setInput('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (input.trim() === '') {
        e.preventDefault();
        return;
      }
      if (isComplete(input)) {
        e.preventDefault();
        submit(input);
      }
      // Otherwise let the newline through so unbalanced input can continue on the next line.
      return;
    }
    const singleLine = !input.includes('\n');
    if (e.key === 'ArrowUp' && singleLine && history.length > 0) {
      e.preventDefault();
      const next = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(history[next]);
    } else if (e.key === 'ArrowDown' && singleLine && historyIndex !== null) {
      e.preventDefault();
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(null);
        setInput('');
      } else {
        setHistoryIndex(next);
        setInput(history[next]);
      }
    }
  };

  return (
    <div className="scheme-console" ref={scrollRef} onClick={() => inputRef.current?.focus()}>
      {lines.map((line, i) =>
        <pre key={i} className={`scheme-line scheme-${line.kind}`}>
          {line.kind === 'input' ? PROMPT + line.text.split('\n').join('\n  ') : line.text}
        </pre>
      )}
      <div className="scheme-prompt">
        <span aria-hidden="true">{PROMPT}</span>
        <textarea
          ref={inputRef}
          aria-label="Scheme input"
          value={input}
          rows={Math.max(1, input.split('\n').length)}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
};

const SchemePage: React.FC = () =>
  <div id="scheme">
    <div className="content-header">
      <p>Here's a small Scheme interpreter. It's functional, but not quite complete.</p>
      <p>If you are persistent enough to crash it (a very possible outcome), I would be happy if you let me know!</p>
      <p>
        <strong>Historical Note: </strong>The original version of this page sent each expression to
        a <WrapLink to="https://github.com/chstan/SchemeREPL">Scheme interpreter written in C</WrapLink> running
        on the server. This one is a re-implementation in TypeScript that runs entirely in your browser; you can
        still see <WrapLink to="https://web.archive.org/web/20150707053844/http://conradstansbury.com/scheme">the
        archived copy</WrapLink> of the old page.
      </p>
    </div>
    <SchemeConsole />
  </div>;

export default SchemePage;
