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




# TypeScript library starter 
 
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier) 
[![Greenkeeper badge](https://badges.greenkeeper.io/alexjoverm/typescript-library-starter.svg)](https://greenkeeper.io/) 
[![Travis](https://img.shields.io/travis/alexjoverm/typescript-library-starter.svg)](https://travis-ci.org/alexjoverm/typescript-library-starter) 
[![Coveralls](https://img.shields.io/coveralls/alexjoverm/typescript-library-starter.svg)](https://coveralls.io/github/alexjoverm/typescript-library-starter) 
[![Dev Dependencies](https://david-dm.org/alexjoverm/typescript-library-starter/dev-status.svg)](https://david-dm.org/alexjoverm/typescript-library-starter?type=dev) 
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://paypal.me/AJoverMorales) 
 
A starter project that makes creating a TypeScript library extremely easy. 
 
![](https://i.imgur.com/opUmHp0.png) 
 
### Usage 
 
```bash 
git clone https://github.com/alexjoverm/typescript-library-starter.git YOURFOLDERNAME 
cd YOURFOLDERNAME 
 
# Run npm install and write your library name when asked. That's all! 
npm install 
``` 
 
**Start coding!** `package.json` and entry files are already set up for you, so don't worry about linking to your main file, typings, etc. Just keep those files with the same name. 
 
### Features 
 
 - Zero-setup. After running `npm install` things will setup for you :wink: 
 - **[RollupJS](https://rollupjs.org/)** for multiple optimized bundles following the [standard convention](http://2ality.com/2017/04/setting-up-multi-platform-packages.html) and [Tree-shaking](https://alexjoverm.github.io/2017/03/06/Tree-shaking-with-Webpack-2-TypeScript-and-Babel/) 
 - Tests, coverage and interactive watch mode using **[Jest](http://facebook.github.io/jest/)** 
 - **[Prettier](https://github.com/prettier/prettier)** and **[TSLint](https://palantir.github.io/tslint/)** for code formatting and consistency 
 - **Docs automatic generation and deployment** to `gh-pages`, using **[TypeDoc](http://typedoc.org/)** 
 - Automatic types `(*.d.ts)` file generation 
 - **[Travis](https://travis-ci.org)** integration and **[Coveralls](https://coveralls.io/)** report 
 - (Optional) **Automatic releases and changelog**, using [Semantic release](https://github.com/semantic-release/semantic-release), [Commitizen](https://github.com/commitizen/cz-cli), [Conventional changelog](https://github.com/conventional-changelog/conventional-changelog) and [Husky](https://github.com/typicode/husky) (for the git hooks) 
  
### Importing library 
 
You can import the generated bundle to use the whole library generated by this starter: 
 
```javascript 
import myLib from 'mylib' 
``` 
 
Additionally, you can import the transpiled modules from `dist/es` in case you have a modular library: 
 
```javascript 
import something from 'mylib/dist/es/something' 
``` 
 
### NPM scripts 
 
 - `npm t`: Run test suite 
 - `npm start`: Run `npm run build` in watch mode 
 - `npm run test:watch`: Run test suite in [interactive watch mode](http://facebook.github.io/jest/docs/cli.html#watch) 
 - `npm run test:prod`: Run linting and generate coverage 
 - `npm run build`: Generate bundles and typings, create docs 
 - `npm run lint`: Lints code 
 - `npm run commit`: Commit using conventional commit style ([husky](https://github.com/typicode/husky) will tell you to use it if you haven't :wink:) 
  
### Excluding peerDependencies 
 
On library development, one might want to set some peer dependencies, and thus remove those from the final bundle. You can see in [Rollup docs](https://rollupjs.org/#peer-dependencies) how to do that. 
 
Good news: the setup is here for you, you must only include the dependency name in `external` property within `rollup.config.js`. For example, if you want to exclude `lodash`, just write there `external: ['lodash']`. 
 
### Automatic releases 
 
_**Prerequisites**: you need to create/login accounts and add your project to:_ 
 - [npm](https://www.npmjs.com/) 
 - [Travis CI](https://travis-ci.org) 
 - [Coveralls](https://coveralls.io) 
 
_**Prerequisite for Windows**: Semantic-release uses 
**[node-gyp](https://github.com/nodejs/node-gyp)** so you will need to 
install 
[Microsoft's windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) 
using this command:_ 
 
```bash 
npm install --global --production windows-build-tools 
``` 
 
#### Setup steps 
 
Follow the console instructions to install semantic release and run it (answer NO to "Do you want a `.travis.yml` file with semantic-release setup?"). 
 
_Note: make sure you've setup `repository.url` in your `package.json` file_  
 
```bash 
npm install -g semantic-release-cli 
semantic-release-cli setup 
# IMPORTANT!! Answer NO to "Do you want a `.travis.yml` file with semantic-release setup?" question. It is already prepared for you :P 
``` 
 
From now on, you'll need to use `npm run commit`, which is a convenient way to create conventional commits. 
 
Automatic releases are possible thanks to [semantic release](https://github.com/semantic-release/semantic-release), which publishes your code automatically on [github](https://github.com/) and [npm](https://www.npmjs.com/), plus generates automatically a changelog. This setup is highly influenced by [Kent C. Dodds course on egghead.io](https://egghead.io/courses/how-to-write-an-open-source-javascript-library) 
 
### Git Hooks 
 
There is already set a `precommit` hook for formatting your code with Prettier :nail_care: 
 
By default, there are two disabled git hooks. They're set up when you run the `npm run semantic-release-prepare` script. They make sure: 
 - You follow a [conventional commit message](https://github.com/conventional-changelog/conventional-changelog) 
 - Your build is not going to fail in [Travis](https://travis-ci.org) (or your CI server), since it's runned locally before `git push` 
 
This makes more sense in combination with [automatic releases](#automatic-releases) 
 
### FAQ 
 
#### `Array.prototype.from`, `Promise`, `Map`... is undefined? 
 
TypeScript or Babel only provides down-emits on syntactical features (`class`, `let`, `async/await`...), but not on functional features (`Array.prototype.find`, `Set`, `Promise`...), . For that, you need Polyfills, such as [`core-js`](https://github.com/zloirock/core-js) or [`babel-polyfill`](https://babeljs.io/docs/usage/polyfill/) (which extends `core-js`). 
 
For a library, `core-js` plays very nicely, since you can import just the polyfills you need: 
 
```javascript 
import "core-js/fn/array/find" 
import "core-js/fn/string/includes" 
import "core-js/fn/promise" 
... 
``` 
 
#### What is `npm install` doing on first run? 
 
It runs the script `tools/init` which sets up everything for you. In short, it: 
 - Configures RollupJS for the build, which creates the bundles 
 - Configures `package.json` (typings file, main file, etc) 
 - Renames main src and test files 
 
#### What if I don't want git-hooks, automatic releases or semantic-release? 
 
Then you may want to: 
 - Remove `commitmsg`, `postinstall` scripts from `package.json`. That will not use those git hooks to make sure you make a conventional commit 
 - Remove `npm run semantic-release` from `.travis.yml` 
 
#### What if I don't want to use coveralls or report my coverage? 
 
Remove `npm run report-coverage` from `.travis.yml` 
 
## Resources 
 
- [Write a library using TypeScript library starter](https://dev.to/alexjoverm/write-a-library-using-typescript-library-starter) by [@alexjoverm](https://github.com/alexjoverm/) 
- [📺 Create a TypeScript Library using typescript-library-starter](https://egghead.io/lessons/typescript-create-a-typescript-library-using-typescript-library-starter) by [@alexjoverm](https://github.com/alexjoverm/) 
- [Introducing TypeScript Library Starter Lite](https://blog.tonysneed.com/2017/09/15/introducing-typescript-library-starter-lite/) by [@tonysneed](https://github.com/tonysneed) 
 
## Projects using `typescript-library-starter` 
 
Here are some projects that use `typescript-library-starter`: 
 
- [NOEL - A universal, human-centric, replayable event emitter](https://github.com/lifenautjoe/noel) 
 
## Credits 
 
Made with :heart: by [@alexjoverm](https://twitter.com/alexjoverm) and all these wonderful contributors ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)): 
 
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section --> 
| [<img src="https://avatars.githubusercontent.com/u/6052309?v=3" width="100px;"/><br /><sub>Ciro</sub>](https://www.linkedin.com/in/ciro-ivan-agulló-guarinos-42109376)<br />[💻](https://github.com/alexjoverm/typescript-library-starter/commits?author=k1r0s "Code") [🔧](#tool-k1r0s "Tools") | [<img src="https://avatars.githubusercontent.com/u/947523?v=3" width="100px;"/><br /><sub>Marius Schulz</sub>](https://blog.mariusschulz.com)<br />[📖](https://github.com/alexjoverm/typescript-library-starter/commits?author=mariusschulz "Documentation") | [<img src="https://avatars.githubusercontent.com/u/4152819?v=3" width="100px;"/><br /><sub>Alexander Odell</sub>](https://github.com/alextrastero)<br />[📖](https://github.com/alexjoverm/typescript-library-starter/commits?author=alextrastero "Documentation") | [<img src="https://avatars1.githubusercontent.com/u/8728882?v=3" width="100px;"/><br /><sub>Ryan Ham</sub>](https://github.com/superamadeus)<br />[💻](https://github.com/alexjoverm/typescript-library-starter/commits?author=superamadeus "Code") | [<img src="https://avatars1.githubusercontent.com/u/8458838?v=3" width="100px;"/><br /><sub>Chi</sub>](https://consiiii.me)<br />[💻](https://github.com/alexjoverm/typescript-library-starter/commits?author=ChinW "Code") [🔧](#tool-ChinW "Tools") [📖](https://github.com/alexjoverm/typescript-library-starter/commits?author=ChinW "Documentation") | [<img src="https://avatars2.githubusercontent.com/u/2856501?v=3" width="100px;"/><br /><sub>Matt Mazzola</sub>](https://github.com/mattmazzola)<br />[💻](https://github.com/alexjoverm/typescript-library-starter/commits?author=mattmazzola "Code") [🔧](#tool-mattmazzola "Tools") | [<img src="https://avatars0.githubusercontent.com/u/2664047?v=3" width="100px;"/><br /><sub>Sergii Lischuk</sub>](http://leefrost.github.io)<br />[💻](https://github.com/alexjoverm/typescript-library-starter/commits?author=Leefrost "Code") | 
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | 
| [<img src="https://avatars1.githubusercontent.com/u/618922?v=3" width="100px;"/><br /><sub>Steve Lee</sub>](http;//opendirective.com)<br />[🔧](#tool-SteveALee "Tools") | [<img src="https://avatars0.githubusercontent.com/u/5127501?v=3" width="100px;"/><br /><sub>Flavio Corpa</sub>](http://flaviocorpa.com)<br />[💻](https://github.com/alexjoverm/typescript-library-starter/commits?author=kutyel "Code") | [<img src="https://avatars2.githubusercontent.com/u/22561997?v=3" width="100px;"/><br /><sub>Dom</sub>](https://github.com/foreggs)<br />[🔧](#tool-foreggs "Tools") | [<img src="https://avatars1.githubusercontent.com/u/755?v=4" width="100px;"/><br /><sub>Alex Coles</sub>](http://alexbcoles.com)<br />[📖](https://github.com/alexjoverm/typescript-library-starter/commits?author=myabc "Documentation") | [<img src="https://avatars2.githubusercontent.com/u/1093738?v=4" width="100px;"/><br /><sub>David Khourshid</sub>](https://github.com/davidkpiano)<br />[🔧](#tool-davidkpiano "Tools") | [<img src="https://avatars0.githubusercontent.com/u/7225802?v=4" width="100px;"/><br /><sub>Aarón García Hervás</sub>](https://aarongarciah.com)<br />[📖](https://github.com/alexjoverm/typescript-library-starter/commits?author=aarongarciah "Documentation") | [<img src="https://avatars2.githubusercontent.com/u/13683986?v=4" width="100px;"/><br /><sub>Jonathan Hart</sub>](https://www.stuajnht.co.uk)<br />[💻](https://github.com/alexjoverm/typescript-library-starter/commits?author=stuajnht "Code") | 
| [<img src="https://avatars0.githubusercontent.com/u/13509204?v=4" width="100px;"/><br /><sub>Sanjiv Lobo</sub>](https://github.com/Xndr7)<br />[📖](https://github.com/alexjoverm/typescript-library-starter/commits?author=Xndr7 "Documentation") | [<img src="https://avatars3.githubusercontent.com/u/180963?v=4" width="100px;"/><br /><sub>Aaron Reisman</sub>](http://conceptualcode.com)<br />[💻](https://github.com/alexjoverm/typescript-library-starter/commits?author=lifeiscontent "Code") | [<img src="https://avatars3.githubusercontent.com/u/7473800?v=4" width="100px;"/><br /><sub>Stefan Aleksovski</sub>](https://github.com/sAleksovski)<br />[💻](https://github.com/alexjoverm/typescript-library-starter/commits?author=sAleksovski "Code") | [<img src="https://avatars2.githubusercontent.com/u/8853426?v=4" width="100px;"/><br /><sub>dev.peerapong</sub>](https://github.com/devpeerapong)<br />[💻](https://github.com/alexjoverm/typescript-library-starter/commits?author=devpeerapong "Code") | [<img src="https://avatars0.githubusercontent.com/u/22260722?v=4" width="100px;"/><br /><sub>Aaron Groome</sub>](http://twitter.com/Racing5372)<br />[📖](https://github.com/alexjoverm/typescript-library-starter/commits?author=Racing5372 "Documentation") | [<img src="https://avatars1.githubusercontent.com/u/32557482?v=4" width="100px;"/><br /><sub>kid-sk</sub>](https://github.com/kid-sk)<br />[📖](https://github.com/alexjoverm/typescript-library-starter/commits?author=kid-sk "Documentation") | [<img src="https://avatars0.githubusercontent.com/u/1503089?v=4" width="100px;"/><br /><sub>Andrea Gottardi</sub>](http://about.me/andreagot)<br />[📖](https://github.com/alexjoverm/typescript-library-starter/commits?author=AndreaGot "Documentation") | 
| [<img src="https://avatars3.githubusercontent.com/u/1375860?v=4" width="100px;"/><br /><sub>Yogendra Sharma</sub>](http://TechiesEyes.com)<br />[📖](https://github.com/alexjoverm/typescript-library-starter/commits?author=Yogendra0Sharma "Documentation") | 
 
<!-- ALL-CONTRIBUTORS-LIST:END --> 
 
This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind are welcome! 
