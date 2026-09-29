## Chess

I don't play much chess anymore, nor was I ever very good. 
I found the game interesting though and at one point built a 
[chess engine in C](https://github.com/chstan/chess-engine).


The project was as much an exercise in better understanding 
systems programming as it was about chess, and allowed for some
interesting followup mini-projects to script tournaments,
use simple ML algorithms to tune evaluation function parameters,
and to integrate it with my website.


The site used to pass your moves to the C engine running on my server.
These days the site is static, so the opponent below is a smaller
TypeScript port of the same ideas (alpha-beta search with a capture-only
quiescence search, thinking for a second or two per move) that runs
entirely in your browser. It's simpler than the original, but you can
still play against it if you like.  

### Play Chess