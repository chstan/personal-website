---

$$
\begin{aligned}
\text{minimize:} \quad & f(x) \\
\text{subject to:} \quad & x \in A
\end{aligned}
$$

$f, A$ convex (in their respective meanings)

---

### Why bother with C optimization?

Convex and spectral optimization can be done globally

Convex is simpler

---

### Why bother with C optimization?

- Linear programming
- Least squares
- Regularizations of many important problems
- **Controls (autonomous vehicles, drones, rockets)**

---

### Solving the general problem

Weirdly simple solutions exist

(even without differentiability)

(but this one requires something like it)

---

### Subgradient Iteration

Idea is to follow the slope of the function down...

...in a "generous" enough interpretation of "slope" and "down"

---

### Subgradient

Even if a function isn't differentiable, it can be subdifferentiable

<img src="/img/subdifferential.png" alt="Subgradients of a non-differentiable convex function" style="width: 80%" />

---

### Optimizing

$$
x^{(k+1)} = x^{(k)} - \alpha_k g^{(k)}
$$

$g$ can be any subgradient

Requires approximately $\left(\frac{R G}{\epsilon}\right)^2$ steps

---

### Optimizing

<img src="/img/descent.png" alt="Subgradient iteration objective value over iterations" style="width: 80%" />

Not descent!

---

### Symbolic subdifferentiation

How do we find these things?

```clojure
(subdifferential [:abs :x] {:x 0})
```

$$
\Downarrow
$$

```clojure
[{:range [-1 1]}]
```

---

### Subgradient Rules

For expressions made up of pieces with computable subgradients, we can use

- Supremum
- Expectation
- Chain rule (much like the calculus one)
- Duality
- \+ many others

---

### Disciplined Convex Programming

Can use similar methods to study the curvature of functions

<img src="/img/dcp.png" alt="Disciplined convex programming composition rules" style="width: 80%" />

---

### Disciplined Convex Programming

CVX and others are compilers for the grammar of convex problems

Their machine ops are high level algorithms,

SOCP solver runs

---

### Disciplined Convex Programming

Targets are drones and embedded systems,

but also distributed systems like Spark + Kafka
