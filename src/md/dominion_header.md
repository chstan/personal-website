# Dominion

While teaching my [friend, Sunil,](https://web.stanford.edu/group/frg/students/sunil.html) about Clojure on the Caltrain we produced a more or less complete [Dominion](http://riograndegames.com/Game/278-Dominion) simulator. I've made a few modifications to add a set of 10 cards, and the ability to load sandboxed AIs.

Included below are brief descriptions of the batteries, bells, and whistles of the simulator, together with an editor so you can write and run your own AI.

Performance overhead from sandboxing means that I can only run a handful of games for each submission. It's also worth pointing out that there is a cap of 500 ms per decision for the AIs, after which point they will forfeit their turn.
