# Can Scientists Escape from LabView? (Should We?)

<div class="head-note">
  <p>
    <strong>Note:</strong>
    This is a long essay on three topics:
    <ol>
      <li>Practical problems with the graphical representation of programs</li>
      <li>Problems with the LabView concurrency model</li>
      <li>Proposed solutions inside and outside the NI ecosystem</li>
    </ol> 
  </p>
  <p>
    I conclude that scientists should leave the National Instruments ecosystem and that 
    it is possible to build better tools for scientific DAQ: 
    <a href="https://daquiri.readthedocs.io"><code>DAQuiri</code></a>, 
    a framework for managing scientific experiments, and 
    <a href="https://extra-qt.readthedocs.io"><code>extra-qt</code></a>, a general 
    purpose UI library. You can <a href="#solution">skip past the first sections</a> 
    if you're already convinced (or curious).
  </p>
</div>            

Over the summer in 2019, a critical piece of hardware in our lab was damaged
during routine use. Like many groups, we have checks we use
in the lab to avoid problems of this kind&mdash;ones designed to ensure typical
invariants actually *are* invariant&mdash;but unfortunately we can't always
rely on these manual systems to work. Even more unfortunately, the error was 
such that automation of the software could have prevented the human error,
the damage, and the downtime.

Thankfully MAESTRO, a group we work with closely at the Advanced Light 
Source, had run into similar problems and already implemented a solution 
in LabView 2017. Even better, the relevant portion of our software was 
actually an old version of the software they had written, so in principal
the fix was just to bump the version of our LabView installation by a few 
years and swap the relevant VIs in.

What ensued was a 24 hour refactor of essentially every piece of adjacent
software that touched the internal types changed in the upgrades: many of 
these uses were indirected over VI references or used structures that were
copied and modifed from the originals, making tracking and fixing 
them difficult without running the program, encountering a runtime error,
and turning back to fix it. 

It's not that the code was intrinsically bad:
the changes made to the types were necessary and [LabView does not support
data polymorphism even as well as C](#anchor-notes).

This kind of friction and more confronts me whenever
I have to write LabView code for longer than a few hours. Each time I am 
confronted by the issue of whether the scientific community is actually 
well served by LabView as a language and as an ecosystem.

Actually answering this requires confronting the benefits of the graphical 
programming model. By virtue of the graphical dataflow paradigm, LabView 
provides a believable mental model for UI programming and reasonable, relatively
painless tools for connecting data to UI.

These benefits are not free though, and they aren't bought cheaply (even leaving 
licensing costs aside). 

## Sources of Friction in LabView Programming

To explore why LabView programming can feels burdensome,
let's look at a simple kind of program, one that turns input data
into output data or so called *pure* computations. This seems a bit silly, but 
we can all agree on the equivalence of pure computations across environments 
and languages: all we have to do is stuff data in and see what comes out.

Let's take a straightforward calculation, for instance to calculate the 
last 10 digits of $\sum_{n=1}^{1000}n^{n}$.

In LabView, proceeding literally and not factoring out UI elements for inputs, 
we might write:

<img alt="LabView Solution" width="480px" src="/diagram/sum-example-labview.png" />

Here's how an idiomatic Python program might perform the same kind of computation

```python
def modded_summand(n: int, k_last_digits: int):
    product = 1
    for _ in range(n):
        product = (product * n) % (10 ** k_last_digits)

    return product

print(sum([modded_summand(i, 10) for i in range(1, 1001)]) % 1e10)

# -> 9110846700
``` 

or one more literally following the LabView program

```python
total = 0
k_last_digits = 10

for current_number in range(1, 1001):
    summand = 1
    for _ in range(current_number):
        summand = (summand * current_number) % (10 ** k_last_digits)
    
    total = (total + summand) % (10 ** k_last_digits)

print(total)
```

Whether you like the LabView program or the Python program more 
might be a matter of taste, and I won't broach this topic. Instead,
I want to think about how these two sets of programs demonstrate the
different representations LabView and a text-based language give of the 
same computation, and explore consequences this representation
in terms of **symmetry**, **data anonymity**, and **concurrent code**.

