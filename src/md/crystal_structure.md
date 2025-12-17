# Making Beautiful Crystal Structure Diagrams

**note:** Here's [a link](/notebooks/crystal_structure_example.ipynb) to an 
IPython notebook with relevant code for the Python portion, including recoloring 
atoms. You'll still need to edit the POV-Ray files manually as I haven't automated 
this part of the process. 

This tutorial teaches you how to use Python and [POV-Ray](https://povray.org) to
make beautiful crystal structure diagrams like these

<div class="column loose">
  <img src="/img/crystal_structure/structure-fenbs2.png" width="400px" />
  <img src="/img/crystal_structure/structure-moire-ws2-wse2.png" width="400px" />
</div>

## What we'll need to get started

The tools we need are

1. Python 3 with the `ase` package (Atomic Simulation Environment) installed
2. POV-Ray

I'll assume you already have Python and ASE installed or are capable of doing this yourself
as there is good documentation elsewhere. Installing POV-ray is a little trickier but 
not difficult. To avoid any sticking points I recommend using a system package manager like
[Chocolately](https://chocolatey.org/) on Windows, [Homebrew](https://brew.sh/) on OS X, 
or your system package manager on Linux. On Windows this looks like

```powershell
PS C:\Users\me> choco install pov-ray
```

That's all!

## Making Crystal Structure Renders with ASE

Here's the rough structure for telling ASE to generate a crystal structure

```python
import ase.io as io
from ase.build import cut
from ase.spacegroup import crystal

a = 9.04
skutterudite = crystal(('Co', 'Sb'),
                       basis=[(0.25, 0.25, 0.25), (0.0, 0.335, 0.158)],
                       spacegroup=204,
                       cellpar=[a, a, a, 90, 90, 90])

# Create a new atoms instance with Co at origo including all atoms on the
# surface of the unit cell
cosb3 = cut(skutterudite, origo=(0.25, 0.25, 0.25), extend=1.01)
```

There are different helpers depending on whether you are trying to make a common 
crystal structure, or need to tell ASE all of the Wyckoff position occupants yourself. You
can find more information for specific use cases at the 
[ASE documentation site](https://wiki.fysik.dtu.dk/ase/).

As another example using the ASE helpers, here's how to make a WS2 crystal

```python
from ase.build import mx2, stack

# thirty by thirty by one unit cells: a nice monolayer
ws2 = mx2('WS2', size=(30, 30, 1))
```
 
## Adjusting atomic site colors

It's easier to adjust the atomic site colors in Python rather than in the POV-Ray
files, because the colors are repeated so many times in the output files.

```python
from ase.data import colors

w_rgb = (44. / 255, 132. / 255, 30. / 255) # kind of greenish
s_rgb = (109. / 255, 193. / 255, 96. / 255) # brighter greenish

# tungsten atomic number is 74 and sulfur is 16
colors.jmol_colors[74] = w_rgb
colors.jmol_colors[16] = s_rgb
colors.cpk_colors[74] = w_rgb
colors.cpk_colors[16] = s_rgb
```

As long as you do this before calling `io.write` you should be good.

## Adding bonds

To add bonds, we need to collect all the desired bond pairs. Here's a simple way to do it
for our $\\text{MX}_2$ example:

```
import numpy as np
from scipy.spatial.distance import pdist, squareform
site_positions = [site.position for site in ws2]
pair_distances = squareform(pdist(np.stack(site_positions)))

bonds = []
for i in range(vs.shape[0]):
    for j in range(i):
        if vs[i, j] < 3: # up to 3 angstrom distance show a bond
            bonds.append((i, j))
```

## Writing the Output File

Now that we have the crystal and the bonds, we just need to output the `.pov` 
file so we can render it with POV-Ray.

You can tune many of these settings and they are pretty self explanatory.
Most important is to adjust the camera angle with `rotation=`.

```python
import ase.io as io
io.write('my_output_file.pov', 
         ws2,
         transparent=True, display=False,
         run_povray=False, camera_type='orthographic',
         canvas_width=1200,
         background=(0, 0, 0, 1.,),
         radii=0.4,
         rotation='0y, 0x', # CAMERA ANGLE: you should adjust this!
         bondlinewidth=0.07,
         bondatoms=bonds)
```

Now, we just need to run POV-Ray on our file. Because our `.pov` file is specified in the
configuration `.ini` file, we just need to tell POV-Ray to use the generated `.ini` file.

```powershell
PS > povray my_output_file.ini 
```

# Full Example

```python
import numpy as np
import ase.io as io
from ase.data import colors
from ase.build import mx2, stack
from scipy.spatial.distance import pdist, squareform

ws2 = mx2('WS2', size=(30, 30, 1))

# Define the atomic bonds to show

# Create nice-looking image using custom colors
colors.jmol_colors[74] = (44. / 255, 132. / 255, 30. / 255) # W
colors.jmol_colors[16] = (109. / 255, 193. / 255, 96. / 255)
colors.cpk_colors[74] = (44. / 255, 132. / 255, 30. / 255) # W
colors.cpk_colors[16] = (109. / 255, 193. / 255, 96. / 255)

site_positions = [site.position for site in ws2]
pair_distances = squareform(pdist(np.stack(site_positions)))

bonds = []
for i in range(vs.shape[0]):
    for j in range(i):
        if vs[i, j] < 3: # up to 3 angstrom distance show a bond
            bonds.append((i, j))

io.write('ws2.pov', ws2,
         transparent=True,
         display=False,
         run_povray=False,
         camera_type='orthographic',
         canvas_width=1200,
         background=(0, 0, 0, 1.,), # weird alpha convention
         radii=0.4,
         rotation='0y,0x',
         bondlinewidth=0.07,
         bondatoms=bonds)
```

and then

```powershell
PS > povray ws2.ini
```

If for some reason you don't have a working `.ini` file, see the section in config 
files below

## Getting Transparency in our POV-Ray Renders

POV-Ray renders our crystal structure from two files, the `.pov` file which
contains the geometry we would like it to render--in our case the lighting, the
atom locations, and all the bonds--and a `.ini` file which has general configuration
for the ray tracer.

To get transparency, useful if you want to put your render in a PowerPoint or overlay
crystal structures for stacked 2D materials diagrams, you need to edit the `.ini`
file so that it contains the line

```editorconfig
Output_Alpha=True
```

Add this line if there's no setting for `Output_Alpha` already or change `False` to 
`True` if it's already in there.

Then, we need to tell POV-Ray to use a transparent background in the scene we want to 
render. The `.pov` file is pretty intimidating, but somewhere near the top you should
find the directive that specifies the background color:

```
background {srgbt <RED, GREEN, BLUE, TRANSPARENCY>}
```

you want to se it so that the value of the transparency channel is 1, like so (make sure
that it says `srgbt`:

```
background {srgbt <0.00, 0.00, 0.00, 1.00>}
```

Now, if you re-run POV-Ray you should have a transparent background!

### Getting High Resolution Renders

The simplest way to get high resolution renders is to adjust the `Width` and `Height` 
directives in the `.ini` file. You will want to make sure you keep the aspect ratio (`Width`/`Height`) the same or else your output will look distorted.

When I tweaking settings I typically use dimensions around 800px because this renders
very quickly on my computer, while for high resolution renders I roughly 4k pixels
on the larger axis of the render. These settings are high enough resolution for
almost any purpose and still render in at most a minute or two on modern hardware,
even with thousands of atomic sites like in the moiré example I showed at the 
beginning of this post.  

### Adjusing Lighting

I don't have any hard and fast rules for making the lighting look right. I tend
to prefer more diffuse lighting and less specular lighting, but enough specular 
lighting to give the spheres of the atoms some apparent texture, especially if they 
are small.

You can adjust these settings in the `.pov` files with the following directives

```
light_source { <2.00, 3.00, 4000.00> color White
  area_light <0.70, 0, 0>, <0, 0.70, 0>, 3, 3
  adaptive 1 jitter }

#declare ase2 = finish {ambient 0.1 brilliance 3 diffuse 1 metallic 
                        specular 0.7 roughness 0.04 reflection 0.15}
#declare ase3 = finish {ambient 0.1 brilliance 3 diffuse 1 metallic 
                        specular 0.7 roughness 0.04 reflection 0.15}
``` 

The most important to play with are the `ase2` and `ase3` textures, as these are
what POV-Ray uses to render the atoms and bonds. On these, try adjusting the
`diffuse`, `specular`, `reflection`, and `ambient` parameters until you're happy with
how it looks. Once you've done this, write down the settings you like somewhere 
so you don't forget them (like I've done here!) and you can use them again in the 
future.

## POV-Ray Config Files

Here's a working POV-Ray config file if ASE isn't outputting one for you:

```
Input_File_Name=ws2.pov
Output_to_File=True
Output_File_Type=N
Output_Alpha=True
; if you adjust Height, and width, you must preserve the ratio
Width=3600
Height=2085.7196307201993
Antialias=True
Antialias_Threshold=0.1
Display=False
Pause_When_Done=True
Verbose=False
```