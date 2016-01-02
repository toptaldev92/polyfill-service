var tsort         = require('tsort'),
	_             = require('lodash'),
	AliasResolver = require('./aliases'),
	UA            = require('./UA'),
	sources       = require('./sources');


// Load additional useragent features: primarily to use: agent.satisfies to
// test a browser version against a semver string
require('useragent/features');

"use strict";

function listAllPolyfills() {
	return sources.getCollection().listPolyfills();
}

function describePolyfill(featureName) {
	return sources.getCollection().getPolyfill(featureName);
}

function getOptions(opts) {
	return _.extend({
		uaString: '',
		minify: true,
		unknown: 'ignore',
		features: {},
	}, opts);
}

/**
 * Given a set of features that should be polyfilled in 'options.features' (with flags i.e. `{<featurename>: {flags:[<flaglist>]}, ...}`), determine which have a configuration valid for the given options.uaString, and return a promise of set of canonical (unaliased) features (with flags) and polyfills.
 *
 * @return Promise(object), canonicalised feature definitions filtered for UA
 */
function getPolyfills(options) {
	var ua, sourceslib, aliasResolver;

	options = getOptions(options);
	sourceslib = sources.getCollection();
	ua = new UA(options.uaString);

	aliasResolver = new AliasResolver([
		function aliasFromConfig(featureName) {
			return sourceslib.getConfigAliases(featureName);
		},
		function aliasDependencies(featureName) {
			return sourceslib.getPolyfill(featureName).then(function(polyfill) {
				return ((polyfill && polyfill.dependencies) || []).concat(featureName);
			});
		},
		function aliasAll(featureName) {
			return (featureName === 'all') ? sourceslib.listPolyfills() : undefined;
		}
	]);

	return Promise.resolve(options.features)
	.then(aliasResolver.resolve.bind(aliasResolver))
	.then(function(features) {

		// Filter the features object to remove features not suitable for the current UA
		var featuresList = Object.keys(features);
		return Promise.all(featuresList.map(function(featureName) {
			return sourceslib.getPolyfill(featureName).then(function(polyfill) {
				if (!polyfill) return false;

				var isBrowserMatch = (polyfill.browsers && polyfill.browsers[ua.getFamily()] && ua.satisfies(polyfill.browsers[ua.getFamily()]));
				var hasAlwaysFlagOverride = (features[featureName].flags.indexOf('always') !== -1);
				var unknownOverride = (options.unknown === 'polyfill' && ua.isUnknown());

				return (isBrowserMatch || hasAlwaysFlagOverride || unknownOverride) ? featureName : false;
			});
		})).then(function(filteredList) {
			return filteredList.reduce(function(out, key) {
				if (key) out[key] = features[key];
				return out;
			}, {})
		});
	});
}

function getPolyfillString(options) {
	var ua, uaDebugName;
	var explainerComment = [];
	var sourceslib;
	var lf;

	options = getOptions(options);
	ua = new UA(options.uaString);
	uaDebugName = (ua.isUnknown() ? 'Unknown (using policy: '+options.unknown+')' : ua.getFamily() + '/' + ua.getVersion());
	lf = options.minify ? '' : '\n';

	try {
		sourceslib = sources.getCollection();
	} catch(e) {
		if (e.message === 'No matching version found') {
			sourceslib = null;
		} else {
			throw e;
		}
	}

	// Check UA and turn requested features into a list of polyfills
	return Promise.resolve()
		.then(function() {
			if (!ua.meetsBaseline() && !(ua.isUnknown() && options.unknown === 'polyfill')) {
				explainerComment = ['Unsupported UA detected: ' + uaDebugName];
				if (ua.getBaseline()) {
					explainerComment.push('Version range for polyfill support in this family is: ' + ua.getBaseline());
				}
				return {};
			} else {
				if (options.minify) {
					explainerComment = ['Rerun without minification for verbose metadata'];
				} else  {
					explainerComment = [
						'For detailed credits and licence information see http://github.com/financial-times/polyfill-service.',
						'',
						'UA detected: ' + uaDebugName,
						'Features requested: ' + Object.keys(options.features),
						''
					];
				}
				return getPolyfills(options);
			}
		})

		// Build a polyfill bundle of polyfill sources sorted in dependency order
		.then(function(features) {
			var warnings = {unknown:[], nopolyfill:[]};
			var graph = tsort();
			var builtPolyfillString = '';

			return Promise.all(Object.keys(features).map(function(featureName) {
				var feature = features[featureName];
				return sourceslib.getPolyfill(featureName).then(function(polyfill) {
					if (!polyfill) {
						warnings.unknown.push(' - '+featureName);
					} else {

						graph.add(featureName);
						var srcKey = (options.minify ? 'min':'raw') + 'Source';

						feature.polyfillOutput = polyfill[srcKey];

						if (feature.flags.indexOf('gated') !== -1 && polyfill.detectSource) {
							feature.polyfillOutput = "if (!(" + polyfill.detectSource + ")) {" + lf + feature.polyfillOutput + "}" + lf + lf;
						}

						if (polyfill.dependencies) {
							for (var i = 0; i < polyfill.dependencies.length; i++) {
								if (features[polyfill.dependencies[i]]) {
									graph.add(polyfill.dependencies[i], featureName);
								}
							}
						}
						feature.comment = '- ' + featureName + ', License: ' + (polyfill.license || 'CC0')  + ((feature.aliasOf && feature.aliasOf.length) ? ' (required by "' + feature.aliasOf.join('", "') + '")' : '');
					}
				});
			}))
			.then(function() {

				// Using the graph order, build the completed polyfill bundle
				graph.sort().forEach(function(featureName) {
					builtPolyfillString += features[featureName].polyfillOutput || '';
					if (!options.minify && features[featureName].comment) {
						explainerComment.push(features[featureName].comment);
					}
				});
				if (builtPolyfillString) {

					// Outer closure hides private features from global scope
					builtPolyfillString = "(function(undefined) {" + lf + builtPolyfillString + lf + "})" + lf;

					// Invoke the closure, binding `this` to window (in a browser), self (in a web worker), or global (in Node/IOjs)
					builtPolyfillString += ".call('object' === typeof window && window || 'object' === typeof self && self || 'object' === typeof global && global || {});";
				}

				if (warnings.unknown.length && !options.minify) {
					explainerComment = explainerComment.concat(
						'',
						'These features were not recognised:',
						warnings.unknown
					);
				}

				if (warnings.nopolyfill.length && !options.minify) {
					explainerComment = explainerComment.concat(
						'',
						'These features have no polyfill suitable for '+ua.getFamily() + '/' + ua.getVersion() + ':',
						warnings.nopolyfill
					);
				}

				return '/* ' + explainerComment.join('\n * ') + ' */\n\n' + builtPolyfillString;
			});
		})
		.catch(function(err) {
			console.log(err.stack || err);
		})
	;
}

module.exports = {
	describePolyfill: describePolyfill,
	listAllPolyfills: listAllPolyfills,
	getPolyfills: getPolyfills,
	getPolyfillString: getPolyfillString,
	normalizeUserAgent: UA.normalize,
};
