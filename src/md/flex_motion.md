# Using the National Instruments Motion APIs in Python

<div class="head-note">
  <p>
    <strong>Note:</strong>
    This is part II of a short tutorial on
    <ol>
      <li>Writing Idiomatic Python that interfaces with C in a sane way</li>
      <li>Writing drivers around scientific hardware</li>
    </ol>
    Have a look also at <a href="/writing/pyseswrapper">the previous part</a>.
    
    In this section we explore building pragmatic APIs around National Instruments'
    (now old) motion API: Flex Motion.
  </p>
  <p>
    Subsequently, we will explore how to build an async layer on top, and 
    wrap the whole thing in an EPICS input-output controller (IOC).  
  </p>
</div>

If you haven't already, take a look 
[at the previous part](/writing/pyseswrapper) which covers some basic principles
for writing high level APIs around shared object libraries, and specific patterns
appropriate for scientific computing.

In this section we will look at building an interface between Python and 
National Instruments motion controllers. This will let us explore a few new 
topics including

1. Advantages of static configuration of instrumentation
2. Building asynchronous libraries over plain C shared-libraries with CFFI
3. Implementing an EPICS input-output controller so we can expose 
   our motion resources for outside control, as through DAQuiri.
   
WORK IN PROGRESS
  