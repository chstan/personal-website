# Fuzzy Jets

*Model based clustering in jet physics*

Conrad Stansbury, with Benjamin Nachman and Ariel Schwartzman

Honors thesis defense, Stanford University (Varian Physics), May 19, 2015

## About this talk

As an undergraduate I researched with the ATLAS group at SLAC between June 2013 and June 2015. The final project I worked on with Ben Nachman was to apply mixture modeling to finding jets. This method provides interesting new jet and substructure variables in the Monte Carlo events I studied, and this work constituted the basis for my undergraduate thesis and the paper below.

- Paper: L. Mackey, B. Nachman, A. Schwartzman, C. Stansbury, [*Fuzzy Jets*](https://doi.org/10.1007/JHEP06(2016)010), Journal of High Energy Physics (2016).
- The undergraduate thesis (June 2015) is listed on the [papers page](/papers); the PDF is not currently hosted here.

The original talk was an interactive reveal.js slide deck. What follows is the text and figures of those slides, restored from the site's 2015 source. Slide-by-slide animations and the color coding of the equations are not reproduced, and there was no speaker script, so the slides are terse.

---

## Jet Clustering at Hadron Colliders

Bridge between *observables* and physics shortly after particle interaction.

<img src="/img/jet.png" alt="Jet clustering at a hadron collider" style="width: 600px; max-width: 100%;"/>

## Why Jets?

- Explaining Higgs mass
- Hierarchy problem
- Dark matter

#### New particles at TeV scale?

EW heavy final states decay primarily to jets (partons).

Clustering + classifying jets crucial to addressing physics problems.

## Jet Clustering

- determine *like* particles
- data are four-vectors
- distance metrics measure similarity: $d_{ij}$ between particles, and $d_{iB}$ to beam axis

## Kinematics Interlude

Particles are 4-vectors: $\vec{X} \equiv (p_T, \vec{\rho}, E)$

- $p_T \equiv$ momentum perpendicular to beam
- $\vec{\rho} \equiv$ "location" in the calorimeter
- Distance $d_{ij}$ a measure of spatial and momentum closeness

## Sequential Recombination

- repeatedly combine close particles: $d_{ij}$
- stop when close to beam axis: $d_{iB}$

<img src="/img/kt_example.png" alt="kt clustering example" style="height: 320px; max-width: 45%; margin-right: 1rem;"/>
<img src="/img/antikt_example.png" alt="anti-kt clustering example" style="height: 320px; max-width: 45%;"/>

Family of algorithms arising from choice of metrics.

## Other Options for Clustering

- view jet clustering as *unsupervised learning*
- use statistics/ML techniques

**Fuzzy jets** views particles as observations from unknown PDF. PDF specifies jet information.

## Mixture Modeling

$$
p(\vec{X}) = \sum_{j=1}^{k} \pi_j \, \Phi(\vec{X} \mid \vec{\theta}_j)
$$

- $\Phi \equiv$ probability density (kernel)
- $\vec{\theta}_j \equiv$ density shape parameters
- $\vec{X} \equiv$ a sample observation (4-vector)
- $\pi_j \equiv$ component weight prior

<img src="/img/mixture.png" alt="Mixture model example" style="width: 800px; max-width: 100%;"/>

Three jets? Two jets?

## Infrared (IR) Safety

<img src="/img/ir_safe.png" alt="Infrared safety" style="width: 800px; max-width: 100%;"/>

Adding particles with $p_T \rightarrow 0$ should preserve jet structure.

## Collinear (C) Safety

<img src="/img/c_safe.png" alt="Collinear safety" style="width: 800px; max-width: 100%;"/>

Splitting particles should preserve jet structure.

## Likelihood

$$
L(\{p_{T,i}, \rho_i \mid \vec{\theta}\}) = \sum_{i=1}^{m} p_{T,i}^\alpha \sum_{j=1}^{k} \pi_j \, \Phi(\rho_i \mid \vec{\theta}_j)
$$

where $\vec{X} \equiv (p_T, \rho, E)$. Weight by particle $p_T$!

Taking $\alpha = 1$ grants IRC safety: fuzzy jets is IRC safe mixture modeling.

## Fuzzy Event Display

<img src="/img/ed.png" alt="Fuzzy jets event display" style="width: 402px; max-width: 100%;"/>

- Learn structure at differing scales
- Sensitive to different physics processes
- Locations correspond well to classical jets

## Anti-$k_t$ Locations

<img src="/img/ed_antikt.png" alt="Anti-kt event display" style="width: 400px; max-width: 100%;"/>

- Uniform in size
- Predictable kinematics
- Sensitive at a particular scale

## Fuzzy Jet Shapes

<img src="/img/ed_vor.png" alt="Fuzzy jet Voronoi shapes" style="width: 400px; max-width: 100%;"/>

- Defined up to choice of assignment
- Variety of shapes and sizes
- Potentially unbounded areas

## Mass Comparison

Anti-$k_t$ (left) vs. Fuzzy (right).

<img src="/img/m.png" alt="Mass comparison, anti-kt vs fuzzy" style="width: 800px; max-width: 100%;"/>

## Learning W Bosons

<img src="/img/w_ed.png" alt="W boson event display" style="width: 400px; max-width: 48%;"/>
<img src="/img/w_edh.png" alt="W boson event display" style="width: 400px; max-width: 48%;"/>

## Kinematics Takeaways

- Fuzzy jets learn structural features of events
- Learning smaller features hampers kinematics

**Q:** How can we use these properties to our benefit?

**A:** Learned PDF provides variables to study event.

## $\sigma$ and Constructing Variables

- Can include membership probability distributions
- Natural variables depend on choice of kernel, $\Phi$
- Studied mostly isotropic Gaussians: $\Sigma \equiv \text{diag}(\sigma^2, \sigma^2)$

## Leading and Average $\sigma$

Leading $\sigma$ (left) and average $\sigma$ (right).

<img src="/img/sigma.png" alt="Leading and average sigma" style="width: 800px; max-width: 100%;"/>

## Correlations with $\text{m}/p_T$

<img src="/img/sigma_mass_corr.png" alt="Correlation of sigma with m/pT" style="width: 800px; max-width: 100%;"/>

$\sigma$ *is* correlated... ...but...

## Tagging with $\sigma$

<img src="/img/tag.png" alt="Tagging with sigma" style="width: 800px; max-width: 100%;"/>

Powerful for jet tagging!

## Pileup

<img src="/img/pileup.png" alt="Pileup event display" style="width: 800px; max-width: 100%;"/>

## Event Jet + Tower Subtraction

<img src="/img/pileup_corrected.png" alt="Pileup-corrected event display" style="width: 800px; max-width: 100%;"/>

<img src="/img/pileup_histo.png" alt="Pileup correction histograms" style="width: 600px; max-width: 100%;"/>

## Wrap Up

- New class of clustering models for particle physics
- Family parameterized by kernel choice, $\Phi$
- Flexible model capable of learning event structure
- Enhances the discovery potential of the LHC to new particles

## Future Work

- Get maximum information out of fuzzy jets?
- Better cluster initialization?
- Take into account particle correlations?
- Jet by jet grooming?

## Questions?

---

## Backup Slides

### Particle Assignment

<img src="/img/weight_map.png" alt="Particle assignment weight map" style="width: 800px; max-width: 100%;"/>

### Gaussian Update + CLL

<img src="/img/cll.png" alt="Complete log likelihood" style="width: 800px; max-width: 100%;"/>

<img src="/img/gaussian_update.png" alt="Gaussian update step" style="width: 800px; max-width: 100%;"/>

### Sequential Recombination

<img src="/img/seq_recomb_alg.png" alt="Sequential recombination algorithm" style="width: 800px; max-width: 100%;"/>

### Choosing the $p_T$ Cut

$Z' \rightarrow t\bar{t}$ (left) vs. QCD (right).

<img src="/img/pt_cut.png" alt="Choosing the pT cut" style="width: 800px; max-width: 100%;"/>

### EM Algorithm

<img src="/img/em_alg.png" alt="EM algorithm" style="width: 800px; max-width: 100%;"/>

Iterative optimization of the likelihood.

### EM Example

<img src="/img/em_example.png" alt="EM example" style="width: 800px; max-width: 100%;"/>

### $p_T$ Comparison

Anti-$k_t$ (left) vs. Fuzzy (right).

<img src="/img/pt.png" alt="pT comparison, anti-kt vs fuzzy" style="width: 800px; max-width: 100%;"/>

### Pileup

- Another large component of research was understanding and coping with noise
- Principal noise sources at LHC due to additional, unwanted collisions
- A major pain for doing physics!

### Proposed Solutions

- Some techniques promising for removing pileup before clustering
- Methods to remove pileup during/after clustering not applicable!
- Idea: introduce "background" jet during clustering: $p_{ij} \rightarrow \frac{p_{ij}}{\gamma + \sum_k p_{ik}}$
