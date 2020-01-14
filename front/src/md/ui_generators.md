# UI Generators and Experiment Automation


## The Symmetry Space of Equivalent Programs

To try to understand why LabView programming sometimes feels burdensome,
we will restrict ourselves to talking about programs that turn input data
into output data: so called *pure* computations or programs. Although it rarely
seems it, this is the meat programming tasks. Even more usefully, we can all
agree on the equivalence of pure computations across environments and languages:
all we have to do is stuff data in and see what comes out.

To be concrete we will consider a LabView `.vi` which accepts a 

If we restrict ourselves to considering a well behaved class of programs-- 
those that deterministically transform input data into output data--we can gain
some insight into why LabView programming feels burdensome. Let's take a straightforward 
calculation, for instance to calculate the last 10 digits of $\sum_{n=1}^{1000}n^{n}$.

In LabView, proceeding literally and not factoring out UI elements, we might write:

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
might be a matter of taste, and I won't broach this topic. I want us
to think about the symmetries of these programs, or more concretely, 
the different ways of writing programs that are not only functionally 
but syntactically equivalent to these.

In the Python code, more or less the only option if we want to retain 
the coarse structure of the computation is to rename variables: moving the
symbols around changes the meaning of the program dramatically, or
makes it no longer a valid program. In the version with a function,
we can also permute the arguments, but we have only two choices there,
either `n` comes first or `k_last_digits` does.

The symmetry space of equivalent LabView programs is much larger: we could 
label or relabel any of the wires, and the program is *exactly equivalent*
under any deformation of the wires.   

A wire represents **anonymous data** and anonymous data is **dangerous**.

LabView is a difficult ecosystem to escape in science

    Hardware lock
    Momentum lock/legacy
    Driver lock
    Appearance of being simpler
    
In reality LabView is a poor choice for data acquisition tasks in science

    Programs of any meaningful size are more complex than in text
        Text forces meaningful labels on data and their transformations
        
        Anonymous functions are discouraged -> even more insane to have anonymous data
        
        The symmetry space of equivalent programs in LabView is much larger:
            continuous deformations of code inside one syntactic unit (VI in LabView
            or function in another language)
            
            Text-based languages admit only discrete transformations, and many
            discrete transformations of the code are inequivalent: 
            this is good: there is less noise to be read
            
        The execution logic is more apparent in text as the execution flow inside a 
        syntactic block always flows left to right and downward.
        
        In LabView, wires can run in any direction, and while this is discouraged by the
        availability of various contructs: shift registers, scope (sequence) locals
        the default is still towards 
        
        A response often heard here is that this is fundamental to the asynchronous 
        programming model
        
    Nevertheless, LabView as a graphical tool has merits:
        In addition to being tightly coupled into the NI ecosystem,
        LabView by virtue of its graphical programming model provided the appropriate
        mental model for connecting UI to data, and was forced as a tool to provide a 
        convincing and mature UI generation story.
        
        There's an assymetry here between fundamental shortcomings and those that can
        be shored up by better tooling and support software: LabView code is synonymous 
        with its ecosystem, its IDE, and its graphical model: the issues I've raised above
        are not going to go away unless National Instruments provides a textual interface
        to its code, or native FFI to a textual language. The latter case is likely very
        difficult because of the many data types expressing VI and UI element state and their
        properties.
        
        Outside the LabView ecosystem, the question is whether we can match the 
        expressive power of LabView for binding data to UI and for interfacing with 
        hardware. I will argue that many of the worst aspects of UI programming can be 
        circumvented, and that better high level primitives for the type of application
        programming required in science can be found outside the LabView ecosystem. 
            

![Configuration Space and Iteration Strategies](/diagram/Configuration-Space-Diagram-v2020-1-12.svg)

Test
