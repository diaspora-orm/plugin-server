# Diaspora-server

> A package to add RESTful APIs to Express with Diaspora

## Build status

> Below status reflect the last development commit status. Releases require all
tests to pass successfully

Fancy badges:
[![Build Status](https://travis-ci.org/GerkinDev/diaspora-server.svg?branch=master)](https://travis-ci.org/GerkinDev/diaspora-server)
[![Dependency Status](https://gemnasium.com/badges/github.com/GerkinDev/diaspora-server.svg)](https://gemnasium.com/github.com/GerkinDev/diaspora-server)
[![Maintainability](https://api.codeclimate.com/v1/badges/6028b57bba7b0bb7f73c/maintainability)](https://codeclimate.com/github/GerkinDev/diaspora-server/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/6028b57bba7b0bb7f73c/test_coverage)](https://codeclimate.com/github/GerkinDev/diaspora-server/test_coverage)  
[![npm](https://img.shields.io/npm/dm/diaspora-server.svg)](https://npmjs.org/package/diaspora-server)
[![npm version](https://badge.fury.io/js/diaspora-server.svg)](https://badge.fury.io/js/diaspora-server)
[![GitHub commit activity the past year](https://img.shields.io/github/commit-activity/y/GerkinDev/diaspora-server.svg)](https://github.com/GerkinDev/diaspora-server)
[![license](https://img.shields.io/github/license/GerkinDev/diaspora-server.svg)](https://github.com/GerkinDev/diaspora-server)

## Infos

> ***Warning!* Not ready for production**

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

Inspired by [this tutorial](http://www.restapitutorial.com/lessons/httpmethods.html)

## Todo

* API Maps with OPTION verb
* SOAP support?