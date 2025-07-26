# AI Partner Programming Preferences

Here is a list of programming preferences that I would like to be aware of...

* projects that start from scratch are first **proof-of-concept** so although we will need unit tests, it's best to wait until the proof is realistic.
* we will need a way to test the proof of concept, so we need e2e scripts that can be run manually, then possibly automated
* we always use lint and prettier to enforce our coding style
* our projects use npm (or yarn or bun) but whatever we use, there is always an associated `mk` script that runs the npm/yarn/bun commands.  this helps me navigate from typescript, rust, c++ and other languages with a common make-like set of targets.  I will create the `mk` script with targets that you should probably use like this `./mk build test run`.  that way my `mk` script is tested with the package.json run targets.
* versioning is important to our company.  we need to log the version (either to console or rolling file logger) at the start of a new session

###### dpw | 2025.07.26
