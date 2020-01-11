Simulator Information
=====================

The simulator maintains during each turn the global game state, with a structure summarized below, and information specific to a single turn, including buying power and the number of actions remaining for the current player.

In order to determine what moves to make on a given turn, the simulator executes a policy, which is a collection of functions of (generally) the game state viewable from the active policy's point of view and the turn information. In order to be playable, a policy need only provide a function to decide what move to make on its turn, as reasonable defaults will be provided in the simulator utilities for reactions and other decisions.


Public Game State
-----------------

The global game state available to a policy (through its first argument) is a Clojure map. Its structure follows this example documenting the game state at the start of a new game on Asteria's turn:

    ;; Publicly viewable state
    {:player-names #{"Abas" "Asteria"}
     :turns ["Asteria" "Abas"]
     :card-pool {:Province  8
                 :Gold      30
                 :Ironworks 8
              ;; :Card      Count
                 }
     :players {"Asteria"
               {:name "Asteria"
                :hand [:Copper :Copper :Copper :Estate :Copper]
                :deck {:Copper 3 :Estate 2}
                :played-cards []
                :discard []
               "Abas"
               {:name "Abas"
                :hand-size 5
                :hand-and-deck {:Copper 7 :Estate 3}
                :played-cards []
                :discard []}}}

Turn Information
----------------

Additionally, the second argument to most functions in a policy is a description of the state of the policy's turn. This includes gold (including played treasures but excluding treasures in hand), and takes the format:

    ;; Turn information
    {:buys    1
     :actions 1
     :gold    0
     :phase   :action}

    ;; :phase can be :action or :buy

Minimal Policy
==============

A minimal viable policy is a map containing a function associated to the key :plays.

This function takes the game state and turn information and produces a move, which should be one of:

    ;; Play action
    {:intent  :play-action
     :card    :Smithy}
    ;; the value for :card can be any action in hand

    ;; Buy a card
    {:intent  :buy
     :card    :Province}
    ;; the value for :card can be any affordable card
    ;; available for purchase

    ;; Finish turn
    {:intent  :finish-turn}

The :plays function is repeatedly executed until a :finish-turn :intention is produced.
