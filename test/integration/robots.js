/* eslint-env mocha */

'use strict';

const assert = require('proclaim');
const itRespondsWithContentType = require('./helpers/it-responds-with-content-type');
const itRespondsWithStatus = require('./helpers/it-responds-with-status');
const setupRequest = require('./helpers/setup-request');

describe('GET /robots.txt', function() {
	setupRequest('GET', '/robots.txt');
	itRespondsWithStatus(200);
	itRespondsWithContentType('text/plain');

	it('does not disallow any paths', function() {
		return this.request.expect(response => {
			assert.isString(response.text);
			assert.equal(response.text, "User-agent: *\nDisallow:");
		});
	});
});
