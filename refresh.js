/*global require:false, module:true*/

(function (require, module) {
	'use strict';

	module.exports = refreshServerViews;
	var nano = require('nano')

	function refreshServerViews(serverUrl, done) {
		done = done || function () { };
		
		var server = nano(serverUrl);
		
		console.log('Searching for databases');
		server.db.list(function (err, dbs) {
			if (err) { done(err); return; }

			console.log('Found ' + dbs.length + ' databases');
			
			dbs.splice(dbs.indexOf('_replicator'), 1);
			dbs.splice(dbs.indexOf('_users'), 1);

			var designDocs = [];

			if (dbs.length) {
				getDbViews(serverUrl + dbs.pop(), addDesignDoc, processNextDb);
			} else {
				processViews(designDocs, done);
			}

			function addDesignDoc(dbUrl, designDoc) {
				designDocs.push({
					db: dbUrl,
					designDoc: designDoc
				});
			}

			function processNextDb() {
				if (dbs.length) {
					getDbViews(serverUrl + dbs.pop(), addDesignDoc, processNextDb);
				} else {
					processViews(designDocs, done);
				}
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

		views.forEach(function (viewDef) {
			console.log('Starting ' + viewDef.design + ' on ' + viewDef.dbUrl);
			nano(viewDef.dbUrl).view(viewDef.design, viewDef.viewName);
		});

		done();
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
}(require, module));