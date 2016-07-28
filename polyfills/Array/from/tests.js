/* eslint-env mocha, browser*/
/* global expect, it */

it('has correct instance', function () {
	expect(Array.from).to.be.a(Function);
});

it('has correct name', function () {
	function nameOf(fn) {
		return Function.prototype.toString.call(fn).match(/function\s*([^\s]*)\(/)[1];
	}
	expect(nameOf(Array.from)).to.be('from');
});

it('has correct argument length', function () {
	expect(Array.from.length).to.be(1);
});

describe('returns an array with', function () {
	it('arrays', function () {
		expect(Array.from([])).to.eql([]);
		expect(Array.from(['a', 'b', 'c'])).to.eql(['a', 'b', 'c']);
	});

	it('fills holes in arrays', function () {
		var arr = [1, 2, 3];
		delete arr[1];
		/**
		 * These are unrolled as expect.js' eql doesn't work on
		 * arrays created with undefined elements.
		 * https://github.com/Automattic/expect.js/issues/140
		 */
		expect(Array.from(arr)[0]).to.eql(1);
		expect(Array.from(arr)[1]).to.eql(undefined);
		expect(Array.from(arr)[2]).to.eql(3);
		/* eslint-disable no-sparse-arrays */
		expect(Array.from([4, , 6])[1]).to.eql(undefined);
	});

	it('objects', function () {
		expect(Array.from({})).to.eql([]);
		expect(Array.from({ 0: 'a' })).to.eql([]);
		expect(Array.from({ 0: 'a', 1: 'b', 2: 'c', length: 3 })).to.eql(['a', 'b', 'c']);
	});

	it('Iterable', function () {
		var set;
		var setIterator;
		var map;
		var mapIterator;

		if ('Map' in window && 'entries' in Map.prototype) {

			map = new Map();
			map.set(1,2);
			map.set(3,4);
			mapIterator = map.values();

			if (typeof mapIterator.next === 'function') {

				// Test map iterable
				expect(Array.from(mapIterator)).to.eql([2,4]);

				it('can convert from Map', function () {
					expect(Array.from(map)).to.eql([[1,2],[3,4]]);
				});
			}
		}

		if ('Set' in window && 'values' in Set.prototype) {

			set = new Set();
			set.add(1);
			set.add(2);
			set.add(3);
			set.add(4);
			setIterator = set.values();

			if (typeof setIterator.next === 'function') {

				// Test set iterable
				expect(Array.from(setIterator)).to.eql([1,2,3,4]);

				it('can convert from Set', function () {
					expect(Array.from(set)).to.eql([1,2,3,4]);
				});
			}
		}

	});

	it('strings', function () {
		expect(Array.from('')).to.eql([]);
		expect(Array.from('abc')).to.eql(['a', 'b', 'c']);
	});

	it('numbers', function () {
		expect(Array.from(-Infinity)).to.eql([]);
		expect(Array.from(-3)).to.eql([]);
		expect(Array.from(-0)).to.eql([]);
		expect(Array.from(0)).to.eql([]);
		expect(Array.from(3)).to.eql([]);
		// REMOVAL: it may take a rediculous amount of time to calculate this
		// expect(Array.from(Infinity)).to.eql([]);
	});

	it('regular expressions', function () {
		expect(Array.from(/abc/)).to.eql([]);
	});

	it('objects with in-range lengths', function () {
		expect(Array.from({ length: 0 }).length).to.be(0);
		expect(Array.from({ length: 3 }).length).to.be(3);
		/**
		 * These are unrolled as expect.js' eql doesn't work on
		 * arrays created with undefined elements.
		 * https://github.com/Automattic/expect.js/issues/140
		 */
		expect(Array.from({ length: 3 })[0]).to.eql(undefined);
		expect(Array.from({ length: 3 })[1]).to.eql(undefined);
		expect(Array.from({ length: 3 })[2]).to.eql(undefined);
		expect(Array.from({ length: '+3' }).length).to.be(3);
		// expect(Array.from({ length: Infinity }).length).to.be();
	});

	it('objects with out-of-range lengths', function () {
		expect(Array.from({ length: -0 }).length).to.be(0);
		expect(Array.from({ length: -3 }).length).to.be(0);
		expect(Array.from({ length: '-3' }).length).to.be(0);
		expect(Array.from({ length: -Infinity }).length).to.be(0);
	});

	it('mapping functions', function () {
		function addElementAndIndex(element, index) {
			return element + index;
		}

		expect(Array.from(['a', 'b', 'c'], addElementAndIndex)).to.eql(['a0', 'b1', 'c2']);
		expect(Array.from({ 0: 'a', 1: 'b', 3: 'c' }, addElementAndIndex)).to.eql([]);
		expect(Array.from({ 0: 'a', 1: 'b', 2: 'c', length: 3 }, addElementAndIndex)).to.eql(['a0', 'b1', 'c2']);
		expect(Array.from('abc', addElementAndIndex)).to.eql(['a0', 'b1', 'c2']);

		Array.from(['a', 'b', 'c'], function () {
			expect(arguments.length).to.be(2);
		});
	});

	it('this as an object', function () {
		var context = {};

		Array.from(['a', 'b', 'c'], function (value, index) {
			expect(this).to.be.an(Object);
			expect(this.valueOf()).to.eql(context);
		}, context);
	});

	it('this as 42', function () {
		var context = 42;

		Array.from(['a', 'b', 'c'], function (value, index) {
			expect(this).to.be.a(Number);
			expect(this.valueOf()).to.eql(42);
		}, context);
	});

	it('this as false', function () {
		var context = false;

		Array.from(['a', 'b', 'c'], function (value, index) {
			expect(this).to.be.a(Boolean);
			expect(this.valueOf()).to.eql(false);
		}, context);
	});
});

describe('throws', function () {
	it('non-iterable objects', function () {
		expect(function () {
			Array.from();
		}).to.throwError();

		expect(function () {
			Array.from(UNDEFINED);
		}).to.throwError();

		expect(function () {
			Array.from(NULL);
		}).to.throwError();
	});

	it('specified, invalid mapping functions', function () {
		expect(function () {
			Array.from(ARRAY.WITH_THREE_VALUES, UNDEFINED);
		}).to.throwError();

		expect(function () {
			Array.from(ARRAY.WITH_THREE_VALUES, NULL);
		}).to.throwError();

		expect(function () {
			Array.from(ARRAY.WITH_THREE_VALUES, REGEX.ALL_CHARS);
		}).to.throwError();

		expect(function () {
			Array.from(ARRAY.WITH_THREE_VALUES, EMPTY.STRING);
		}).to.throwError();

		expect(function () {
			Array.from(ARRAY.WITH_THREE_VALUES, EMPTY.ARRAY);
		}).to.throwError();

		expect(function () {
			Array.from(ARRAY.WITH_THREE_VALUES, EMPTY.OBJECT);
		}).to.throwError();

		expect(function () {
			Array.from(ARRAY.WITH_THREE_VALUES, 3);
		}).to.throwError();
	});
});
