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
				return model.spawn( update ).persist().then( entity => {
					return res.status( 201 ).json( entity.toObject());
				}).catch( _.partial( respondError, res ));
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
				return model.spawn( update ).persist().then( entity => {
					return res.status( 201 ).json( entity.toObject());
				}).catch( _.partial( respondError, res ));
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
		return parseQueryError( true, false, req, res, ( query, options ) => {
			return model.delete( query, options ).then(() => {
				return res.json();
			}).catch( _.partial( respondError, res ));
		});
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
				return model.spawnMany( update ).persist().then( set => {
					return res.status( 201 ).json( set.toObject());
				}).catch( _.partial( respondError, res ));
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
				return model.spawnMany( update ).persist().then( set => {
					return res.status( 201 ).json( set.toObject());
				}).catch( _.partial( respondError, res ));
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
		return parseQueryError( false, false, req, res, ( query, options ) => {
			return model.deleteMany( query, options ).then(() => {
				return res.json();
			}).catch( _.partial( respondError, res ));
		});
	},
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

		newRouter
			.route( `/${ apiDesc.singular }(/*)?` )
			.get( _.partial( handlers._get, model ))
			.post( _.partial( handlers._post, model ))
			.put( _.partial( handlers._put, model ))
			.delete( _.partial( handlers._delete, model ));

		newRouter
			.route( `/${ apiDesc.plural }(/*)?` )
			.get( _.partial( handlers.get, model ))
			.post( _.partial( handlers.post, model ))
			.put( _.partial( handlers.put, model ))
			.delete( _.partial( handlers.delete, model ));
	});
	newRouter.get( '', ( req, res )=> {
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
	});
	return newRouter;
};
