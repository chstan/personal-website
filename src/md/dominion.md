Simulator Information
=====================

Games are two-player: your policy against one of the built-in bots, alternating who goes first. Each game uses the standard two-player supply (8 of each victory card, 10 Curses, 10 of each kingdom card) and a fixed kingdom:

- **Moat** (2): +2 Cards. Blocks attacks while in hand.
- **Village** (3): +1 Card, +2 Actions.
- **Woodcutter** (3): +1 Buy, +2 coins.
- **Militia** (4): +2 coins. Opponent discards down to 3 cards.
- **Smithy** (4): +3 Cards.
- **Council Room** (5): +4 Cards, +1 Buy. Opponent draws a card.
- **Festival** (5): +2 Actions, +1 Buy, +2 coins.
- **Laboratory** (5): +2 Cards, +1 Action.
- **Market** (5): +1 Card, +1 Action, +1 Buy, +1 coin.
- **Witch** (5): +2 Cards. Opponent gains a Curse.

Plus Copper, Silver, Gold, Estate, Duchy, Province, and Curse. Cards that need open-ended decisions (Chapel, Remodel, Throne Room, and friends) are left out so that a policy can stay a simple list.

Each turn runs the usual phases. In the **action phase** the policy plays actions while it has actions remaining. In the **buy phase** every treasure in hand is played automatically and the policy buys cards, one per available buy. **Cleanup** discards everything and draws five new cards.

The game ends after the turn in which the Provinces run out or any three supply piles are empty. Most victory points wins; a tie goes to the player who took fewer turns. To keep passive policies from running forever, games also stop after 60 turns each.

Reactions to attacks are handled for you: Moat always blocks, and when Militia hits you the simulator discards Curses and victory cards first, then your cheapest remaining cards.

Writing a Policy
================

A policy is a JSON object with an optional `name` and two lists, `play` and `buy`:

```json
{
  "name": "Smithy Big Money",
  "play": ["Smithy"],
  "buy": [
    {"card": "Province", "minCoins": 8},
    {"card": "Duchy", "provincesLeftAtMost": 4},
    {"card": "Estate", "provincesLeftAtMost": 2},
    "Gold",
    {"card": "Smithy", "maxOwned": 1},
    "Silver"
  ]
}
```

`play` is a priority list of action cards. While you have actions left, the first listed card that is in your hand gets played. Actions you don't list are never played.

`buy` is a list of rules read top to bottom. For each buy, the first rule whose card is in the supply, affordable, and whose conditions all hold is purchased. If no rule matches, the turn ends. A bare card name like `"Gold"` is shorthand for `{"card": "Gold"}`. Rules may add any of these conditions:

- `minCoins`: only buy if you have at least this many coins available.
- `maxOwned`: only buy while you own fewer than this many copies.
- `provincesLeftAtMost`: only buy once the Province pile is down to this many or fewer.
- `provincesLeftAtLeast`: only buy while the Province pile has at least this many.

Unknown cards, misspelled keys, and malformed numbers are reported when you press run. The built-in bots are written in exactly this format, so you can load one from the menu above the editor and start tinkering from there.
