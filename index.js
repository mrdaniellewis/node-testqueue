/* jshint node:true */
"use strict";

/**
 *	Simple test framework
 */
var events = require('events');
var util = require('util');
var Promise = require('promise-polyfill');
var style = require('console-style');

function TestQueue(options) {
	
	options = options || {};

	events.EventEmitter.call(this);
	
	this.stopOnFail = options.stopOnFail !== false;
	this.setupFn = function(){};
	this.teardownFn = function(){};

	this.tests = [];
}

util.inherits( TestQueue, events.EventEmitter );

/**
 *	Adds a tests
 */
TestQueue.prototype.addTest = function( name, fn ) {
	this.tests.push( { name: name, fn: fn } );
	return this;
};

/**
 *	Adds a setup function
 */
TestQueue.prototype.setup = function( fn ) {
	this.setupFn = fn;
	return this;
};

/**
 *	Adds a teardown function
 */
TestQueue.prototype.teardown = function( fn ) {
	this.teardownFn = fn;
	return this;
};

/**
 *	Run the tests
 */
TestQueue.prototype.run = function() {
	
	this._testQueueCursor = 0;
	this.passed = 0;
	this.failed = 0;

	var ret = new Promise( function(pass,fail) {
			this._testQueuePass = pass;
			this._testQueueFail = fail;
		}.bind(this) );

	Promise.resolve(this.setupFn())
		.then( function() {
			this.emit( 'start' );
		}.bind(this) )
		.then( this._testQueueNext.bind(this) );

	return ret;

};

TestQueue.prototype._testQueueNext = function() {

	if ( this._testQueueCursor === this.tests.length ) {
		this._onFinish();
		return;
	}

	var test = this.tests[this._testQueueCursor];

	if ( test.fn instanceof TestQueue ) {
		
		test.fn.on( 'pass', this.emit.bind( this, 'pass') );
		test.fn.on( 'fail', this.emit.bind( this, 'fail') );
		test.fn.on( 'info', this.emit.bind( this, 'info') );
		test.fn.on( 'start', this.emit.bind( this, 'start', test.name ) );
		test.fn.on( 'finish', function(results) {
			this.emit( 'finish', results, test.name );
		}.bind(this) );

		test.fn.run()
			.then( 
				this._onPassQueue.bind(this, test.name), 
				this._onErrorQueue.bind(this, test.name) 
			);

	} else {
		new Promise( test.fn.bind(this) )
			.then( 
				this._onPass.bind(this, test.name), 
				this._onError.bind(this, test.name) 
			);
	}	

	++this._testQueueCursor;
};

TestQueue.prototype._onPassQueue = function( name, results ) {
	this.passed += results.passed;
	this._testQueueNext();
};


TestQueue.prototype._onPass = function( name, value ) {
	++this.passed;
	this.emit( 'pass', name, value );
	this._testQueueNext();
};

TestQueue.prototype._onErrorQueue = function( name, results ) {
	
	console.log( name, results ); 

	this.failed += results.failed;
	this.passed += results.passed;

	if ( this.stopOnFail ) {
		this._onFinish();
		return;
	}

	this._testQueueNext();
};

TestQueue.prototype._onError = function(name, e) {

	++this.failed;
	this.emit( 'fail', name, e );

	if ( this.stopOnFail ) {
		this._onFinish();
		return;
	}

	this._testQueueNext();
};

TestQueue.prototype._onFinish = function() {

	var results = {
		passed: this.passed,
		failed: this.failed,
	};

	this.emit( 'finish', results );

	Promise.resolve(this.teardownFn())
		.then( function() {
			if ( this.failed > 0 ) {
				this._testQueueFail(results);
			} else {
				this._testQueuePass(results);
			}

		}.bind(this) );

};

module.exports = TestQueue;

/**
 *	Modify an existing test queue so it outputs to the console
 *	using some pretty colours
 */
TestQueue.toConsole = function(testQueue) {

	var queueDepth = 0;

	testQueue
		.on( 'pass', function(name) {
			console.log( style.green( 'Pass: ' + name ) );
		} )
		.on( 'fail', function(name,e) {
			console.error( style.red( 'Fail: ' + name ) );
			if ( e instanceof Error ) {
				console.error( style.bold.redBG( e.message ) );
				console.error( e.stack );
			}
			
		} )
		.on( 'start', function(name) {
			var text = 'Start';
			if ( typeof name === 'string' ) {
				++queueDepth;
				text = new Array(queueDepth+1).join('#') + ' ' + text;
			}
			console.log( text, name || '' );
		} )
		.on( 'finish', function(results, name) {	
			var text = 'Finish';
			if ( typeof name === 'string' ) {
				text = new Array(queueDepth+1).join('#') + ' ' + text;
				--queueDepth;
			}
			console.log( text, name || ''  );
		} );


	testQueue.run = function() {
		
		return TestQueue.prototype.run.call(this)
			.then( 
				function(results) {
					console.log( 
						style.black.greenBG( 
							'Success: all ' + results.passed + ' tests passed '
						) 
					);
				},
				function(results) {
					var total = results.failed + results.passed;
					console.error( 
						style.bold.redBG( 
							'Failure: ' 
								+ total + ' test' + (total === 1 ? '' : 's' )
								+ ' ran and ' + results.passed + ' test'+ ( results.passed === 1 ? '' : 's' )
								+ ' passed and ' + results.failed + ' test' + ( results.failed === 1 ? '' : 's' )
								+ ' failed '
						) 
					);
				}
			);
	};

	return testQueue;
};

