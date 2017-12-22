# Diaspora-server

> A package to add RESTful APIs to Express with [Diaspora](https://www.npmjs.com/package/diaspora)

Fancy badges:
[![Build Status](https://travis-ci.org/GerkinDev/diaspora-server.svg?branch=master)](https://travis-ci.org/GerkinDev/diaspora-server)
[![Dependency Status](https://gemnasium.com/badges/github.com/GerkinDev/diaspora-server.svg)](https://gemnasium.com/github.com/GerkinDev/diaspora-server)
[![Maintainability](https://api.codeclimate.com/v1/badges/6028b57bba7b0bb7f73c/maintainability)](https://codeclimate.com/github/GerkinDev/diaspora-server/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/6028b57bba7b0bb7f73c/test_coverage)](https://codeclimate.com/github/GerkinDev/diaspora-server/test_coverage)  
[![npm](https://img.shields.io/npm/dm/diaspora-server.svg)](https://npmjs.org/package/diaspora-server)
[![npm version](https://badge.fury.io/js/diaspora-server.svg)](https://badge.fury.io/js/diaspora-server)
[![GitHub commit activity the past year](https://img.shields.io/github/commit-activity/y/GerkinDev/diaspora-server.svg)](https://github.com/GerkinDev/diaspora-server)
[![license](https://img.shields.io/github/license/GerkinDev/diaspora-server.svg)](https://github.com/GerkinDev/diaspora-server)

## Getting started:

### Installation:

In order to run Diaspora Server, you need to install both Diaspora Server & [Diaspora](https://www.npmjs.com/package/diaspora) itself

```bash
npm i diaspora-server diaspora
```

### Configuration:

```js
const Diaspora = require( 'diaspora' );
const DiasporaServer = require( 'diaspora-server' );
const app = require( 'express' )();

/* Configure Diaspora first: create your data sources, declare your models, etc... */
Diaspora.createNamedDataSource( /* ... */ );
Diaspora.declareModel( 'PhoneBook', /* ... */);

app.use( '/api', DiasporaServer({
	models: {
		PhoneBook: {
			singular:    'PhoneBook',
			plural:      'PhoneBooks',
			middlewares: { /* ... */ },
		},
	},
}));
```

In the hash `models`, you can select which models you want to expose. You can use regular expressions, [minimatch](https://www.npmjs.com/package/minimatch) or plain text matching:

```js
app.use( '/api', DiasporaServer({
	models: {
		'/ab?c\\d+/': {} // Regex, will match ac1, abc1, abc09
		'Qux*':       {} // Minimatch, will match Qux, QuxFoo, etc etc
		PhoneBook:    {} // Plain text matching
	},
});
```

In your model configuration, you can use following middlewares:

| Action  | Middleware functions (singular API) | Middleware functions (plural API) |
|---------|-------------------------------------|-----------------------------------|
| Insert  | post, insert, insertOne             | post, insert, insertMany          |
| Find    | get, find, findOne                  | get, find, findMany               |
| Update  | patch, update, updateOne            | patch, update, updateMany         |
| Replace | put, update, replaceOne             | put, update, replaceMany          |
| Delete  | delete, deleteOne                   | delete, deleteMany                |

Each middleware will be called as a standard Express middleware (eg with `req`, `res` & `next`). You can use them to customize the behavior of Diaspora Server.

### Getting further:

Diaspora Server uses the same Diaspora module than your app, both sharing models & the web server.

For each requests below, the server may respond:

* **204** *No Content* if the operation didn't returned an entity or the set is empty.
* **400** *Bad Request* if the parsing of the query failed
* **404** *Not Found* if using singular API with ID: `/api/foo/66b72592-b1e2-4229-82b2-c94b475c9135`

| Action | HTTP Verb | Additionnal possible responses |
|------------------|-----------|------------------------------------------------------------------------------------------------------------------------|
| Insert | POST | **201** *Created* on success, **400** *Bad request* if validation failed |
| Find | GET | **200** *OK* on success |
| Update (diff) | PUT | **200** *OK* on success, **400** *Bad request* if validation failed, **405** *Method Not Allowed* if no `where` clause |
| Update (replace) | PATCH | **200** *OK* on success, **400** *Bad request* if validation failed, **405** *Method Not Allowed* if no `where` clause |
| Delete | DELETE | **204** *No Content* if no errors occured |

The documentation will be available at [https://diaspora-server.ithoughts.io/](https://diaspora-server.ithoughts.io/)

Inspired by [this tutorial](http://www.restapitutorial.com/lessons/httpmethods.html)

## Todo

* API Maps with OPTION verb
* SOAP support?