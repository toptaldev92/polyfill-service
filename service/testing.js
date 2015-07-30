var fs = require('fs'),
	path = require('path');

/**
 * Modes:
 *   control:  All features are allowed, tests served, no polyfills
 *   all:      All features are allowed, tests and polyfills both served
 *   targeted: Only targeted features are allowed, tests and polyfills both served
 */

function createEndpoint(type, polyfillio) {
	var templateSrc = fs.readFileSync(path.join(__dirname, '/../test/browser/', type + '.html.handlebars'), {encoding: 'UTF-8'});
	var template = require('handlebars').compile(templateSrc);

	return function(req, res) {
		var base = path.join(__dirname, '/../polyfills');
		var mode = req.query.mode  || 'all';
		var polyfilldata = [];
		var uaString = req.query.ua || req.header('user-agent');

		// Get the feature set for this test runner.  If in 'targeted' mode, allow filtering on UA, else force the feature to be included
		var features = {};
		polyfillio.getTestablePolyfills().forEach(function(featureName) {
			if (!req.query.feature || req.query.feature === featureName) {
				features[featureName] = {flags:[]};
			}
		});

		// If in targeted mode, reduce the set of features to those for which polyfills are available, otherwise pretend all of them apply
		var targeted = features;
		if (mode === 'targeted') {
			targeted = polyfillio.getPolyfills({ uaString: uaString, features: require('util')._extend({}, features) });
		}

		Object.keys(features).forEach(function(featureName) {
			var polyfillPath = path.join(base, featureName);
			var detectFile = path.join(polyfillPath, '/detect.js');
			var testFile = path.join(polyfillPath, '/tests.js');

			if (targeted[featureName] && featureName.indexOf('_') !== 0) {
				polyfilldata.push({
					feature: featureName,
					detect: fs.existsSync(detectFile) ? fs.readFileSync(detectFile, {encoding: 'utf-8'}).trim() : false,
					tests: fs.existsSync(testFile) ? fs.readFileSync(testFile) : false
				});
			}
		});

		res.set('Cache-Control', 'no-cache');
		res.send(template({
			loadPolyfill: (mode !== 'control'),
			forceAlways: (mode !== 'targeted'),
			features: polyfilldata,
			mode: mode
		}));
	};
}

module.exports = {
	createEndpoint: createEndpoint
};
