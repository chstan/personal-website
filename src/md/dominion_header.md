# Dominion

While teaching my [friend, Sunil,](https://web.stanford.edu/group/frg/students/sunil.html) about Clojure on the Caltrain we produced a more or less complete [Dominion](http://riograndegames.com/Game/278-Dominion) simulator. I've made a few modifications to add a set of 10 cards, and the ability to load sandboxed AIs.

The original ran your Clojure AI in a sandboxed JVM on my server. That server is gone, so what's below is a smaller rewrite in TypeScript that runs entirely in your browser. Instead of arbitrary code, policies are now written as a little JSON priority list: nothing you type is ever executed, which is the cheapest sandbox there is.

Included below are brief descriptions of the batteries, bells, and whistles of the simulator, together with an editor so you can write and run your own AI. Because the games run locally and policies are just data, you can simulate hundreds of games per bot in well under a second.
