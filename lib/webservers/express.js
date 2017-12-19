'use strict';

const _ = require( 'lodash' );
const express = require( 'express' );
const bodyParser = require( 'body-parser' );
const Diaspora = require( 'diaspora' );
const utils = require( '../utils' );
const chalk = require('chalk');
const {
	respondError,
} = utils;

const QUERY_OPTS = [ 'skip', 'limit', 'sort', 'page' ];

const parseQuery = ( queryObj ) => {
	const raw = _.mapValues( queryObj, JSON.parse );

	return {
		raw,
		options: _.pick( raw, QUERY_OPTS ),
		where:   _.get( raw, 'where', _.omit( raw, QUERY_OPTS )),
	};
};

const setIdFromIdHash = entity => {
	const retVal = entity.toObject();
	delete retVal.idHash;
	retVal.id = entity.getId();
	return retVal;
}
const respondMaybeEmptySet = ( res, set ) => {
	if ( 0 === set.length ) {
		res.status( 204 );
	}
	return res.json( set.map(setIdFromIdHash).value());
};
const respondMaybeNoEntity = ( res, entity ) => {
	if ( _.isNil( entity )) {
		return res.status( 204 ).send();
	} else {
		return res.json( setIdFromIdHash(entity));
	}
};

const insertHandler = async( singular, req, res, model ) => {
	const handler = true === singular ? respondMaybeNoEntity : respondMaybeEmptySet;
	try {
		const createdItems = await model[true === singular ? 'spawn' : 'spawnMany']( req.diasporaApi.body ).persist();
		res.status( 201 );
		return handler(res, createdItems);
	} catch ( error ) {
		respondError( res, error );
	}
};
const deleteHandler = async( singular, req, res, model ) => {
	try {
		await model[true === singular ? 'delete' : 'deleteMany']( req.diasporaApi.where, req.diasporaApi.options );
		return res.status( 204 ).json();
	} catch ( error ) {
		respondError( res, error );
	}
};
const findHandler = async( singular, req, res, model ) => {
	const handler = true === singular ? respondMaybeNoEntity : respondMaybeEmptySet;
	try {
		const foundItems = await model[true === singular ? 'find' : 'findMany']( req.diasporaApi.where, req.diasporaApi.options );
		return handler( res, foundItems );
	} catch ( error ) {
		return respondError( res, error );
	}
};
const updateHandler = async( singular, req, res, model ) => {
	if ( _.isEmpty( req.diasporaApi.where )) {
		return res.status(403).send({message: 'POST & PUT requires a `where` clause'})
	} else {
		const handler = true === singular ? respondMaybeNoEntity : respondMaybeEmptySet;
		try {
			const updatedItems = await model[true === singular ? 'update' : 'updateMany']( req.diasporaApi.where, req.diasporaApi.body, req.diasporaApi.options );
			return handler( res, updatedItems );
		} catch ( error ) {
			return respondError( res, error );
		}
	}
};
const replaceHandler = async( singular, req, res, model ) => {
	if ( _.isEmpty( req.diasporaApi.where )) {
		return res.status(403).send({message: 'POST & PUT requires a `where` clause'})
	} else {
		const handler = true === singular ? respondMaybeNoEntity : respondMaybeEmptySet;
		try {
			const toReplaceItems = await model[true === singular ? 'find' : 'findMany']( req.diasporaApi.where, req.diasporaApi.options );
			const action = entity => entity.replaceAttributes(req.diasporaApi.body).persist();
			let promise;
			if(singular){
				promise = action(toReplaceItems);
			} else {
				promise = Promise.all(_.map(toReplaceItems, action));
			}
			const updatedItems = await promise;
			return handler( res, updatedItems );
		} catch ( error ) {
			return respondError( res, error );
		}
	}
};

const handlers = {
	_delete( model, req, res ) {
		return deleteHandler( true, req, res, model );
	},
	_get( model, req, res ) {
		return findHandler( true, req, res, model );
	},
	_patch( model, req, res ) {
		return updateHandler( true, req, res, model );
	},
	_post( model, req, res ) {
		return insertHandler( true, req, res, model );
	},
	_put( model, req, res ) {
		return replaceHandler( true, req, res, model);
	},

	delete( model, req, res ) {
		return deleteHandler( false, req, res, model );
	},
	get( model, req, res ) {
		return findHandler( false, req, res, model );
	},
	patch( model, req, res ) {
		return updateHandler( false, req, res, model );
	},
	post( model, req, res ) {
		return insertHandler( false, req, res, model );
	},
	put( model, req, res ) {
		return replaceHandler( false, req, res, model);
	},

	_( configuredModels, req, res ) {
		const response = {};
		_.forEach( configuredModels, ( apiDesc, modelName ) => {
			let routeName = `/${ apiDesc.singular }/$ID`;
			response[routeName] = {
				description: `Base API to query on a SINGLE item of ${ modelName }`,
				parameters:  {
					$ID: {
						optional:    true,
						description: 'Id of the item to match',
					},
				},
				canonicalUrl: `${ req.baseUrl }${ routeName }`,
			};
			routeName = `/${ apiDesc.plural }`;
			response[routeName] = {
				description:  `Base API to query on SEVERAL items of ${ modelName }`,
				canonicalUrl: `${ req.baseUrl }${ routeName }`,
			};
		});
		return res.json( response );
	},
};

