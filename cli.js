#!/usr/bin/env node

(function(require) {
	var args = require('optimist').argv;

	require('./refresh.js')(args.url, function() {
		process.exit();
	});
}(require));