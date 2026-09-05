# BattleCalculator-Freewar

Greasemonkey/Tampermonkey script for the MMORPG
[Freewar.de](https://www.freewar.de/).

It automatically computes whether a fight against a NPC on the current field
would be winning or loosing for the player. If the outcome is a defeat for the
player, it removes the fast-attack link from the NPC, preventing the player from
accidentally dying from the NPC.

The available documentation can be found in
[our wiki](https://github.com/ZabuzaW/BattleCalculator-Freewar/wiki).

## Getting Started

Two scripts have to be imported.

### Crawler

The script `BattleCalculatorStatCrawler-Freewar.user.js` runs on the inventory
frame, extracting all player stats, such as the players current lifepoints,
attack- or defense-power.

This is then made available to the main script through
[HTML5 Webstorage](https://www.w3schools.com/html/html5_webstorage.asp), or
alternatively through a cookie.

### Calculator

The script `BattleCalculator-Freewar.user.js` is the main script, running in the
main frame and decorating the fast-attack links of all NPCs with data.

It uses the players stats extracted by the _Crawler_ for its calculations.

NPC data, such as lifepoints and attack-power is taken from the in-game NPC
description, if available (_Onlo_, _Sicht des Lebens_, ...). Otherwise, a
database populated based on FreewarWiki data is used as fallback.

## Interface

| Case                               | UI                                             |
| ---------------------------------- | ---------------------------------------------- |
| Winning                            | ![Winning](https://i.vgy.me/eQreH8.jpg)        |
| Losing (Fast-Attack disabled)      | ![Losing](https://i.vgy.me/JXpUUo.jpg)         |
| High LP Loss or Dangerously low LP | ![Warning](https://i.vgy.me/MiDFed.jpg)        |
| Unique-NPC                         | ![Unique-NPC](https://i.vgy.me/jjwLZL.jpg)     |
| Group-NPC                          | ![Group-NPC](https://i.vgy.me/hYrDMa.jpg)      |
| (Super-) Resistance-NPC            | ![Resistance-NPC](https://i.vgy.me/6p06ll.jpg) |

NPCs can be marked `forbiddenNpc`, the UI then also has the fast-attack link
removed and shows `(do not attack)`.

NPCs marked `(unknown)` are currently missing in the NPC database, lifepoints or
attackpower is not known yet. The fast-attack link remains active, do not
accidentally click on it before checking the NPC.

## Update NPC Data

The fallback database for the NPC data can be found in
`BattleCalculator-Freewar.user.js`:

- `initForbiddenNpcs()`
- `initNpcCorrections()`
- `initNpcData()`

From time to time, this data should be updated. For that, see the following
tools:

- `C# NPC List Refresher Source Code\Program.cs`
- `Freewar\src\de\zabuza\battleCalculator\BattleCalculatorTool.java`
