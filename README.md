# Diaspora-server

> A package to add RESTful APIs to Express with [Diaspora](https://www.npmjs.com/package/diaspora)

Fancy badges:
[![Build Status](https://travis-ci.org/diaspora-orm/plugin-server.svg?branch=master)](https://travis-ci.org/diaspora-orm/plugin-server)
[![Maintainability](https://api.codeclimate.com/v1/badges/733743517275d5b31c83/maintainability)](https://codeclimate.com/github/diaspora-orm/plugin-server/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/733743517275d5b31c83/test_coverage)](https://codeclimate.com/github/diaspora-orm/plugin-server/test_coverage)  
[![npm](https://img.shields.io/npm/dm/diaspora-orm/plugin-server.svg)](https://npmjs.org/package/@diaspora/plugin-server)
[![npm version](https://badge.fury.io/js/%40diaspora%2Fplugin-server.svg)](https://npmjs.org/package/@diaspora/plugin-server)
[![GitHub commit activity the past year](https://img.shields.io/github/commit-activity/y/diaspora-orm/plugin-server.svg)](https://github.com/diaspora-orm/plugin-server)
[![license](https://img.shields.io/github/license/diaspora/plugin-server.svg)](https://github.com/diaspora-orm/plugin-server)

## Getting started

### Installation

In order to run this plugin, you need to install both the Diaspora Server plugin & [Diaspora](https://www.npmjs.com/package/@diaspora/diaspora) itself.

```bash
npm install @diaspora/plugin-server @diaspora/diaspora
```

### Configuration

```ts
import { Diaspora } from '@diaspora/diaspora';
import { ExpressApiGenerator } from '@diaspora/plugin-server' );
import express = require( 'express' );

const app = express();

/* Configure Diaspora first: create your data sources, declare your models, etc... */
Diaspora.createNamedDataSource( /* ... */ );
Diaspora.declareModel( 'PhoneBook', /* ... */);

// Generates the API handler class
const expressApiGenerator = new ExpressApiGenerator({
	models: {
		PhoneBook: {
			singular:    'PhoneBook',
			plural:      'PhoneBooks',
			middlewares: { /* ... */ },
		},
	},
});

// Use the middleware to handle your requests
app.use( '/api', expressApiGenerator.middleware );
```

In the hash `models`, you can select which models you want to expose. You can use regular expressions, [minimatch](https://www.npmjs.com/package/minimatch) or plain text matching:

```ts
const expressApiGenerator = new ExpressApiGenerator({
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

### Getting further

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

* SOAP support?
* Planned: GraphQL API
