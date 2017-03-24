/* eslint-env mocha */

'use strict';

const itRespondsWithContentType = require('../helpers/it-responds-with-content-type');
const itRespondsWithHeader = require('../helpers/it-responds-with-header');
const itRespondsWithStatus = require('../helpers/it-responds-with-status');
const setupRequest = require('../helpers/setup-request');

describe('GET /v2', function() {
	setupRequest('GET', '/v2');
	itRespondsWithStatus(302);
	itRespondsWithHeader('Location', '/v2/docs/');
});

describe('GET /v2/docs/', function() {
	setupRequest('GET', '/v2/docs/');
	itRespondsWithStatus(200);
	itRespondsWithContentType('text/html');
});

describe('GET /v2/docs/usage', function () {
	setupRequest('GET', '/v2/docs/usage');
	itRespondsWithStatus(200);
	itRespondsWithContentType('text/html');
});

describe('GET /v2/docs/api', function() {
	setupRequest('GET', '/v2/docs/api');
	itRespondsWithStatus(200);
	itRespondsWithContentType('text/html');
});

describe('GET /v2/docs/contributing', function () {
	setupRequest('GET', '/v2/docs/contributing');
	itRespondsWithStatus(200);
	itRespondsWithContentType('text/html');
});

describe('GET /v2/docs/examples', function () {
	setupRequest('GET', '/v2/docs/examples');
	itRespondsWithStatus(200);
	itRespondsWithContentType('text/html');
});

describe('GET /v2/docs/features', function () {
	setupRequest('GET', '/v2/docs/features');
	itRespondsWithStatus(200);
	itRespondsWithContentType('text/html');
});

describe('GET /v2/docs/contributing/authoring-polyfills', function () {
	setupRequest('GET', '/v2/docs/contributing/authoring-polyfills');
	itRespondsWithStatus(200);
	itRespondsWithContentType('text/html');
});

describe('GET /v2/docs/contributing/common-scenarios', function () {
	setupRequest('GET', '/v2/docs/contributing/common-scenarios');
	itRespondsWithStatus(200);
	itRespondsWithContentType('text/html');
});

describe('GET /v2/docs/contributing/testing', function () {
	setupRequest('GET', '/v2/docs/contributing/testing');
	itRespondsWithStatus(200);
	itRespondsWithContentType('text/html');
});
