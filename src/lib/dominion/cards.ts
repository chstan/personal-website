// Card definitions for the client-side Dominion simulator.
//
// The simulator supports the base treasures and victory cards plus a fixed
// kingdom of ten base-set actions. Cards that need open-ended decisions
// (Chapel, Remodel, Throne Room, ...) are intentionally left out so that a
// policy can stay a declarative priority list.

export type CardType = 'treasure' | 'victory' | 'curse' | 'action';

export interface CardDef {
  name: CardName;
  cost: number;
  types: CardType[];
  // Treasure value.
  coins?: number;
  // Victory points (negative for Curse).
  vp?: number;
  // "+N" effects of an action card.
  plusCards?: number;
  plusActions?: number;
  plusBuys?: number;
  plusCoins?: number;
  attack?: boolean;
  reaction?: boolean;
  text: string;
}

export const BASE_CARDS = [
  'Copper', 'Silver', 'Gold', 'Estate', 'Duchy', 'Province', 'Curse',
] as const;

export const KINGDOM_CARDS = [
  'Moat', 'Village', 'Woodcutter', 'Militia', 'Smithy',
  'Council Room', 'Festival', 'Laboratory', 'Market', 'Witch',
] as const;

export type CardName = typeof BASE_CARDS[number] | typeof KINGDOM_CARDS[number];

export const ALL_CARDS: readonly CardName[] = [...BASE_CARDS, ...KINGDOM_CARDS];

export const CARDS: Record<CardName, CardDef> = {
  Copper: {name: 'Copper', cost: 0, types: ['treasure'], coins: 1, text: '$1'},
  Silver: {name: 'Silver', cost: 3, types: ['treasure'], coins: 2, text: '$2'},
  Gold: {name: 'Gold', cost: 6, types: ['treasure'], coins: 3, text: '$3'},
  Estate: {name: 'Estate', cost: 2, types: ['victory'], vp: 1, text: '1 VP'},
  Duchy: {name: 'Duchy', cost: 5, types: ['victory'], vp: 3, text: '3 VP'},
  Province: {name: 'Province', cost: 8, types: ['victory'], vp: 6, text: '6 VP'},
  Curse: {name: 'Curse', cost: 0, types: ['curse'], vp: -1, text: '-1 VP'},

  Moat: {
    name: 'Moat', cost: 2, types: ['action'], plusCards: 2, reaction: true,
    text: '+2 Cards. Reveal from hand to ignore an attack.',
  },
  Village: {
    name: 'Village', cost: 3, types: ['action'], plusCards: 1, plusActions: 2,
    text: '+1 Card, +2 Actions',
  },
  Woodcutter: {
    name: 'Woodcutter', cost: 3, types: ['action'], plusBuys: 1, plusCoins: 2,
    text: '+1 Buy, +$2',
  },
  Militia: {
    name: 'Militia', cost: 4, types: ['action'], plusCoins: 2, attack: true,
    text: '+$2. Each other player discards down to 3 cards.',
  },
  Smithy: {name: 'Smithy', cost: 4, types: ['action'], plusCards: 3, text: '+3 Cards'},
  'Council Room': {
    name: 'Council Room', cost: 5, types: ['action'], plusCards: 4, plusBuys: 1,
    text: '+4 Cards, +1 Buy. Each other player draws a card.',
  },
  Festival: {
    name: 'Festival', cost: 5, types: ['action'], plusActions: 2, plusBuys: 1, plusCoins: 2,
    text: '+2 Actions, +1 Buy, +$2',
  },
  Laboratory: {
    name: 'Laboratory', cost: 5, types: ['action'], plusCards: 2, plusActions: 1,
    text: '+2 Cards, +1 Action',
  },
  Market: {
    name: 'Market', cost: 5, types: ['action'],
    plusCards: 1, plusActions: 1, plusBuys: 1, plusCoins: 1,
    text: '+1 Card, +1 Action, +1 Buy, +$1',
  },
  Witch: {
    name: 'Witch', cost: 5, types: ['action'], plusCards: 2, attack: true,
    text: '+2 Cards. Each other player gains a Curse.',
  },
};

export const isCardName = (s: string): s is CardName =>
  (ALL_CARDS as readonly string[]).includes(s);

export const isAction = (c: CardName) => CARDS[c].types.includes('action');
export const isTreasure = (c: CardName) => CARDS[c].types.includes('treasure');
