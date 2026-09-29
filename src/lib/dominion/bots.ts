// Built-in opponents, written in the same declarative format visitors use.
import {playGame} from './engine';
import {Policy} from './policy';

const greening = [
  {card: 'Province', minCoins: 8},
  {card: 'Duchy', provincesLeftAtMost: 4},
  {card: 'Estate', provincesLeftAtMost: 2},
] as const;

export const BIG_MONEY: Policy = {
  name: 'Big Money',
  play: [],
  buy: [...greening, {card: 'Gold'}, {card: 'Silver'}],
};

export const SMITHY_BIG_MONEY: Policy = {
  name: 'Smithy Big Money',
  play: ['Smithy'],
  buy: [
    ...greening,
    {card: 'Gold'},
    {card: 'Smithy', maxOwned: 1},
    {card: 'Silver'},
  ],
};

export const WITCH_BOT: Policy = {
  name: 'Double Witch',
  play: ['Laboratory', 'Witch'],
  buy: [
    ...greening,
    {card: 'Witch', maxOwned: 2},
    {card: 'Gold'},
    {card: 'Laboratory', maxOwned: 2, provincesLeftAtLeast: 5},
    {card: 'Silver'},
  ],
};

export const BUILT_IN_BOTS: Policy[] = [BIG_MONEY, SMITHY_BIG_MONEY, WITCH_BOT];

// The starting policy shown in the editor: a Village/Smithy engine that is
// deliberately a bit worse than it could be.
export const DEFAULT_POLICY = `{
  "name": "My policy",
  "play": ["Village", "Market", "Smithy"],
  "buy": [
    {"card": "Province", "minCoins": 8},
    {"card": "Duchy", "provincesLeftAtMost": 3},
    {"card": "Gold"},
    {"card": "Smithy", "maxOwned": 2},
    {"card": "Village", "maxOwned": 2},
    {"card": "Silver"}
  ]
}`;

export interface MatchSummary {
  opponent: string;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  avgScore: number;
  avgOpponentScore: number;
  avgTurns: number;
  sampleLog: string[];
}

// Play `games` games of `me` vs `opponent`, alternating who goes first.
export function runMatch(me: Policy, opponent: Policy, games: number, seed: number): MatchSummary {
  const summary: MatchSummary = {
    opponent: opponent.name, games, wins: 0, losses: 0, ties: 0,
    avgScore: 0, avgOpponentScore: 0, avgTurns: 0, sampleLog: [],
  };
  const names: [string, string] = ['You', opponent.name];
  for (let g = 0; g < games; g++) {
    const meFirst = g % 2 === 0;
    const r = playGame(meFirst ? [me, opponent] : [opponent, me], {
      seed: seed + g,
      log: g === 0,
      names: meFirst ? names : [names[1], names[0]],
    });
    const mi = meFirst ? 0 : 1;
    if (r.winner === null) summary.ties++;
    else if (r.winner === mi) summary.wins++;
    else summary.losses++;
    summary.avgScore += r.scores[mi] / games;
    summary.avgOpponentScore += r.scores[1 - mi] / games;
    summary.avgTurns += r.turns[mi] / games;
    if (g === 0) summary.sampleLog = r.log;
  }
  return summary;
}
