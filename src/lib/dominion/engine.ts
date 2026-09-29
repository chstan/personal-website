// A small, deterministic two-player Dominion engine.
//
// Supported rules: a 2-player supply (8 of each victory card, 10 Curses,
// 10 of each kingdom card), action / buy / cleanup phases, reshuffling,
// attacks (Militia, Witch) blocked by Moat, and the standard end conditions
// (Province pile empty or any three supply piles empty). Ties are broken in
// favour of the player who took fewer turns. Games are capped at MAX_TURNS
// turns per player so a passive policy can't loop forever.

import {CARDS, CardName, KINGDOM_CARDS, isTreasure} from './cards';
import {BuyRule, Policy} from './policy';
import {Rng, makeRng} from './rng';

export const MAX_TURNS = 60;

export interface PlayerState {
  name: string;
  policy: Policy;
  deck: CardName[];
  hand: CardName[];
  discard: CardName[];
  inPlay: CardName[];
  turns: number;
}

export type Supply = Record<CardName, number>;

export interface GameState {
  supply: Supply;
  players: PlayerState[];
  rng: Rng;
  log?: string[];
}

export interface GameResult {
  scores: number[];
  turns: number[];
  // Index of the winning player, or null for a tie.
  winner: number | null;
  log: string[];
}

export function initialSupply(): Supply {
  const supply = {
    Copper: 60 - 14, Silver: 40, Gold: 30,
    Estate: 8, Duchy: 8, Province: 8, Curse: 10,
  } as Supply;
  for (const k of KINGDOM_CARDS) supply[k] = 10;
  return supply;
}

export const allCards = (p: PlayerState): CardName[] =>
  [...p.deck, ...p.hand, ...p.discard, ...p.inPlay];

export const countOwned = (p: PlayerState, card: CardName) =>
  allCards(p).filter(c => c === card).length;

export const score = (p: PlayerState) =>
  allCards(p).reduce((acc, c) => acc + (CARDS[c].vp ?? 0), 0);

function shuffle<T>(xs: T[], rng: Rng): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

function draw(p: PlayerState, n: number, rng: Rng) {
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      if (p.discard.length === 0) return;
      p.deck = shuffle(p.discard, rng);
      p.discard = [];
    }
    p.hand.push(p.deck.pop() as CardName);
  }
}

function gain(state: GameState, p: PlayerState, card: CardName): boolean {
  if (state.supply[card] <= 0) return false;
  state.supply[card]--;
  p.discard.push(card);
  return true;
}

const emptyPiles = (supply: Supply) =>
  Object.values(supply).filter(n => n === 0).length;

export const isGameOver = (supply: Supply) =>
  supply.Province === 0 || emptyPiles(supply) >= 3;

// Default discard order when attacked by Militia: junk first, then the
// cheapest remaining cards.
const discardRank = (c: CardName) => {
  const def = CARDS[c];
  if (def.types.includes('curse')) return -2;
  if (def.types.includes('victory')) return -1;
  return def.cost;
};

function discardDownTo(p: PlayerState, n: number): CardName[] {
  const sorted = [...p.hand].sort((a, b) => discardRank(a) - discardRank(b));
  const discarded = sorted.slice(0, Math.max(0, p.hand.length - n));
  for (const c of discarded) p.hand.splice(p.hand.indexOf(c), 1);
  p.discard.push(...discarded);
  return discarded;
}

export function ruleMatches(
  rule: BuyRule, p: PlayerState, coins: number, supply: Supply,
): boolean {
  if (supply[rule.card] <= 0) return false;
  if (CARDS[rule.card].cost > coins) return false;
  if (rule.minCoins !== undefined && coins < rule.minCoins) return false;
  if (rule.maxOwned !== undefined && countOwned(p, rule.card) >= rule.maxOwned) return false;
  if (rule.provincesLeftAtMost !== undefined && supply.Province > rule.provincesLeftAtMost) return false;
  if (rule.provincesLeftAtLeast !== undefined && supply.Province < rule.provincesLeftAtLeast) return false;
  return true;
}

