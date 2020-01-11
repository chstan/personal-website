# Cryogenic Magnetic Susceptibility Measurement

Physics 107 gives physics undergraduates the opportunity to design and conduct an experiment using liquid helium, and while using the helium isn't required, just about any sufficiently sophisticated low temperature experiment is fair game for the class.

Of course, it's probably not feasible to build a SQUID magnetometer or to study topological defects in the provided cryostats in 10 weeks, but tackling a problem that seems just a little bit too challenging is half the fun of the class. When I took the course in Spring quarter of my junior year, our group set out to measure magnetic phase transitions in gadolinium chloride (GdCl<sub>3</sub>) and dysprosium.

## Magnetic Phase Transitions

Magnetic phase transitions are pretty common at low temperatures. Some materials, particularly those which exist as heterogenous mixtures of structured domains exhibit many phase transitions that can be caused by impurities in and even the relative alignment of these domains. Measuring the qualitative aspects of these transitions as well as their temperature can tell us about the quantum nature of a material and allow us to better predict how the material will behave in other experiments, not to mention engineering applications that exist because of these different phases.

These phase transitions can be just as abrupt and as violent in their reordering of the microstates of the material as the more familiar phenomena of melting and boiling. Just above the **Curie temperature** $T_c$, which denotes the phase transition between ferromagnetism and paramagnetism, the magnetic susceptibility $\chi$ diverges according to the Curie-Weiss law

$$ 
\chi = \frac{C}{T-T_c}. 
$$

Our experiment exploits this property of the ferromagnetic-paramagnetic phase transition in order to measure $T_c$. By finding poles in $\chi(T)$, we can see direct evidence for this and other phase transitions, for which analogous laws hold.

## Our Experiment

Our apparatus consisted basically of a pair of coaxial solenoids. The larger outer solenoid provides an adjustable strength AC magnetic field which surrounds the second, smaller solenoid and the contained sample. Sitting inside the smaller solenoid, the sample is exposed to a magnetic field and responds by changing the field due to forced alignment of the sample's domains. This change in field can be picked up by the second solenoid, which is carefully wound so that it has minimal response to the driving field.

Because we need to take data over a wide range of temperatures in order to find and accurately measure the temperatures of poles in the susceptibility, our sample was mounted on a sapphire rod providing thermal contact to a Nichrome heating element which allowed us to regulate and manipulate the sample temperature via PID, even while the entire experiment was cooled by vapors from a liquid helium bath.

## Results

We observed several phase transitions in addition to the ones that we expected to observe. Although for our dysprosium sample equipment damage prevented us from measuring accurate temperatures, qualitatively we were able to see the Neel point as well as the Curie point. gadolinium chloride, we were able to observe magnetic phase transitions near 2 K and near 9 K, suggesting anti-ferromagnetic impurities in our sample. If we had the time to calibrate our experiment further, it might have been possible to measure the characteristic size of these impurities and their distribution by measuring the precise temperature of this transition and its width.

Below are some of our results for dysprosium, for additional information please consult our [writeup](/pdf/curie_paper.pdf).

#### Dysprosium AC Susceptibility
<img src="/img/dys_chi.png" style="width: 550px;"/>

The Neel point is visible in this plot of the AC susceptibility in dysprosium, as well as a plateau just above the Curie point. The literature value for the Neel point is depicted by a dashed line just below 180 K.

#### Dysprosium Inverse AC Susceptibility
<img src="/img/dys_inv.png" style="width: 550px;"/>

Clean inverse linear law for the AC susceptibility at a known phase transition.
