# Personal website

Some quick history. The original version of this website consisted of a minimal web framework (basically just routing and templating and some middleware) I wrote in Haskell. I wanted to support more dynamic views after a time, so I migrated to this repo and used (clj, cljs) for (backend, frontend) respectively.

I still use clj for the backend, but I couldn't keep up to date enough on cljs practices (and quirks of the compilers) to justify continuing to use cljs. Around 2018 I migrated the frontend to React, where it lives now in ./front.

# Developing

Core cycle is: 

1. Make changes
2. `yarn build`
3. `yarn run`

You might find it useful to run:

`docker stop (docker ps -aq); docker rm (docker ps -aq); yarn build && yarn start`

## Adding a blog post

Add a .md file in `/md`, add and entry in `writing.json,` and add the read macro invocation in `Blog.tsx`. 
