To run:

- Clone repo
- yarn install
- yarn run
- Browse to http://localhost:3000

Demo for handling a maximum of X concurrent promises in a queue in react.js

By default an array of 100 promises is initialized, each with a delay of `0 < x <= 1000`ms before resolving.
The queue resolves a maximum of 5 promises at any time.

There is also a fail rate (the promise is rejected) of 10%.

TODO: Automatically re-initalize the queue and continue attempting to process until all are successful.