## The Symmetry Space of Equivalent Programs

Given a program which performs a task, there are many essentially 
equivalent programs performing the same task, even many that are 
structurally and syntactically the same in that they represent the
same abstract syntax tree. If you have an IDE on your computer,
you'll know what I mean from your IDE's refactoring tools. 

In the Python code above, more or less the only option if we want to retain 
the coarse structure of the computation is to rename variables: moving the
symbols around changes the meaning of the program dramatically, or
makes it no longer a valid program. Changing the labels (variable names)
dramatically changes the program's *meaning* though, so we are constrained
to a significant degree here too. In the version with a function,
we can also permute the arguments, but we have only two choices there,
either `n` comes first or `k_last_digits` does. Unless we change which
idioms we use to express the computation (and Python does have a few!),
we don't have much choice about the representation of this computation 
at all.

The symmetries of LabView programs equivalent to the one we showed
is much larger: we could  label or relabel any of the wires, but 
we can also move them around. The resulting program is *exactly equivalent* 
under any deformation of these wires.
Many similar [graphical dataflow programming languages](#anchor-notes) rightly
do away with letting the user route wires and instead use straight lines or splines.   

When we're writing programs, the redundancy of this representation typically 
isn't a problem. We maintain an internal representation of the logic that we 
update as we work. The situation is changed when we read code later due to 
an asymmetry between *reading* and *writing* code. 

## Read/Write Asymmetry

When we read code, we translate the program into a conceptual representation. 
This process relies on our  ability to parse the essential symbols and 
assemble a relationship between them. As we understand the program, this relationship 
more and more resembles the structure of the actual computation.

Syntactic noise impedes this process: this is why&mdash;in general&mdash;people 
who use text-based programming languages prefer those with less
redundant syntax and boilerplate.

Is the equivalence in wire deformations essential syntax or 
syntactic noise? Unfortunately, in LabView it's both. The topology
of the connection is essential but the route is not. Nonetheless, you
have to visually trace the route to understand its relationships. 

Worse, humans are bad at recognizing these structural differences in the face of noise: 
identifying equivalent knots and graphs is hard! It's much simpler for us to 
identify categorical differences like number and color. At least we can 
be thankful that LabView typically does a good job of color coding
wire datatypes for language primitives and collections.

This problem doesn't present itself so severely in text-based languages because
we don't need to see every place a particular value is used in 
a computation to understand its relationships: variable names force us to bind
bits of syntax to meaningful concepts. When we later encounter a use of one of 
these names, we can connect the already parsed concept to this new use.
   
## Scanning Direction

This property of text-based programming languages allows us to read programs 
in a particular direction&mdash;typically left to right (depending on any
localization) and top to bottom. It's also a significant part of why `go to`
statements are generally a bad concept for control flow in language design.

There is no language enforcement in LabView for a particular scan direction
except at the level of style. At runtime, because of LabView's 
[simple but dangerous (see notes below)](#anchor-notes) concurrency model, 
execution can bear little resemblance to the geometry of the 
diagram, making reasoning about the execution behavior extremely difficult.

These issues of understanding code as opposed to writing it might seem unimportant,
but they are especially relevant in scientific software because most data acquisition
programs are cursed by longevity. New students will have to come in, understand 
the code, and make any changes in order to get their experiments done.
This doesn't even begin to address the urgent need to write simple, understandable,
and verifiably correct programs in order to engage in honest and reproducible 
science.

## Anonymous Data

From the small LabView program above, we can see another serious problem with 
the way National Instruments has opted to implement graphical dataflow programming. 
In LabView, wires are not required to have labels and represent **anonymous data**, 
which impedes meaningful interpretations of programs.

A recourse to this available to LabView programmers that probably seems pretty
natural to those coming from text-based languages is to use local variables,
which also gets rid of some of the clutter of wires that poorly laid out
LabView programs exhibit. 

National Instruments explicitly recommends minimizing use of local variables though, 
and for good reason: use of local provide an opaque avenue to data races by violating
part I of the **concurrency unholy trinity** because locals, globals, and similar 
constructs in LabView have no contracts about how their uses are sequenced, unless
the rest of the program forces some execution sequence on them. Referencing the 
same local in different blocks can create race conditions because all variables 
are mutable in LabView and are scoped to the entire VI, and essentially any LabView
code might right run in parallel unless you make sure it doesn't.

<figure>
  <img alt="LabView Data Race" width="480px" src="/diagram/data-race.png" />
  <figcaption>
    A minimal LabView data race. Usually&mdash;on my computer about 
    90% of the time&mdash;the value of <code>Dangerous Output</code> is 495000, but 
    it takes a different value for each step the for loops fall out of sync.
  </figcaption>
</figure>

Not to take too long a detour: this also demonstrates a serious problem
with the much lauded LabView concurrency model! In language with an 
explicit threading model, code that might deterministic execution order is marked 
affirmatively with a `fork`, `thread.spawn`, or whatever language primitive is 
provided. This means if you want to search for dangerous code, you can look
for these symbols. 

It's the opposite in LabView: if you want to be sure your code is safe
you need to ensure there's no other block anywhere in your diagram or program 
that could access or mutate the relevant variables, locals, or globals. You also
need to ensure that none make simultaneous calls into a VI that accesses any of 
these kinds of state (or calls out of LabView by a foreign function interface (FFI)!).
Code is default unsafe as opposed to default safe.

If you write any amount of nontrivial data acquisition code in LabView, you 
should probably be seriously worried that there's a data race or another race
condition hiding somewhere in your code: possibly changing data, or causing 
unexpected runtime behavior and application crashes. This isn't a path towards
reproducible and unimpeachable science.
    
Opportunities for data races can even easily be hidden because LabView is more than 
happy to let you "clean up" how your code looks by hiding it in a stacked sequence
or case structure. 

<figure>
  <img alt="LabView Data Race" width="480px" src="/diagram/data-race-2.png" />
  <figcaption>
    Dangerous uses of locals in LabView can easily be hidden.
  </figcaption>
</figure>

Discouraging the use of locals while failing to require wire labels throws out
possibly the most essential function of variables&mdash;binding data to human 
meaningful concepts&mdash; while not addressing the fundamental concurrency 
problems.

# Can National Instruments better address LabView's anonymous data and concurrency problems?

Yes. Absolutely. National Instruments could better address data anonymity through 
the following combination of language and UX changes in LabView and LabView NXG

1. Require wire labels and terminal labels, require different and unique labels on
   shift registers and frame locals
2. Display VI calls larger and place terminal labels on every subblock
3. Make a visual distinction between wires with different scopes to disentangle
   value, identity, and scope for wires attached to shift registers
4. Make locals write once read many times and encourage their use: even better
   do away with frame locals and instead provide UX decoration to denote the 
   originating scope (scope of only write) of a local variable
5. Allow global variable use only when LabView can statically determine the global
   does not violate the **concurrency unholy trinity**
6. Require explicitly opting in to concurrent execution of blocks and provide 
   visual of code that is concurrent and has no execution order guarantees

Additionally, the ecosystem would benefit by National Instruments separating
the G code compiler from the LabView development environment and allowing third parties
to develop better development environments than National Instruments seems willing
to provide. I am confident that National Instruments would be permitted by the
market to maintain their current license fees in this scenario even if a large number
of organizations wish to use the G-code compiler and third-party frontend in place 
of the full LabView ecosystem.

I'm not convinced that anything resembling the suggestions above will ever happen,
so the scientific community should consider the inverse problem. What is required 
to address the shortcomings of scientific and UI programming outside the LabView
ecosystem? Can we actually meet or exceed the convenience and expressive power of
LabView for writing data-driven user interfaces?

<h1 id="solution">Leaving LabView</h1>

Here's a pessimistic view of the situation:

1. Scientific users should not and cannot be expected to do UI programming
2. Scientific users need concurrent and asynchronous programming paradigms to do their work
3. Scientific users need the library and driver support offered by National Instruments 
   to do DAQ
4. Scientific users cannot be expected to write DAQ programs that ensure data integrity,
   use open data formats, maintain metadata and usage records, and are compatible with 
   changing scientific requirements

I neglect DAQ performance intentionally. The segments of the scientific community that do 
high performance computing don't use LabView for the majority of their computing 
needs anyway, so they hardly need to be convinced to leave. More directly and personally 
though, I have departed the HPC segment of the physics world, and the small segment 
of the physics world I live in now does not need to worry about DAQ performance except
maybe for asynchronous IO.

The core of what's needed above are better UI generators so that scientists
aren't relegated to boring UI programming tasks, and higher level abstractions
for performing scientific DAQ. I don't want to claim a monopoly on having the right
answers, but like a scientist I think about problems by trying my hand at a toy model.
This usually works better for me than just thinking or writing about the problem,
as you will probably appreciate having read what I have to say.

These problems separate well, so I put together two libraries. `extra-qt`, which primarily
targets the Qt5 Widgets API handles declarative UI in Python (for those that have doing 
Web UI programming in the last five years, it's a React runtime for Python). `DAQuri`, a 
client library to `extra-qt`'s view layer, provides high level primitives for talking 
to scientific hardware, managing data during acquisition, and provides a purely
declarative approach to programming scientific experiments.

<img alt="DAQuiri and extra-qt relationship diagram" width="550px" 
     src="/diagram/structure-cartoon.png" />

How about some examples?

# `extra-qt` and `DAQuiri`

**Note:** You can skip down a few sections if you aren't curious
in how the UI layer works.   

Let's try for a challenging UI task, making composable UI elements
that transparently interact with internal state, external events,
and which can be parameterized by arguments that change during program 
execution.

In `extra-qt` we can do this by subclassing `extra-qt.component.Component`. 
We need to write a `render` function for each of our components, and finally 
request that the component gets drawn into a new window. 

<div class="markdown-centered">
    <img alt="extra-qt Example Video" width="320px"
         src="/img/examples.nested_components.main.gif">
</div>

```
from dataclasses import dataclass
from PyQt5.QtCore import QTimer

from extra-qt.component import Component
from extra-qt.renderers.qt_renderer import render_window
from extra-qt.dom.qt_dom import *

@dataclass
class State:
    counter: int = 0

    def update(self):
        self.counter += 5

class ComponentB(Component):
    initial_state_cls = State
    update = Component.updates_state(State.update)

    def render(self):
        return group(dict(title='Inner Component',), [
            label(f'My count is: {self.state.counter}'),
            label(f'I received: {self.props.get("counter")}'),
            button(text='Increment', on_click=self.update),
        ])

class ComponentA(Component):
    initial_state_cls = State
    update = Component.updates_state(State.update)

    def after_mount(self):
        self.timer = QTimer()
        self.timer.timeout.connect(self.update)
        self.timer.start(100)

    def before_unmount(self):
        self.timer.stop()

    def render(self):
        my_counter = self.state.counter
        return group(dict(title='Outer Component',), [
            label(f'My count is: {self.state.counter}'),
            ComponentB.c(dict(counter=my_counter)),
            ComponentB.c(dict(counter=2*my_counter)),
        ])

render_window(create_element(ComponentA))
```

## How does this work?

If you just glance at the program listing above, it looks pretty natural.
We pass functions to call on certain events into UI elements (`on_click=self.update`)
and we nest UI elements directly, passing arguments `counter=2 * self.state.counter`.
Arguments can update the UI because the `render` function doesn't actually interact 
directly with the raw UI primitives (Qt widgets, here). Instead `render` describes what you 
would like the UI to look like and `extra-qt` compares this to an internal model
to determine what changes to make, if any. 

This permits us to update arguments to components *even after* they are mounted
without worrying about swapping UI elements in for old ones or losing application state.
We can also easily add or remove elements dynamically by changing what gets returned by
a render.



## Building UI-based DAQ Applications in `DAQuiri`  

<img alt="DAQuiri Snapshot" width="550px" src="/img/DAQuiri-example-snap.png" />

```python
from daquiri import Daquiri, Experiment
from daquiri.mock import (
  MockMotionController, MockScalarDetector,
)
from daquiri.scan import scan

class MyExperiment(Experiment):
    dx = MockMotionController.scan('mc').stages[0]()
    dy = MockMotionController.scan('mc').stages[1]()

    read_power = {'power': 'power_meter.device', }

    scan_methods = [
        scan(x=dx, name='dx Scan', read=read_power),
        scan(x=dx, y=dy, name='dx-dy Scan', read=read_power),
    ]

app = Daquiri(__name__, {}, {'experiment': MyExperiment}, {
    'mc': MockMotionController,
    'power_meter': MockScalarDetector,
})

app.start()
```

That's all. We get a window manager for each of our pieces of (in this case, fake) 
hardware, a window manager for the application, and our scan methods were unpacked 
with relevant controls for all the inputs. This works even in more complex cases, 
and if your data requirements change UI elements transparently adjust when you
change your types.

During the experiment, `DAQuiri` provides live views for all the 
incoming data streams, and records of reads and writes to all the underlying 
instruments.

<img alt="DAQuiri Snapshot" width="550px" src="/img/DAQuiri-after-data-snap.png" />

After data collection is finished or an unrecoverable DAQ error is reached (like 
inability to communicate with a piece of hardware), `DAQuiri` outputs the collected
data with

1. [Structured, N-dimensional frames](https://zarr.readthedocs.io/en/stable/) of collated
   data streams
2. A complete, timstamped record of the DAQ sequence, including all requested 
   moves and reads during acquisition
3. Complete, timestamped internal logs
4. Complete records of instrument state like time constants, acquisition modes, and 
   and other relevant hardware settings 

Even years after the fact, we can answer essential questions about our experiments:

1. **Q:** Is there too much deadtime between points in our lock-in measurements?
   
   **A1:** We can calculate statistics on the wait time between motion and acquisition
   and compare to the time constant.
   
   **A2:** We can scan over the lock-in time constant to find optimal DAQ settings. 
2. **Q:** Did we remove a systematic error by randomizing our DAQ sequence?
   
   **A:** `DAQuiri` records the full DAQ sequence, so we can understand the effect of 
   drift in our experiments. `DAQuiri` also lets us use different acquisition strategies
   if we want.

## Design Philosphy in `DAQuiri`

`DAQuiri` doesn't try to do everything, it relies on excellent library support in 
the Python ecosystem to make providing high level experiment primitives possible. At the
time of writing, `DAQuiri` itself is only a few thousand lines of code, and `extra-qt`
is only about a thousand more.

The largest corollary of this is in how DAQuiri treats instruments. At the current
time, there are excellent drivers for many pieces of scientific hardware in Python, 
including: [PyMeasure](https://pymeasure.readthedocs.io/en/latest/), 
[InstrumentKit](https://github.com/Galvant/InstrumentKit), and others. What `DAQuiri`
does provide is a way to wrap any driver you would like in a consistent asynchronous
interface by providing **axes** and **properties**.

### Axes, Scans, and Strategies

You can think of an **axis** as anything you can adjust or measure from in your 
experiment. If you can write to it, an axis defines a space of allowable 
configurations for your experiment: the wavelength range available to your laser 
or white-light filter, the physical range your motion controller can move a stepper
motor through, or the temperature of your sample. We perform experiments by 
traversing some regions in this configuration space while collecting data, at the end
of the day, the coordinates on the traversed region and the values collected are
our dataset and what we ultimately need to do our work.

In `DAQuiri`, there is a sharp separation between the configuration space in your 
experiment and the strategy or method we use to traverse and sample it. To see why
this is beneficial, let's look at a more complete example that demonstrate the 
flexibility available when we use `DAQuiri`. In this example, we start by defining
an instrument. This allows the runtime to build an instrument UI and defines
the configuration space of the experiment. Next we define a scan and&mdash;unlike 
before&mdash;we explicitly sequence the motions and measures that constitute our experiment.

```python
# ... imports

class MockSimpleDetector(ManagedInstrument):
    driver_cls = MockDriver
    device = AxisSpecification(
        float, where=['device'],
        mock=dict(read=lambda: np.random.normal() + 5)
    )

class SimpleScanMode(Enum):
    MOVE_WHILE_MEASURING = 0
    MOVE_THEN_MEASURE = 1


#this will get built into our UI for us
@dataclass
class SimpleScan:
    n_steps: int = 10
    start: float = 0
    stop: float = 20
    mode: SimpleScanMode = SimpleScanMode.MOVE_THEN_MEASURE

    def sequence(self, experiment, mc, ccd, power_meter, **kwargs):
        # in addition to the raw DAQ, please record two zarr 
        # arrays with a 'dx' axis referring to 'mc.stages[0]'
        # and content 'power' referring to data collected on 
        # the axis 'power_meter.device'
        experiment.collate(
            independent=[[mc.stages[0], 'dx']],
            dependent=[[power_meter.device, 'power']]
        )

        separately = self.mode == \
                     SimpleScanMode.MOVE_THEN_MEASURE
        for location in np.linspace(self.start, self.stop, 
                                    self.n_steps):
            with experiment.point():
                motions = [mc.stages[0].write(location)]
                daq = [power_meter.device.read(),]

                if separately:
                    yield motions
                    yield daq
                else:
                    yield motions + daq


class MyExperiment(Experiment):
    scan_methods = [SimpleScan]  # <- only one scan mode

app = Daquiri(__name__, actors={
    'experiment': MyExperiment,
}, managed_instruments={
    'mc': MockMotionController,
    'power_meter': MockSimpleDetector,
})

app.start()
```   

Because we define the `sequence` function on `SimpleScan`, we can specify
exactly how data is collected. This is useful if we need to do something
very unusual&mdash;for instance by iteratively refining the resolution of the experiment as 
we collect data. Typically, we only want to sample from our configuration space using
`scan`.

![Configuration Space and Iteration Strategies](/diagram/Configuration-Space-Diagram-v2020-1-12.svg)

This decoupling makes it simple and straightforward to adjust our experiment in 
the future, makes them more understandable years later, and allows us to spend less
time writing reusable DAQ code and more time collecting and understanding our data.

## Simple Asynchronous Programming   

Earlier when I laid out the pessimistic case for leaving LabView, I mentioned the 
necessity for some level of asynchronous programming, particularly so that we can
efficiently configure and move many axes or pieces of hardware above at one. Concurrent
programming is frustrating though, so DAQuiri hides the details for the most 
common use cases.

If we look closely at the `sequence` function we can see how this works

```python
if self.mode == SimpleScanMode.MOVE_THEN_MEASURE:
    yield motions
    yield daq
else:
    yield motions + daq
```

What are `motions` and `daq` exactly? Based on how we constructed them&mdash;by calling
`mc.stages[0].write(...)` and `power_meter.device.read()`&mdash;it might seem like they 
are they contain the location we moved to and the value we read respectively. Instead,
they just contain a description of what we want to do which we pass to the
`DAQuiri` runtime with `yield`. 

This has a lot of advantages. By passing several things at once, we indicate we want
to perform several steps in parallel before continuing only after each has finished.
Alternatively, we can break an DAQ sequence into atomic parts before continuing. Don't
worry though. If you need to do anything very complicated, you can opt out of this
inverted model and talk to the wrapped axes directly.

At its core, this is a lot like the declarative pattern for UI generation we looked at 
above in `extra-qt` and [React](https://reactjs.org). That's why I call `DAQuiri` a
declarative framework for DAQ. If you find this interesting, want to use or 
contribute to the project, or have strong opinions one way or the other that you 
want to share, get in touch! 
 

<h1 id="anchor-notes">Technical Notes, References, and Links</h1>

1. LabView is subject to data races and other race conditions. 
   I have been bitten by this many times before, usually in ways that cause 
   data loss. Unfortunately, even programs that look like they use the LabView 
   concurrency model safely often call library code in C or C++ and flunk one 
   part of the **concurrency unholy trinity**:
      
      1. **Concurrent access to shared state**: implicit in LabView programs, often globals
         or state in external dependencies
      2. **At least one write to shared state**: unfortunately always possible in LabView 
      3. **Execution order not guaranteed** (always the case in LabView for parallel blocks)

   LabView [does](https://knowledge.ni.com/KnowledgeArticleDetails?id=kA00Z000000kFGfSAM&l=en-US) 
   [offer](https://knowledge.ni.com/KnowledgeArticleDetails?id=kA00Z000000P7OfSAK&l=en-US) 
   [tools](https://knowledge.ni.com/KnowledgeArticleDetails?id=kA00Z000000kFGkSAM&l=en-US) 
   to prevent these problems, but seems to treat them as an advanced feature while making 
   it trivial for beginners to create the problems they are intended to solve. Additionally,
   LabView lets you sequence blocks by creating artificial dependencies between them with
   truncated wires which is an insane and opaque kludge.
   
   As a consequence, it is extremely hard to be convinced that any code you write in LabView
   isn't violating the execution order criterion: in LabView, the existence of two blocks 
   with local use *anywhere* in a VI or the existence of two global uses *anywhere* in your 
   entire program (practically the only use for globals!) may cause undetermined behavior,
   your code might even work 90% of the time or more&mdash;enough for you to be convinced of its
   correctness and use it to collect all your data for a decade.
   There's no bit of syntax that warns you the code could be dangerous, *all* LabView code
   is inherently dangerous in this manner because there's no syntax denoting code that is
   safe to run in parallel.
  
2. There are actually a lot of nice projects for interfacing with scientific hardware in
   Python and in other languages. I would recommend looking at least at,
      
      1. [PyMeasure](https://pymeasure.readthedocs.io/en/latest/)
      2. Your hardware manufacturers driver's page
      3. [InstrumentKit](https://github.com/Galvant/InstrumentKit)
      4. [Python IVI](https://github.com/python-ivi/python-ivi)
      
   probably in that order. It's unfortunate that there's already fragmentation here, but
   that had to be expected and thankfully providing uniform interfaces around these 
   utilities is straightforward, which is why `DAQuiri` provides the axis abstraction.
   
3. Some other major graphical dataflow programming languages I think it's valuable 
   to point out are
      
      1. Spreadsheets, especially [Excel](https://products.office.com/en-us/excel) 
         and [Google Sheets](https://sheets.google.com)
      2. [Luna Lang](https://luna-lang.org)
      3. [Node-RED](https://github.com/node-red/node-red/)
      4. [Slang](https://bitspark.de/slang/)
      5. And *many* others especially in the IoT and embedded markets
   
   I'll note that graphical programming languages succeed less as general
   purpose programming languages but are popular as domain specific language (DSL).
   This might be because at a sufficiently abstract level, the relevant datatypes
   for a domain are constrained: plugging a database column into a chart
   can be made meaningful in essentially a single way up to presentational decisions.
   These constraints on the meaning of data also alleviate some of the problems I've 
   discussed above in understanding problems existing graphical code. This is also a 
   factor in LabView's continued success as a DSL for hardware, but I don't believe 
   the primitives expressed are not the right ones for science, or for most hardware 
   tasks.
   
   I'll reiterate also that essentially none of these options offer the unnecessary
   visual noise of letting you route wires. Luna and Node-RED offer essentially no 
   choice about wire routing, using straight lines and splines respectively. They both
   effectively enforce left-to-right diagramming and thereby circumvent some complaints
   I voice with LabView above. Slang is a little more complicated but is still
   much more constrained than LabView.
   
   To a degree, these languages choices enforce logic being local in the diagram and
   therefore remove some of the necessity for route labeling. They nevertheless
   have labeled nodes, very few arguments/returns out of nodes, and operate
   with more abstract types. This helps provide the context that better, enforced 
   labels would give in LabView.
   
4. LabView isn't a high level language despite all its claims. It has some high level 
   support for particular use cases: especially when it comes to interfacing with
   the hardware National Instruments is happy to gouge you for.
   
   As a general purpose language though it has decidedly shaky high-level abstractions.
   Take the case of error handling. LabView's error model boils down effectively to 
   this primitive type
   
   ```haskell
   type Result = Ok | Error<number, string>
   ```
   
   worse than this, it requires you to carry the bool around indicating whether you are in
   the `Ok` or the `Error` state. Contrast this with another low-level language like Rust
   
   ```rust
   enum Result<T, E> {
       Ok(T),
       Err(E),
   }
   ```
   
   Here the boolean actually *is* implicit, you don't have to carry it around explicitly. 
   Additionally, you can stuff any type into the `Ok` and `Error` cases of the `Result` 
   type! This isn't a minor grievance: by wrapping the return values of a function that 
   may error in a `Result`, we make access to any data invalidated by the failure 
   impossible: access to the `T` value isn't possible if we returned `Err(...)`. 
   This is a much stronger contract than is possible in LabView:    
   
   <img src="/diagram/error-labview.png" with="400px" />
   
   There's nothing stopping us from accessing the values on the pink and green wires,
   we could just throw the error away if we wanted. I guess that's handling the error!
   
5. Graphical programming languages often break version control, but LabView breaks
   version control *the worst*. Thankfully, LabView's graphical diff actually is 
   pretty good.

6. Polymorphism in LabView is decidedly poor. Polymorphism of built in functions works
   relatively well but the story more or less stops there. Classes are clunky, and 
   National Instruments' [own website glibly 
   declares](http://www.ni.com/product-documentation/3573/en/) LabView has no need 
   for destructors, as though the only cleanup one can imagine doing is to 
   free memory on the heap.
   
   One of my largest gripes is that LabView has no *data* polymorphism or inheritance,
   this encourages the kind of copy-paste repetition of data definitions that lead to
   problems like those I described at the beginning. 

   Even in C, we can effectively get struct inheritance by kludging C's promise of
   struct layout in memory:
   
   ```C
   typedef struct {
       int motor_position;
       char motor_name[MAX_NAME_LENGTH];
   } Motor;
   
   typedef struct {
      Motor motor;
      int left_limit;
      int right_limit;
   } LimitedMotor;

   /*         Motor           LimitedMotor      Stack  
    *  +----------------+  +----------------+     
    *  | motor_position |  | motor_position |     |
    *  +----------------+  +----------------+     |
    *  | motor_name     |  | motor_name     |     |
    *  +----------------+  +----------------+     |
    *                      | left_limit     |     |
    *                      +----------------+     |
    *                      | right_limit    |     |
    *                      +----------------+     V
    */
   ```
   
   Now, if we add fields to `Motor`, they get added to `LimitedMotor` too.

<figure>
  <img src="/diagram/mock-vi-structure.png" width="450px" />
  <figcaption>Relatively simple VI with well named sub-VIs.</figcaption>
</figure>

I've actually been pretty generous here, compared to the LabView code I've worked with 
in the wild: the sub-VIs have reasonable names though LabView is happy to let me leave
the generic sub-VI logo in place, and the wires aren't absurd.
  
It's hard to make a perfect transliteration of this, but the closest thing
to do is to nest function calls (leaving aside the multiple calls to the nested
functions)

```python
move(
  (r_theta_phi_to_x(get_current_coordinates()), 
   r_theta_phi_to_y(get_current_coordinates()),
   r_theta_phi_to_z(get_current_coordinates())),
  (lookup_application_motors(get_current_application())),
  (lookup_application_settings(get_current_application())),
)
```

If I checked in code like this regularly colleagues might rightfully think I 
was a psychopath or worse, and it's not because of repeated calls to 
`get_current_coordinates` or `get_current_application`. Nesting lots of 
function calls obscures meaning because the data that connects the return 
to the argument of the outer function is anonymous and unlabeled,
if the function names were shorter or worse as might reasonably be 
expected in real world code, comprehensibility is severely reduced.

Compare instead

```python
spherical_coordinates = get_current_coordinates()
x = r_theta_phi_to_x(spherical_coordinates)
y = r_theta_phi_to_y(spherical_coordinates)
z = r_theta_phi_to_z(spherical_coordinates)

app = get_current_application
active_motors = lookup_application_motors(app)
active_motor_settings = lookup_application_settings(app)

move([x, y, z], active_motors, active_motor_settings)
```

