'use strict';

// All elements of A (this) that also belong to B (other)
Set.prototype.intersection = function(other) {
	var self = this;
	return new Set(other.toArray().filter(function(value) {
		return self.has(value);
	}));
};

// Relative complement of this (A) and other (B)
// Returns the set of objects in other (B) but not in this (A)
Set.prototype.difference = function(other) {
	var self = this;
	return new Set(other.toArray().filter(function(value) {
		return !self.has(value);
	}));
};

Set.prototype.toArray = function() {
	var array = [];
	this.forEach(function(value) {
		array.push(value);
	});
	return array;
};

function toArray(obj) {
	if (!obj) return [];
	return Array.isArray(obj) ? obj : Object.keys(obj).map(function(k) { return obj[k]; });
}


module.exports = function(grunt) {
	var fs = require('fs');
	var path = require('path');
	var testResultsPath = path.join(__dirname, '../test/results');
	var file = path.join(testResultsPath, 'results.json');
	var compatFile = path.join(__dirname, '/../docs/assets/compat.json');

	grunt.registerTask('compattable', 'Create a compatibility table', function() {
		var done = this.async();
		console.log("Running compattable task");
		fs.readFile(file, function(err, filedata) {
			console.log("Reading file");
			if (err) {
				if (err.code !== 'ENOENT') {
					throw err;
				}
			}

			var compat = filedata ? JSON.parse(filedata) : {};

			var builtCompatTable = {};

			Object.keys(compat).forEach(function(browserName) {
				var versions = compat[browserName];
				Object.keys(versions).forEach(function(version) {
					var testResults = versions[version];
					if (!testResults.all || !testResults.control) {
						throw new Error("Missing test results for " + browserName + "/" + version);
					}

					var allTests = new Set(toArray(testResults.control.testedSuites));
					var failedNative = new Set(toArray(testResults.control.failingSuites));
					var failedPolyfilled = new Set(toArray(testResults.all.failingSuites));

					var missing = failedNative.intersection(failedPolyfilled);
					var polyfilled = failedPolyfilled.difference(failedNative);
					var native = failedNative.difference(allTests);

					function buildData(support) {
						return function(feature) {
							if (!builtCompatTable[feature]) {
								builtCompatTable[feature] = {};
							}

							if (!builtCompatTable[feature][browserName]) {
								builtCompatTable[feature][browserName] = {};
							}

							builtCompatTable[feature][browserName][version] = support;
						};
					};

					native.forEach(buildData('native'));
					polyfilled.forEach(buildData('polyfilled'));
					missing.forEach(buildData('missing'));
				});
			});

			// HACK: Where on earth is '1' coming from?!?
			if (builtCompatTable['1']) {
				delete builtCompatTable['1'];
			}

			fs.writeFile(compatFile, JSON.stringify(builtCompatTable, null, 2), function(err) {
				if (err) {
					throw err;
				}

				grunt.log.writeln("Updated compat.json");
				done(true);

			});
		});
	});
};
