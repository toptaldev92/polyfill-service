/* global describe, it */

var assert  = require('proclaim');
var polyfillio = require('../../../lib/index');

describe("polyfillio", function() {
	describe(".getPolyfills(features)", function() {

		it("should remove features not appropriate for the current UA", function() {
			return polyfillio.getPolyfills({
				features: {
					'Array.prototype.map': { flags:[] }
				},
				uaString: 'chrome/38'
			}).then(function(polyfillSet) {
				assert.deepEqual(polyfillSet, {});
			});
		});

		it("should respect the always flag", function() {
			return polyfillio.getPolyfills({
				features: {
					'Array.prototype.map': { flags:['always'] }
				},
				uaString: 'chrome/38'
			}).then(function(polyfillSet) {
				assert.deepEqual(polyfillSet, {
					'Array.prototype.map': { flags:['always'] }
				});
			});
		});

		it("should include dependencies", function() {
			return polyfillio.getPolyfills({
				features: {
					'Element.prototype.placeholder': { flags: [] }
				},
				uaString: 'ie/8'
			}).then(function(polyfillSet) {
				assert.deepEqual(polyfillSet, {
					'Element.prototype.placeholder': { flags:[] },
					'Object.defineProperty': { flags:[], aliasOf: ['Element.prototype.placeholder'] },
					'document.querySelector': { flags:[], aliasOf: ['Element.prototype.placeholder'] },
					'Element': { flags: [], aliasOf: ['Element.prototype.placeholder', 'document.querySelector'] },
					'Document': { flags: [], aliasOf: ['Element', 'Element.prototype.placeholder', 'document.querySelector'] }
				});
			});
		});

		it("should not include unused dependencies", function() {
			return polyfillio.getPolyfills({
				features: {
					'Promise': { flags: [] }
				},
				uaString: 'chrome/45'
			}).then(function(polyfillSet) {
				assert.deepEqual(polyfillSet, {});
			});
		});

		it("should return no polyfills for unknown UA unless unknown is set", function() {

			return Promise.all([

				// Without unknown, no polyfills
				polyfillio.getPolyfills({
					features: {'Math.sign': { flags: [] }},
					uaString: ''
				}).then(function(polyfillSet) {
					assert.deepEqual(polyfillSet, {});
				}),

				// With unknown=polyfill, default variant polyfills
				polyfillio.getPolyfills({
					features: {'Math.sign': { flags: [] }},
					unknown: 'polyfill',
					uaString: ''
				}).then(function(polyfillSet) {
					assert.deepEqual(polyfillSet, {
						'Math.sign': { flags:[] }
					});
				}),

				// With unknown=polyfill, default variant polyfills (UA not specified)
				polyfillio.getPolyfills({
					features: {'Math.sign': { flags: [] }},
					unknown: 'polyfill',
				}).then(function(polyfillSet) {
					assert.deepEqual(polyfillSet, {
						'Math.sign': { flags:[] }
					});
				})
			]);

		});

		it("should understand the 'all' alias", function() {
			return polyfillio.getPolyfills({
				features: {
					'all': { flags: [] }
				},
				uaString: 'ie/7'
			}).then(function(polyfillSet) {
				assert(Object.keys(polyfillSet).length > 0);
			});
		});

		it("should respect the excludes option", function() {
			return Promise.all([
				polyfillio.getPolyfills({
					features: {
						'fetch': { flags:[] }
					},
					uaString: 'chrome/30'
				}).then(function(polyfillSet) {
					assert.deepEqual(polyfillSet, {
						fetch: { flags: [] },
						Promise: { flags: [], aliasOf: [ 'fetch' ] },
						setImmediate: { flags: [], aliasOf: [ 'Promise', 'fetch' ] }
					});
				}),
				polyfillio.getPolyfills({
					features: {
						'fetch': { flags:[] }
					},
					excludes: ["Promise", "non-existent-feature"],
					uaString: 'chrome/30'
				}).then(function(polyfillSet) {
					assert.deepEqual(polyfillSet, {
						fetch: { flags: [] }
					});
				})
			]);
		});
	});

	describe('.getPolyfillstring', function() {

		it('should produce different output when gated flag is enabled', function() {
			return Promise.all([
				polyfillio.getPolyfillString({
					features: { default: { flags: [] } },
					uaString: 'chrome/30'
				}),
				polyfillio.getPolyfillString({
					features: { default: { flags: ['gated'] } },
					uaString: 'chrome/30'
				})
			]).then(results => {
				assert.notEqual(results[0], results[1]);
			})
		});
	});
});
