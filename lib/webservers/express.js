'use strict';

const _ = require( 'lodash' );
const express = require( 'express' );
const bodyParser = require( 'body-parser' );
const Diaspora = require( 'diaspora' );
const utils = require( '../utils' );
const {
	respondError,
} = utils;

const QUERY_OPTS = [ 'skip', 'limit', 'sort', 'page' ];

const parseQuery = ( queryObj ) => {
	const raw = _.mapValues( queryObj, JSON.parse );

	return {
		raw,
		options: _.pick( raw, QUERY_OPTS ),
		query:   _.get( raw, 'where', _.omit( raw, QUERY_OPTS )),
	};
};

const handleIdInUrl = ( queryId, getUpdate, req, res, callback ) => {
	const {query, options} = req.query;
	if ( true === queryId && req.params[1]) {
		query.id = req.params[1];
	}
	if ( getUpdate ) {
		return callback( query, req.body, options );
	} else {
		return callback( query, options );
	}
};

const respondMaybeEmptySet = ( res, set ) => {
	if ( 0 === set.length ) {
		res.status( 404 );
	}
	return res.json( set.toObject());
};
const respondMaybeNoEntity = ( res, entity ) => {
	if ( _.isNil( entity )) {
		return res.status( 404 ).send();
	} else {
		return res.json( entity.toObject());
	}
};

const deleteHandler = ( singular, req, res, model ) => {
	return handleIdInUrl( singular, false, req, res, ( query, options ) => {
		return model[true === singular ? 'delete' : 'deleteMany']( query, options ).then(() => {
			return res.json();
		}).catch( _.partial( respondError, res ));
	});
};
const insertHandler = ( singular, req, res, model ) => {
	return handleIdInUrl( singular, true, req, res, ( query, update ) => {
		return model[true === singular ? 'spawn' : 'spawnMany']( update ).persist().then( spawned => {
			return res.status( 201 ).json( spawned.toObject());
		}).catch( _.partial( respondError, res ));
	});
};
const findHandler = ( singular, req, res, model ) => {
	return handleIdInUrl( singular, false, req, res, ( query, options ) => {
		const handler = true === singular ? respondMaybeNoEntity : respondMaybeEmptySet;
		return model[true === singular ? 'find' : 'findMany']( query, options ).then( _.partial( handler, res )).catch( _.partial( respondError, res ));
	});
};
const updateHandler = ( singular, req, res, model ) => {
	return maybeCreateHandler( singular, req, res, model, ( query, update, options ) => {
		const handler = true === singular ? respondMaybeNoEntity : respondMaybeEmptySet;
		return model[true === singular ? 'update' : 'updateMany']( query, update, options ).then( _.partial( handler, res )).catch( _.partial( respondError, res ));
	});
};
const maybeCreateHandler = ( singular, req, res, model, callback ) => {
	return handleIdInUrl( singular, true, req, res, ( query, update, options ) => {
		if ( _.isEmpty( query )) {
			return insertHandler( singular, req, res, model );
		} else {
			return callback( query, update, options );
		}
	});
};

const handlers = {
	_get( model, req, res ) {
		return findHandler( true, req, res, model );
	},
	_post( model, req, res ) {
		return updateHandler( true, req, res, model );
	},
	_put( model, req, res ) {
		return maybeCreateHandler( true, req, res, model, ( query, update, options ) => {
			return model.find( query, options ).then( entity => {
				if ( _.isNil( entity )) {
					return res.status( 404 ).send();
				} else {
					entity.replaceAttributes( update );
					return entity.persist().then( entity => {
						return res.json( entity.toObject());
					});
				}
			}).catch( _.partial( respondError, res ));
		});
	},
	_delete( model, req, res ) {
		return deleteHandler( true, req, res, model );
	},

	get( model, req, res ) {
		return findHandler( false, req, res, model );
	},
	post( model, req, res ) {
		return updateHandler( false, req, res, model );
	},
	put( model, req, res ) {
		return maybeCreateHandler( false, req, res, model, ( query, update, options ) => {
			return model.findMany( query, options ).then( set => {
				set.forEach( entity => {
					entity.replaceAttributes( update );
				});
				return set.persist();
			}).then( _.partial( respondMaybeEmptySet, res )).catch( _.partial( respondError, res ));
		});
	},
	delete( model, req, res ) {
		return deleteHandler( false, req, res, model );
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
		.all(_.compact([
			( req, res, next ) => {
				req.id = Diaspora.components.Utils.generateUUID();
				req.apiCallType = type;
				Diaspora.logger.verbose( `Received request ${ req.id } on model ${ model.name }: `, {
					absPath: req._parsedOriginalUrl.path,
					path:    req.path,
					type,
					body:    req.body,
					query:   req.query,
				});
				req.query = parseQuery( req.query );
				Diaspora.logger.debug( `Parsed query for request ${ req.id }: `, req.query );
				return next();
			},
			middlewares.all,
		]))
		.get(_.compact([
			middlewares.get,
			middlewares.find,
			middlewares[`find${  'singular' === type ? 'One' : 'Many' }`],
			_.partial( handlers[`${ prefix }get`], model ),
		]))
		.post(_.compact([
			middlewares.post,
			middlewares.update,
			middlewares[`update${  'singular' === type ? 'One' : 'Many' }`],
			_.partial( handlers[`${ prefix }post`], model ),
		]))
		.put(_.compact([
			middlewares.put,
			middlewares.insert,
			middlewares[`insert${  'singular' === type ? 'One' : 'Many' }`],
			_.partial( handlers[`${ prefix }put`], model ),
		]))
		.delete(_.compact([
			middlewares.delete,
			middlewares.delete,
			middlewares[`delete${  'singular' === type ? 'One' : 'Many' }`],
			_.partial( handlers[`${ prefix }delete`], model ),
		]));
};

module.exports = configHash => {
	// Get only models authorized
	const allModels = _.keys( Diaspora.models );
	const configuredModels = (() => {
		try {
			return utils.configureList( configHash.models, allModels );	
		} catch ( e ) {
			if ( e instanceof ReferenceError ) {
				throw new ReferenceError( `Tried to configure Diaspora Server with unknown model. Original message: ${ e.message }` );
			} else {
				throw e;
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
