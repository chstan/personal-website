# What's Data Engineering? (And what have we been doing?)

*A Zanbato tech talk, May 13th, 2016, listed as "Data Engineering at Scale (or other catchy titles)". This was originally a slide deck; the slides are reproduced here in order.*

---

As a first thought...

"Scale"

---

#### "I've been doing a lot with big data recently!"

(Overhead at the Palo Alto Blue Bottle of a psychology study with $n=20000$)

---

On the other hand...

Google has on order of {{ mind bogglingly large number }} bytes of data

---

I'm not going to focus on these because they're relatively uninteresting

Zanbato doesn't have big data (yet?)

---

There are relatively good tools to deal with data "at scale"

(Thanks Google)

---

That doesn't prevent people from pursuing ridiculous ideas

[https://algorithmia.com/](https://algorithmia.com/)

---

Critical: Instead of moving data around, move code around

---

### So what's data engineering?

As a short answer: preparing data for use in some analysis or product

---

**AKA:** Your data science project consumes vectors but you have to feed it pictures,
blog post comment threads, paper shipping logs, toxicity records of decomposing leaves found
around your Cupertino headquarters sent to you by a third party lab in a proprietary (semi-corrupted) format,
turnstile counts from the Library of Congress, and a steady stream of Twitter mentions
where people spelled your name slightly wrong

---

This is just to say that there's a lot of work that goes into preparing data for use in a substantial project

---

#### Schema Matching

We need to impose structure onto different sources

---

#### Entity Recognition

Need to be able to reason about different sources when they're describing the same 'thing'

---

#### Pipelines

Compositional and simple to understand

De-and-re-constructible approach almost necessary to deal with flexibility inherent in data science/engineering

---

#### Data science is exploratory but...

Need to be able to ask questions of data, have a dialog

---

#### ...rate of change is inverse to length of the feedback cycle

Fine when you have a few MB of JSON data, use a REPL

Harder when you're dealing with 100s of GBs of data that's changing and fetched over FTP

---

#### One of the most important goals of data engineering is to enable fast feedback

Build software to provide a fast and consistent way to access data for heterogenous sources

---

This stuff's a pain, can a computer do it for me?

---

#### Some belief that software might be able to do this automatically

Likely what will happen is that tooling will improve in ways that make technical aspects simpler

If your data is already in a form that a computer can automatically understand it's probably pretty close to 'integrated'

---

#### Questions?
