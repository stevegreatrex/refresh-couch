#!/usr/bin/env node

(function(require) {
	var args = require('optimist').argv;

	var exclude = args.exclude ? args.exclude.split(',') : [];

	require('./refresh.js')(args.url, { exclude: exclude }, function() {
		process.exit();
	});
}(require));