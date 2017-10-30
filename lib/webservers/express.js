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
	const options = _.pick( queryObj, QUERY_OPTS );

	let query =  _.omit( queryObj, QUERY_OPTS );
	if ( queryObj.hasOwnProperty( 'query' )) {
		query = JSON.parse( queryObj.query );
	}
	return {
		query,
		options,
	};
};

const parseQueryError = ( queryId, getUpdate, req, res, callback ) => {
	let query = {};
	let options = {};
	try {
		const parsed = parseQuery( req.query );
		query = parsed.query;
		options = parsed.options;
	} catch ( e ) {
		return res.status( 400 ).send( `Query property "query" expected to be a valid JSON object:${ e }` );
	}
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

const deleteHandler = ( singular, req, res, model ) => {
	return parseQueryError( singular, false, req, res, ( query, options ) => {
		return model[true === singular ? 'delete' : 'deleteMany']( query, options ).then(() => {
			return res.json();
		}).catch( _.partial( respondError, res ));
	});
};
const insertHandler = ( singular, req, res, model ) => {
	return parseQueryError( singular, true, req, res, ( query, update ) => {
		return model[true === singular ? 'spawn' : 'spawnMany']( update ).persist().then( spawned => {
			return res.status( 201 ).json( spawned.toObject());
		}).catch( _.partial( respondError, res ));
	});
};

const handlers = {
	_get( model, req, res ) {
		return parseQueryError( true, false, req, res, ( query, options ) => {
			return model.find( query, options ).then( entity => {
				if ( _.isNil( entity )) {
					return res.status( 404 ).send();
				} else {
					return res.json( entity.toObject());
				}
			}).catch( _.partial( respondError, res ));
		});
	},
	_post( model, req, res ) {
		return parseQueryError( true, true, req, res, ( query, update, options ) => {
			if ( _.isEmpty( query )) {
				return insertHandler( true, req, res, model );
			} else {
				return model.update( query, update, options ).then( entity => {
					if ( _.isNil( entity )) {
						return res.status( 404 ).send();
					} else {
						return res.json( entity.toObject());
					}
				}).catch( _.partial( respondError, res ));
			}
		});
	},
	_put( model, req, res ) {
		return parseQueryError( true, true, req, res, ( query, update, options ) => {
			if ( _.isEmpty( query )) {
				return insertHandler( true, req, res, model );
			} else {
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
			}
		});
	},
	_delete( model, req, res ) {
		return deleteHandler( true, req, res, model );
	},

	get( model, req, res ) {
		return parseQueryError( false, false, req, res, ( query, options ) => {
			return model.findMany( query, options ).then( set => {
				return respondMaybeEmptySet( res, set );
			}).catch( _.partial( respondError, res ));
		});
	},
	post( model, req, res ) {
		return parseQueryError( false, true, req, res, ( query, update, options ) => {
			if ( _.isEmpty( query )) {
				return insertHandler( false, req, res, model );
			} else {
				return model.updateMany( query, update, options ).then( set => {
					return respondMaybeEmptySet( res, set );
				}).catch( _.partial( respondError, res ));
			}
		});
	},
	put( model, req, res ) {
		return parseQueryError( false, true, req, res, ( query, update, options ) => {
			if ( _.isEmpty( query )) {
				return insertHandler( false, req, res, model );
			} else {
				return model.findMany( query, options ).then( set => {
					set.forEach( entity => {
						entity.replaceAttributes( update );
					});
					return set.persist();
				}).then( set => {
					return respondMaybeEmptySet( res, set );
				}).catch( _.partial( respondError, res ));
			}
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

const bind = ( newRouter, type, route, model ) => {
	const prefix = 'singular' === type ? '_' : '';
	newRouter
		.route( route )
		.get( _.partial( handlers[`${ prefix }get`], model ))
		.post( _.partial( handlers[`${ prefix }post`], model ))
		.put( _.partial( handlers[`${ prefix }put`], model ))
		.delete( _.partial( handlers[`${ prefix }delete`], model ));
};

module.exports = configHash => {
	// Get only models authorized
	const allModels = _.keys( Diaspora.models );
	const configuredModels = utils.configureList( configHash.models, allModels );

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
		const model = Diaspora.models[modelName];

		bind( newRouter, 'singular', `/${ apiDesc.singular }(/*)?`, model );
		bind( newRouter, 'plural', `/${ apiDesc.plural }(/*)?`, model );
	});
	newRouter.get( '',  _.partial( handlers._, configuredModels ));
	return newRouter;
};
