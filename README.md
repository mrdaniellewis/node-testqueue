# Test queue

A simple test framework for running async tests in node.

This framework lets you queue up a series of async tests and run them.  It can output the results of the tests to the console, and run a directory of tests.

## Usage

```javascript

// Use the node assert libary for your assertions
var assert = require('assert');
var TestQueue = require('test-queue');

// Create a new queue of tests
var queue = new TestQueue()
	.addTest( function( pass, fail ) {
		// Add a test
		// Call pass or fail to pass or fail
		// If an error is thrown this will automatically call fail
	} )
	.addTest( function( pass, fail ) {
		// Add another test
	} )
	.setup( function() {
		// function run before the tests start
	} )
	.teardown( function() {
		// function run after all the tests have finished whether they pass or fail
	} )
	.on( 'pass', function(name) {
		console.log( name, ' has passed' );
	} )
	.on( 'fail', function( name, e ) {
		console.log( name, ' has failed with error', e );
	} );

// Set the queue up for outputting to the console
TestQueue.toConsole(queue);

// Run the tests
queue.run()
	.then( 
		// Run returns a Promise
		function(stats) {
			console.log( 'All tests passed')
		},
		function(stats) {
			console.log( 'Some tests did\'t pass ');
		}
	);

```

### Constructor

```javascript
var testQueue = new TestQueue(options) 
```

`options.stopOnFail` - Boolean, optional, default = `true`.  Stop running tests if a test fails.

testQueue is an event emitter.

### Events

`pass` A test has passed.  The name of the test is passed as the first argument

`fail` A test has failed.  The name of the test is passed as the first argument and the error message as the second.

`start` Emitted before the tests start.  If the test is a TestQueue the first argument will be the queue name

`finish` Emitted when the tests have finished.  The first argument is the results.  If the test is a TestQueue the second argument will be the queue name.

`info` Can be used to emit general information about what a test is doing.

### Methods

```javascript
testQueue.addTest( name, function(pass,fail){
	// The test goes here
} );
```

`name` - String - The name of the test

`function(pass,fail){}` - Function - The test.  Use the callbacks pass and fail to return the outcome of the test.  Pass an error to fail.

If the function throws an uncaught error this will be caught and the test will be failed.

Returns the `TestQueue` object for chaining.

----

```javascript
testQueue.addTest( name, subTestQueue );
```

`name` - String - The name of the test

`subTestQueue` - TestQueue - A TestQueue.  The sub queue of tests to run.

All events from the subqueue will be emitted by the parent testQueue.

Returns the `TestQueue` object for chaining

----

```javascript
testQueue.setup( function(){
	// Setup tasks
} )
```
The setup function is run before all tests.
Return a Promise object if setup is async.

----

```javascript
testQueue.teardown( function(){
	// Teardown tasks
} )
```
The teardown function is run after all tests have finished
whether they passed or failed.

Return a Promise object if teardown is async.


----

```javascript
testQueue.run()
```

Run the queued tests.

Returns a promise.

The promise will resolve or reject with a object with the properties

* `passed`: number of tests passed
* `failed`: number of tests failed
* `time`: the time in ms the tests took to run

### Static methods

```javascript
TestQueue.toConsole(testQueue)
```

Modifies an existing instance of TestQueue so it outputs to the console
each time a test passes or fails and the statistics when the tests finish.

Output is coloured red and green and indented as appropriate.

----

```javascript
TestQueue.testDirectory( path, options );
```

Given a directory of .js or .node files, requires the file and adds `exports.tests` to a test queue using the file name as the test name. 

`path` - String.  Absolute path to the directory

`options.stripNumber` - Boolean, optional, default = `true`.  For files named like '1. file name', stips the number from the name allowing you to define a test order.

Returns a `TestQueue` object.



