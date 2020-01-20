# Collecting ARPES Data from Scienta Analyzers in Python

<div class="head-note">
  <p>
    <strong>Note:</strong>
    This is a short tutorial on
    <ol>
      <li>Writing Idiomatic Python that interfaces with C in a sane way</li>
      <li>Writing drivers around scientific hardware</li>
    </ol>
    It centers around building a pragmatic interface to 
    <a href="https://www.scientaomicron.com/en">Scienta Omicron's</a> 
    <a href="ftp://ftp.scienta.se/SES/SESWrapper/">SES Wrapper</a> which can be 
    used to configure and collect ARPES spectra from hemispherical electron analyzers.
  </p>
  <p>
    Some of the design choices suggested by this post are influenced by modern 
    idiomatic Python, but also by easy compatibility with 
    <a href="https://github.com/chstan/daquiri"><code>DAQuiri</code></a>. 
  </p>
</div>

# Implementing Scientific Hardware Drivers in Python

More and more scientific hardware manufacturers are distributing drivers for their
instruments in Python and other popular languages, in addition to prebuilt libraries
for [National Instruments' LabView](/writing/ui_generators). At the bare minimum,
with a few emails you will be able to get your hands on a shared libray (`.dll`) that
provides a C interface because this is what the LabView drivers often use internally.

Like it or not, writing DAQ software in Python often requires working with these shared
libraries because they are a common ground interface to hardware that makes few assumptions
about client code like your DAQ software.

Interfacing with these libraries can be painful, but it doesn't have to be that 
way intrinsically. Let's look at how we can use a few tools including 
[CFFI](https://cffi.readthedocs.io/en/latest/) and 
[dataclasses](https://docs.python.org/3/library/dataclasses.html) to make an idiomatic
interface with Scienta's shared library for hemispherical electron analyzers: SES Wrapper.

Code for this example is [available here](https://github.com/chstan/pyseswrapper).
I don't have an analyzer on hand, so some modifications might be required, but this 
should generally provide a good idea of how to proceed with FFI to scientific hardware.
If anyone uses this code to actually work with an analyzer, feel free to issue a pull request
amending the code and I will put the module on PyPI.

## Generating the Python Interface with CFFI

Because Scienta provides header files  (`.h`) specifying the external interface of 
their shared library, CFFI can generate interface functions for us:

```python
from cffi import FFI
headers_path = Path(__file__).parent / 'headers' / 'seswrapper.h'

ffi = FFI()

with open(str(headers_path)) as f:
    ffi.cdef(f.read())

dll = ffi.dlopen('/path/to/the/seswrapper.dll')
```

This is already very nice, since we can load the DLL and proceed to interface with
the analyzer. Doing so is still not convenient though, because

1. SES Wrapper uses the C-structs `DetectorInfo`, `DetectorRegion`, and `AnalyzerRegion`
   which manage some configuration on the analyzer and CCD. Although we can use the wrappers
   generated for us by CFFI&mdash;and this works well with primitive types&mdash;it becomes
   clunky with more complicated structures or with internal pointers. 
   
   Ideally we would like to be able to transparently translate between a Python dataclass
   and the C-interface, which is also beneficial because `DAQuiri` has UI generation tools
   for dataclasses that would allow us to build a user interface for our analyzer.
   
2. The C-interface to the analyzer is not very conveniently organized and has only
   low level primitives for interfacing with the hardware. Many parts of the interface
   work with pointers to manage returning several values or returning arrays of data. 
   This is a necessary pattern in C that we would like to abstract away as neatly as possible.

We will look at these two problems and their solutions in detail.

## Bridging `struct`s to dataclasses

Bridging the CFFI struct interface to Python dataclasses isn't just about the convenience 
afforded for nested data structures or providing more Pythonic names. The C type system 
is much more limited than Python's type system. As a result types we use in C 
can correspond to many different types in Python with different meanings, and vice versa.

For instance, `int` in Python might map onto any of `unsigned char`, `unsigned long`, `int`, 
or any number of other types depending on what compromises or optimizations the C code has 
opted to make. Meanwhile, `bool` and `str` in Python also map onto `unsigned char` in 
certain contexts.

Let's look at a concrete example. In the SES Wrapper header files we can find the 
`DetectorRegion` struct, describing the acquisition settings for the CCD that looks at the
analyzer's phosphor readout screen.

```c
#define _bool unsigned char

typedef struct {
  int firstXChannel_;
  int lastXChannel_;
  int firstYChannel_;
  int lastYChannel_;
  int slices_;
  _bool adcMode_;
} DetectorRegion;
```  

We would prefer in Python to access this via the dataclass

```python
@dataclass
class DetectorRegion:
    first_x_channel: int = 0
    last_x_channel: int = 800
    first_y_channel: int = 0
    last_y_channel: int = 600

    n_slices: int = 1

    is_adc_mode: bool = False
```

This is better because the types are more appropriate, the names are more is 
more conventional in Python, and there are reasonable-ish defaults on the data.
To accomplish this translation, we could write the dataclasses by hand, adding on
member functions to allow us to populate the `DetectorRegion` via the struct
or vice versa:

```python
class DetectorRegion:
    ... data here

    def from_c(self, p_struct):
        self.first_x_channel = p_struct.firstXChannel_
        self.first_y_channel = p_struct.firstYChannel_
        self.last_x_channel = p_struct.lastXChannel_
        self.last_y_channel = p_struct.lastYChannel_
        self.n_slices = p_struct.slices_
        self.is_adc_mode = bool(p_struct.adcMode_)

    def into_c(self, ffi):
        p_struct = ffi.new('struct DetectorRegion *')
        p_struct.firstXChannel_ = self.first_x_channel
        p_struct.firstYChannel_ = self.first_x_channel
        p_struct.lastXChannel_ = self.last_y_channel
        p_struct.lastYChannel_ = self.last_y_channel
        p_struct.slices_ = self.n_slices
        p_struct.adcMode_ = 1 if self.is_adc_mode else 0

        return p_struct
``` 

This works just fine for our purposes. If boilerplate isn't your thing, there's a 
section below about automating the generation of these Python dataclasses, but we don't
need it to finish our discussion of FFI.  

## Wrapping the low-level FFI interface

### Very Brief Introduction to CFFI

CFFI is the excellent alternative to `ctypes` provided out of the PyPy project. Giving
it a full overview here is outside of the scope, so I'll discuss just as much as is
required to follow along and stay away from parts of CFFI that aren't strictly necessary.

#### Generating FFI functions from a C header

CFFI has the ability to read C header files and generate Python functions that are 
direct translations of the C code. Pointers in C have no direct analog in Python, nor 
do C structures and unions, so CFFI has a wrapper type that provides convenience features
to manage raw memory and interface into Python. Here's how it works for pointers:

```python
p_double = ffi.new('double *')  # <- make a new pointer to a double "on the heap"
p_double[0] = 3.14159 # <- write into the double *
p_double[0] # access out of the double * 
```

And for structs

```python
p_struct = ffi.new('struct MyStruct *')
p_struct.x = 1.
p_struct.y = -1
p_struct.z = 0.

p_struct.x # -> reads 1.
```

These can be passed transparently as though they were pointers to the corresponding types
through the functions CFFI generates. When working with `numpy`, we can use CFFI's
`cast` to turn an array into a C pointer to the front of the array. 

```python
arr = np.zeros(shape=(2000,), dtype=np.double)
p_double_arr = ffi.cast('double *', arr.ctypes.data)
lib.writes_double_array(p_double_arr) 
```

Be careful not to be bitten by column and row order!

### Using CFFI to Interface with SES Wrapper

Now that we have types to populate and work with, we can work on cleaning up the low level
interface. Many shared libraries use the return value of the C function to indicate 
whether an error occurred, and return values by writing into pointers supplied by the
code calling the function.

Python handles errors differently, by `raise`ing `Exception`s, which give more 
flexibility for describing what went wrong, and also provide control flow mechanisms
for dealing with errors via `try, catch, finally`. Imagine we have a C function 
`writes_five` defined like so

```c
int __stdcall writes_five(int raises_positive, double *return_value) {
    if (raises_positive > 0) {
        return 1; // BAD INPUT!
    }
    *return_value = 5.0;
    return 0; // Everything's kosher here.
}
```

Using a CFFI interface, we might wrap this in the following interface

```python
lib = ffi.dlopen('...')

def writes_five(input_number: int) -> float:
    p_double = ffi.new('double *')
    code = lib.writes_five(input_number, p_double)
    if code != 0:
        raise Exception(f'CFFI Exception, function writes_five returned error code {code}')

    return p_double[0]
``` 

Because every function in the shared library uses this contract to indicate errors, 
we would end up writing a lot of functions like this one, all with the same conditional
`raise`. Instead let's write a decorator that attaches this logic for us.

```python
from functools import wraps

def wrap_stdcall_raise(c_wrapper_func):
    @wraps(c_wrapper_func)
    def wrapper(*args, **kwargs):
        return_value = f(*args, **kwargs)
        
        if isinstance(return_value, int):
            return_code = return_value
            return_value = None
        else:
            return_code, return_value = return_value
        
        if return_code != 0:
            raise Exception(f'FFI Error Code {return_code} in {f.__name__}')
        
        return return_value
    
    return wrapper

@wrap_stdcall_raise
def writes_five(input_number: int) -> float:
    p_double = ffi.new('double *')
    code = lib.writes_five(input_number, p_double)
    return code, p_double[0]

@wrap_stdcall_raise
def no_return(argument, another_argument):
    return lib.no_return(argument, another_argument)
```

Now, by returning the code and the value it will automatically be turned into 
an exception when appropriate. We can even return just the code if the function
doesn't return anything. This is a small change, but an API built around the library
at this level in every way looks and acts like Python code. It uses `Exception`s to 
indicate improper behavior and accepts and returns appropriate Python types.

We can do better though by building out a high level interface to the interface.

## A High-Level Interface to Hemispherical Analyzers

### Managing State with Properties

Consider the code below that directly interfaces with the SES Wrapper

```python
@wrap_stdcall_raise
def get_detector_info() -> DetectorInfo:
    p_detector_info = ffi.new('struct DetectorInfo *')
    code = lib.WRP_GetDetectorInfo(p_detector_info)
    detector_info = DetectorInfo()
    detector_info.from_c(p_detector_info)
    return code, detector_info

@wrap_stdcall_raise
def set_detector_info(info: DetectorInfo):
    p_detector_info = info.into_c(ffi)
    return lib.WRP_SetDetectorInfo(p_detector_info)
``` 

This does what we want but it is not idiomatic Python. Python prefers properties to manage
access to values that cannot be get or set directly with raw member access. Let's write
a small class that wraps this interface and makes it feel more natural in Python

```python
class DA30:
    @property
    def detector_info(self) -> DetectorInfo:
        return get_detector_info()
    
    @detector_info.setter
    def detector_info(self, info: DetectorInfo):
        set_detector_info(info)

...

analyzer = DA30()

analyzer.detector_info = DetectorInfo(...)
```

It's worth thinking about what happens when we now call this final line. The property
setter calls `set_detector_info` internally which accepts our dataclass instance.
The dataclass instance is translated into a C struct on the heap and passed through
CFFI's interface layer to the shared library. The shared library then configures the
CCD on our hemisphere for us, returning a nonzero status code if anything went wrong.
Finally, `@wrap_stdcall_raise` intercepts and suppresses the extraneous status code
and raises a Python exception if anything went amiss.

## Building out Higher Level Functionality to Our Driver

Everything we have done so far sets us up for an understandable and maintainable
Python interface to our shared library instrument driver, and we can take it as a
template for this process in general:

1. Understand the header file supplied with the shared library, including the exported
   structs and functions
2. Determine appropriate data structures corresponding to the C structures. These 
   might be builtin types, or dataclasses representing concepts from the shared library.
   Simple is better here, and if we agree more or less with the shared library, 
   we can even code generate these.
3. Feed the header to CFFI to allow access to the exported functions.
4. Wrap the exported functions in more or less equivalent Python functions. Maintain
   fairly close fidelity to the C interface here, this makes it more straightforward
   to adapt to changes in the underlying shared library.
5. Use Python conventions and idioms where possible:
     
     1. Avoid mutating arguments, prefer returning tuples and native data structures
     2. Translate status codes to `Exception`s. Do this in some resuable way
     3. Wrap getters and setters in properties
     4. Annotate functions with types
     
To go further, we provide higher level abstractions over the shared library. Let's 
consider the case of acquiring an ARPES spectrum. The SES Wrapper documentation provides
this sample code:
  
```C
WRP_InitAcquisition(false, true);

int *channels, *size;
*channels = 0;
*size = sizeof(int)

WRP_GetAcquiredDataInteger("acq_channels", 0, channels, size);
double *spectrum = new double[channels];

for (int iterations = 0; iterations < 10; iterations++) {
  WRP_StartAcquisition();
  WRP_WaitForRegionReady(-1);
  WRP_ContinueAcquisition();
}

WRP_GetAcquiredDataVectorDouble("acq_spectrum", 0, spectrum, channels);
```

A direct translation following the above is cumbersome. A final improvement to our 
driver is to export functions that follow the appropriate C call order but that 
perform the actions we reasonably care about in our experiment: in this case,
collecting spectra.

The code we now write is a client of the direct translation we built before.

```python

class LowLevelWrapper:
    lib = ffi.dlopen('...')

    @wrap_stdcall_raise
    def get_spectrum(self, n_channels: int) -> np.ndarray:
        data = np.zeros(shape=(n_channels,), dtype=np.double)
        p_n_channels = ffi.new('int *')
        p_n_channels[0] = n_channels
        p_spectrum = ffi.cast('double *', data.ctypes.data)
        code = self.lib.WRP_GetAcquiredDataVectorDouble(
            b'acq_spectrum', 0, p_spectrum, p_n_channels)
        return code, data 

class DA30:
    ...
    
    def integrate_frame(self):
        self.wrapper.start_acquisition()
        self.wrapper.block_on_region()
        self.wrapper.continue_acquisition()

    def acquire_spectrum(self, n_iterations=1) -> np.ndarray:
        self.wrapper.init_acquisition()
        n_channels_for_acquisition = self.wrapper.get_n_channels()
        
        for _ in range(n_iterations): self.integrate_frame()

        raw_spectrum = self.wrapper.get_spectrum(n_channels_for_acquisition)
        return raw_spectrum.reshape(...)
```

In this way, we can provide whatever high level functions we feel are appropriate 
to the task. I'll wrap up here, and remind of the link to the full (untested) code
[on GitHub](https://github.com/chstan/pyseswrapper).

These principles apply outside the strict domain of scientific hardware and even 
outside Python. Whenever we form an interface between one problem domain and another,
like working across languages, execution platforms, or application domains, it is wise
to respect and ensure the idioms appropriate on each side of the fence. Additionally,
an interface composed of two parts: one a direct, low-level translation and another at
a higher level makes writing code that must use the interface productive and well 
insulated from changing requirements and circumstances on the other side.


## Appendix: Generating Dataclasses from a Spec

The dataclasses we described above have a few small drawbacks. They are fragile to Scienta 
changing the interface, and we can probably convince ourselves that we don't need to 
write all of that boilerplate code ourselves. For longer structs, all this 
boilerplate provides the opportunity for us to make errors.
 
Things also get more complicated as we introduce strings, fixed size arrays, and more 
types. At heart, all we are doing is mapping

```text
+-------------+         +--------------+
| ctype: str  |   <==>  | pyname: str  |
| cname: str  |   <==>  | pytype: type |
+ ------------+         +--------------+
``` 

Thankfully, the dataclasses module in Python has an interface that allows us to make
dataclasses on the fly with `make_dataclass`. We can describe how each member of the struct
maps onto a Python object by describing it as a field

```python
@dataclass
class StructField:
    pyname: str
    pytype: type
    
    cname: str
    ctype: str
    
    pydefault: Any = None
```

With a collection of 

```python
def wrap_struct_dataclass(struct_name, fields, name=None):
    """
    Works best with primitive types for now
    """

    if name is None:
        name = struct_name

    MAP_FIELDS = { // default mappings
        'int': int,
        'float': float,
        'double': float,
        'char': int,
        'unsigned char': int,
    }

    MAP_PY_DEFAULTS = { // default values for Python 
        int: 0,
        float: 0.,
        bool: False,
        str: '',
    }

    def full_field(f: Union[StructField, Tuple[str, str]]) -> StructField:
        if isinstance(f, StructField):
            return f
        else:
            name, ctype = f
            return StructField(pyname=name, cname=name, ctype=ctype, 
                               pytype=MAP_FIELDS[ctype])

    full_fields = {ff.pyname: ff for ff in [full_field(f) for f in fields]}

    def into_c(self, ffi):
        pointer = ffi.new(f'struct {struct_name} *')
        
        for field_name, field in self._cfields_.items():
            setattr(pointer, field.cname, getattr(self, field.pyname))
        
        return pointer

    def from_c(self, c_pointer):
        # populate self from fields...
        for field_name, field in self._cfields_.items():
            # this might need adjusting if more complex types are required
            setattr(self, field.pyname, field.pytype(
                getattr(c_pointer, field.cname)))

    def unwrap_field(f: StructField):
        return f.pyname, f.pytype, f.pydefault

    return make_dataclass(
        name,
        [[unwrap_field(full_field(f)) for f in fields]],
        namespace={
            'into_c': into_c,
            'from_c': from_c,
            '_cfields_': full_fields,
        })

```

Now the correspondence between our struct and dataclass can be expressed as 

```python
DetectorRegion = wrap_struct_dataclass('DetectorRegion', [
    StructField('first_x_channel', int, 'firstXChannel_', 'int'),
    StructField('last_x_channel', int, 'lastXChannel_', 'int'),
    StructField('first_y_channel', int, 'firstYChannel_', 'int'),
    StructField('last_y_channel', int, 'lastYChannel_', 'int'),
    StructField('n_slices', int, 'slices_', 'int'),
    StructField('is_adc_mode', bool, 'adcMode_', 'unsigned char'),
])
```

If we liked, we could even parse the header and automate the full generation 
of the dataclasses, but, sometimes, explicit is better than implicit anyway.