function takeTurn(state: GameState, me: number) {
  const p = state.players[me];
  const others = state.players.filter((_, i) => i !== me);
  const played: CardName[] = [];
  const bought: CardName[] = [];
  const notes: string[] = [];
  let actions = 1;
  let buys = 1;
  let coins = 0;
  p.turns++;

  // Action phase.
  while (actions > 0) {
    const card = p.policy.play.find(c => p.hand.includes(c));
    if (!card) break;
    actions--;
    p.hand.splice(p.hand.indexOf(card), 1);
    p.inPlay.push(card);
    played.push(card);
    const def = CARDS[card];
    actions += def.plusActions ?? 0;
    buys += def.plusBuys ?? 0;
    coins += def.plusCoins ?? 0;
    draw(p, def.plusCards ?? 0, state.rng);

    if (card === 'Council Room') {
      for (const o of others) draw(o, 1, state.rng);
    }
    if (def.attack) {
      for (const o of others) {
        if (o.hand.includes('Moat')) {
          notes.push(`${o.name} blocks with Moat`);
          continue;
        }
        if (card === 'Militia') {
          const d = discardDownTo(o, 3);
          if (d.length) notes.push(`${o.name} discards ${d.join(', ')}`);
        } else if (card === 'Witch' && gain(state, o, 'Curse')) {
          notes.push(`${o.name} gains a Curse`);
        }
      }
    }
  }

  // Buy phase: play every treasure, then follow the buy rules.
  for (const c of p.hand.filter(isTreasure)) {
    coins += CARDS[c].coins ?? 0;
    p.hand.splice(p.hand.indexOf(c), 1);
    p.inPlay.push(c);
  }
  const startingCoins = coins;
  while (buys > 0) {
    const rule = p.policy.buy.find(r => ruleMatches(r, p, coins, state.supply));
    if (!rule) break;
    gain(state, p, rule.card);
    bought.push(rule.card);
    coins -= CARDS[rule.card].cost;
    buys--;
  }

  // Cleanup.
  p.discard.push(...p.hand, ...p.inPlay);
  p.hand = [];
  p.inPlay = [];
  draw(p, 5, state.rng);

  if (state.log) {
    const parts = [
      played.length ? `plays ${played.join(', ')}` : null,
      notes.length ? notes.join('; ') : null,
      `$${startingCoins}`,
      bought.length ? `buys ${bought.join(', ')}` : 'buys nothing',
    ].filter(Boolean);
    state.log.push(`T${p.turns} ${p.name}: ${parts.join('; ')}`);
  }
}

export interface PlayGameOptions {
  seed: number;
  log?: boolean;
  names?: [string, string];
}

export function playGame(policies: [Policy, Policy], opts: PlayGameOptions): GameResult {
  const rng = makeRng(opts.seed);
  const names = opts.names ?? [policies[0].name, policies[1].name];
  const players: PlayerState[] = policies.map((policy, i) => {
    const p: PlayerState = {
      name: names[i], policy, hand: [], discard: [], inPlay: [], turns: 0,
      deck: shuffle([...Array(7).fill('Copper'), ...Array(3).fill('Estate')], rng),
    };
    draw(p, 5, rng);
    return p;
  });
  const state: GameState = {supply: initialSupply(), players, rng, log: opts.log ? [] : undefined};

  let current = 0;
  while (!isGameOver(state.supply) && players[current].turns < MAX_TURNS) {
    takeTurn(state, current);
    current = (current + 1) % players.length;
  }

  const scores = players.map(score);
  const turns = players.map(p => p.turns);
  let winner: number | null = null;
  if (scores[0] !== scores[1]) winner = scores[0] > scores[1] ? 0 : 1;
  else if (turns[0] !== turns[1]) winner = turns[0] < turns[1] ? 0 : 1;

  const log = state.log ?? [];
  if (opts.log) {
    const reason = state.supply.Province === 0 ? 'Provinces are gone'
      : emptyPiles(state.supply) >= 3 ? 'three piles are empty'
        : `turn limit (${MAX_TURNS}) reached`;
    log.push(`Game over: ${reason}.`);
    players.forEach((p, i) => log.push(`${p.name}: ${scores[i]} VP in ${turns[i]} turns`));
    log.push(winner === null ? 'Tie.' : `${players[winner].name} wins.`);
  }
  return {scores, turns, winner, log};
}