const bind = ( newRouter, type, route, model, middlewares ) => {
	const prefix = 'singular' === type ? '_' : '';
	newRouter
		.route( route )
		.all( _.compact([
		( req, res, next ) => {
			const queryId = Diaspora.components.Utils.generateUUID();
			Diaspora.logger.verbose( `Received ${chalk.bold.red(req.method)} request ${ chalk.bold.yellow(queryId) } on model ${ chalk.bold.blue(model.name) }: `, {
				absPath: req._parsedOriginalUrl.path,
				path:    req.path,
				type,
				body:    req.body,
				query:   req.query,
			});
			req.diasporaApi = {
				id: queryId,
				number: type,
				action: ({
					PUT: 'insert',
					GET: 'find',
					POST: 'update',
					DELETE: 'delete',
				})[req.method],
				model,
				body: req.body,
			}
			_.assign(req.diasporaApi, parseQuery( req.query ));
			delete req.diasporaApi.raw;
			if(req.diasporaApi.number === 'singular' && req.diasporaApi.action !== 'insert' && req.params[1]){
				req.diasporaApi.urlId = req.params[1];
				req.diasporaApi.where.id = req.diasporaApi.urlId;
			}
			Diaspora.logger.debug( `DiasporaAPI params for request ${ chalk.bold.yellow(queryId) }: `, req.diasporaApi );
			return next();
		},
		middlewares.all,
	]))
		.delete( _.compact([
		middlewares.delete,
		middlewares.delete,
		middlewares[`delete${  'singular' === type ? 'One' : 'Many' }`],
		_.partial( handlers[`${ prefix }delete`], model ),
	]))
		.get( _.compact([
		middlewares.get,
		middlewares.find,
		middlewares[`find${  'singular' === type ? 'One' : 'Many' }`],
		_.partial( handlers[`${ prefix }get`], model ),
	]))
		.patch( _.compact([
		middlewares.patch,
		middlewares.update,
		middlewares[`update${  'singular' === type ? 'One' : 'Many' }`],
		_.partial( handlers[`${ prefix }patch`], model ),
	]))
		.post( _.compact([
		middlewares.post,
		middlewares.insert,
		middlewares[`insert{  'singular' === type ? 'One' : 'Many' }`],
		_.partial( handlers[`${ prefix }post`], model ),
	]))
		.put( _.compact([
		middlewares.put,
		middlewares.replace,
		middlewares[`replace${  'singular' === type ? 'One' : 'Many' }`],
		_.partial( handlers[`${ prefix }put`], model ),
	]));
};

module.exports = configHash => {
	// Get only models authorized
	const allModels = _.keys( Diaspora.models );
	const configuredModels = (() => {
		try {
			return utils.configureList( configHash.models, allModels );
		} catch ( error ) {
			if ( error instanceof ReferenceError ) {
				throw new ReferenceError( `Tried to configure Diaspora Server with unknown model. Original message: ${ error.message }` );
			} else {
				throw error;
			}
		}
	})();

	// Create the subrouter
	const newRouter = express.Router();
	// parse application/x-www-form-urlencoded
	newRouter.use( bodyParser.urlencoded({
		extended: false,
	}));
	// parse application/json
	newRouter.use( bodyParser.json());

	// Configure router
	_.forEach( configuredModels, ( apiDesc, modelName ) => {
		if ( true === apiDesc ) {
			apiDesc = {};
		}
		_.defaults( apiDesc, {
			singular:    modelName.toLowerCase(),
			plural:      `${ modelName.toLowerCase()  }s`,
			middlewares: {},
		});
		Diaspora.logger.verbose( `Exposing ${ modelName }`, apiDesc );
		const model = Diaspora.models[modelName];

		bind( newRouter, 'singular', `/${ apiDesc.singular }(/*)?`, model, apiDesc.middlewares );
		bind( newRouter, 'plural', `/${ apiDesc.plural }(/*)?`, model, apiDesc.middlewares );
	});
	newRouter.get( '',  _.partial( handlers._, configuredModels ));
	return newRouter;
};
