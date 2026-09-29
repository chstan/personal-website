import React, {useState} from 'react';
import {DynamicMarkdown} from "./common";
import {BUILT_IN_BOTS, DEFAULT_POLICY, MatchSummary, runMatch} from "./lib/dominion/bots";
import {parsePolicy} from "./lib/dominion/policy";

const MAX_GAMES = 1000;

const pct = (n: number, d: number) => `${Math.round(100 * n / d)}%`;

const PlayDominion: React.FC = () => {
  const [source, setSource] = useState(DEFAULT_POLICY);
  const [games, setGames] = useState(200);
  const [errors, setErrors] = useState<string[]>([]);
  const [results, setResults] = useState<MatchSummary[]>([]);
  const [logIndex, setLogIndex] = useState(0);
  const [running, setRunning] = useState(false);

  const run = () => {
    const parsed = parsePolicy(source);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setResults([]);
      return;
    }
    setErrors([]);
    setRunning(true);
    const n = Math.max(1, Math.min(MAX_GAMES, Math.floor(games) || 1));
    const seed = Math.floor(Math.random() * 2 ** 31);
    // Let the button repaint before the (synchronous, fast) simulation runs.
    setTimeout(() => {
      setResults(BUILT_IN_BOTS.map(bot => runMatch(parsed.policy, bot, n, seed)));
      setRunning(false);
    }, 0);
  };

  const loadBot = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bot = BUILT_IN_BOTS.find(b => b.name === e.target.value);
    setSource(bot ? JSON.stringify(bot, null, 2) : DEFAULT_POLICY);
  };

  const sample = results[logIndex];

  return (
    <section id="play-dominion">
      <div className="dominion-controls">
        <label>
          Start from{' '}
          <select onChange={loadBot} defaultValue="">
            <option value="">Default policy</option>
            {BUILT_IN_BOTS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
        </label>
        <label>
          Games per bot{' '}
          <input type="number" min={1} max={MAX_GAMES} value={games}
                 onChange={e => setGames(Number(e.target.value))}/>
        </label>
      </div>
      <div id="editor-container">
        <textarea aria-label="Policy" spellCheck={false} rows={18} value={source}
                  onChange={e => setSource(e.target.value)}/>
      </div>
      <button id="run-button" onClick={run} disabled={running}>
        {running ? 'Running…' : 'Run simulation'}
      </button>

      {errors.length > 0 && (
        <ul className="dominion-errors">
          {errors.map(e => <li key={e}>{e}</li>)}
        </ul>
      )}

      {results.length > 0 && (
        <>
          <table className="dominion-results">
            <thead>
              <tr><th>Opponent</th><th>Win</th><th>Loss</th><th>Tie</th><th>Avg VP (you / them)</th></tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.opponent}>
                  <td>{r.opponent}</td>
                  <td>{pct(r.wins, r.games)}</td>
                  <td>{pct(r.losses, r.games)}</td>
                  <td>{pct(r.ties, r.games)}</td>
                  <td>{r.avgScore.toFixed(1)} / {r.avgOpponentScore.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <label>
            Sample game vs{' '}
            <select value={logIndex} onChange={e => setLogIndex(Number(e.target.value))}>
              {results.map((r, i) => <option key={r.opponent} value={i}>{r.opponent}</option>)}
            </select>
          </label>
          {sample && <pre className="dominion-log">{sample.sampleLog.join('\n')}</pre>}
        </>
      )}
    </section>
  );
};

const DominionPage: React.FC = () => {
  return (
    <div id="dominion">
      <section id="no-indent"> <DynamicMarkdown articleId="dominion_header" /></section>
      <PlayDominion/>
      <section id="no-indent"><DynamicMarkdown articleId="dominion" /></section>
    </div>
  );
};

export default DominionPage;
