/*global require:false, module:true*/

(function (require, module) {
	'use strict';

	module.exports = refreshServerViews;
	var nano = require('nano');

	function refreshServerViews(serverUrl, options, done) {
		if (typeof options === 'function') {
			done = options;
		}
		done = done || function () { };
		
		var server = nano(serverUrl);
		
		console.log('Searching for databases');
		server.db.list(function (err, dbs) {
			if (err) { done(err); return; }

			dbs.splice(dbs.indexOf('_replicator'), 1);
			dbs.splice(dbs.indexOf('_users'), 1);
			if (options && options.exclude) {
				options.exclude.forEach(function(exclusion) {
					dbs.splice(dbs.indexOf(exclusion), 1);
				})
			}

			console.log('Found ' + dbs.length + ' databases');

			var designDocs = [];

			processQueue(dbs, function (db, next) {
				getDbViews(serverUrl + db, addDesignDoc, next);
			}, function () {
				processViews(designDocs, done);
			});

			function addDesignDoc(dbUrl, designDoc) {
				designDocs.push({
					db: dbUrl,
					designDoc: designDoc
				});
			}
		});
	}
	
	function processViews(designDocs, done) {
		var views = [];
		designDocs.forEach(function (doc) {
			if (!doc.designDoc.doc.views) { return; }

			var viewNames = Object.keys(doc.designDoc.doc.views);

			if (viewNames.length) {
				views.push({
					dbUrl: doc.db,
					design: doc.designDoc.id.replace('_design/', ''),
					viewName: viewNames[0]
				});
			}
		});

		console.log('Found ' + views.length + ' design documents with a view');

		var processing = 0;
		processQueue(views, function (viewDef, next) {
			processing++;
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			process.stdout.write('Processing ' + processing + '/' + views.length);

			nano(viewDef.dbUrl).view(viewDef.design, viewDef.viewName, {
				stale: 'update_after', //we don't want to wait for the update
				key: 'non-existant' //and we don't care about the result to filter out everything
			}, next);

		}, function () {
			console.log('\nFinished processing ' + views.length + ' design documents');
			done();
		});
	}

	function getDbViews(dbUrl, addDesignDoc, done) {
		var db = nano(dbUrl);
		db.list({
			startkey: '_design',
			endkey: 'a',
			include_docs: true
		}, function (err, designDocs) {
			if (err) { done(err); return; }

			designDocs.rows.forEach(function (designDoc) {
				addDesignDoc(dbUrl, designDoc);
			});

			done();
		});
	}

	function processQueue(queue, action, done) {
		var pendingItems = queue.slice();

		function processNextItem() {
			if (pendingItems.length) {
				action(pendingItems.pop(), processNextItem);
			} else {
				done();
			}
		}

		processNextItem();
	}
}(require, module));