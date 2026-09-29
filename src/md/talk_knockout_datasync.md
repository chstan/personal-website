# Data Synchronization in Knockout

*A Zanbato tech talk, October 2nd, 2015. This was originally a slide deck; the slides are reproduced here in order.*

---

Some things reactive frameworks do well...

... and some pains of keeping the client and server updated

---

### Knockout

MVVM

Don't think about view-state manipulations that occur when data changes

Continuous updates as the single source of truth

But Knockout and React are really only view layers

---

What are the implications of this?

... It's a good thing, but it leaves the question of how we keep the client and server in sync pretty open

---

### Huge number of ideas about how to address this

**Lightweight:**

- In view-model AJAX
- ko.mapping

**Not so lightweight:**

- Falcor (Netflix)
- Relay (Facebook)
- Seems like a billion others

---

### Can gain nice properties:

- Maximally decouple view-logic from sync-logic
- Optimistic updates become trivial to implement
- Impose structure on dependencies in the view model

---

### Knockout provides two powerful utilities:

- Binding handlers
- Extenders

---

Wanted to see what it would take to build a sync layer on top of observables...
