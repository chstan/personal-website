// Declarative policies. A policy is plain JSON data -- nothing a visitor
// writes is ever executed as code.
//
// {
//   "name": "Big Money",
//   "play": ["Laboratory", "Smithy"],
//   "buy": [
//     {"card": "Province", "minCoins": 8},
//     {"card": "Duchy", "provincesLeftAtMost": 4},
//     "Gold",
//     "Silver"
//   ]
// }
//
// "play" is an action priority list: while the policy has actions left it
// plays the first listed card that is in hand. Unlisted actions are never
// played. "buy" is walked top to bottom once per available buy; the first
// rule whose card is affordable, in the supply, and whose conditions hold is
// bought. If nothing matches the turn ends. A bare string is shorthand for
// {"card": "<name>"}.

import {ALL_CARDS, CardName, isAction, isCardName} from './cards';

export interface BuyRule {
  card: CardName;
  // Only buy when the total coins available this buy are at least this.
  minCoins?: number;
  // Only buy while the player owns fewer than this many copies.
  maxOwned?: number;
  // Only buy when the Province pile has at most / at least this many left.
  provincesLeftAtMost?: number;
  provincesLeftAtLeast?: number;
}

export interface Policy {
  name: string;
  play: CardName[];
  buy: BuyRule[];
}

export type ValidationResult =
  | {ok: true; policy: Policy}
  | {ok: false; errors: string[]};

const RULE_NUMBER_KEYS = ['minCoins', 'maxOwned', 'provincesLeftAtMost', 'provincesLeftAtLeast'] as const;
const RULE_KEYS: readonly string[] = ['card', ...RULE_NUMBER_KEYS];
const POLICY_KEYS: readonly string[] = ['name', 'play', 'buy'];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const unknownCard = (where: string, value: unknown) =>
  `${where}: unknown card ${JSON.stringify(value)}. Known cards: ${ALL_CARDS.join(', ')}.`;

export function validatePolicy(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return {ok: false, errors: ['Policy must be a JSON object with "play" and "buy" lists.']};
  }

  for (const key of Object.keys(input)) {
    if (!POLICY_KEYS.includes(key)) errors.push(`Unknown top-level key "${key}".`);
  }

  let name = 'Unnamed policy';
  if (input.name !== undefined) {
    if (typeof input.name !== 'string') errors.push('"name" must be a string.');
    else name = input.name;
  }

  const play: CardName[] = [];
  if (input.play !== undefined) {
    if (!Array.isArray(input.play)) {
      errors.push('"play" must be a list of action card names.');
    } else {
      input.play.forEach((c, i) => {
        if (typeof c !== 'string' || !isCardName(c)) errors.push(unknownCard(`play[${i}]`, c));
        else if (!isAction(c)) errors.push(`play[${i}]: ${c} is not an action card.`);
        else play.push(c);
      });
    }
  }

  const buy: BuyRule[] = [];
  if (!Array.isArray(input.buy)) {
    errors.push('"buy" must be a list of buy rules.');
  } else {
    input.buy.forEach((raw, i) => {
      const where = `buy[${i}]`;
      const rule: unknown = typeof raw === 'string' ? {card: raw} : raw;
      if (!isRecord(rule)) {
        errors.push(`${where}: expected a card name or an object like {"card": "Gold"}.`);
        return;
      }
      for (const key of Object.keys(rule)) {
        if (!RULE_KEYS.includes(key)) errors.push(`${where}: unknown key "${key}".`);
      }
      const card = rule.card;
      if (typeof card !== 'string' || !isCardName(card)) {
        errors.push(unknownCard(`${where}.card`, card));
        return;
      }
      const parsed: BuyRule = {card};
      for (const key of RULE_NUMBER_KEYS) {
        const v = rule[key];
        if (v === undefined) continue;
        if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
          errors.push(`${where}.${key} must be a non-negative integer.`);
        } else {
          parsed[key] = v;
        }
      }
      buy.push(parsed);
    });
  }

  return errors.length ? {ok: false, errors} : {ok: true, policy: {name, play, buy}};
}

export function parsePolicy(source: string): ValidationResult {
  let data: unknown;
  try {
    data = JSON.parse(source);
  } catch (e) {
    return {ok: false, errors: [`Invalid JSON: ${(e as Error).message}`]};
  }
  return validatePolicy(data);
}
