import bodyParser from 'body-parser';
import chalk from 'chalk';
import express, { RequestHandler } from 'express';
import _ from 'lodash';

const Diaspora = require( 'diaspora' );

import { IConfiguration, IMiddlewareHash } from '../diaspora-server';
import {
	configureList,
	Entity,
	HttpVerb,
	Model,
	respondError,
	SelectQuery,
	Set,
} from '../utils';

const QUERY_OPTS = ['skip', 'limit', 'sort', 'page'];

const parseQuery = ( queryObj: SelectQuery ) => {
	const raw = _.mapValues( queryObj, ( val, key ) => {
		if ( ['query', 'options'].includes( key ) ) {
			return JSON.parse( val );
		} else {
			return val;
		}
	} );

	return {
		raw,
		options: _.pick( raw, QUERY_OPTS ),
		where: _.get( raw, 'where', _.omit( raw, QUERY_OPTS ) ),
	};
};

const setIdFromIdHash = ( entity: Entity ) => {
	const retVal = entity.toObject();
	delete retVal.idHash;
	retVal.id = entity.getId();
	return retVal;
};
const respondMaybeEmptySet = ( res: express.Response, set: Set ) => {
	if ( 0 === set.length ) {
		res.status( 204 );
	}
	return res.json( set.map( setIdFromIdHash ).value() );
};
const respondMaybeNoEntity = ( res: express.Response, entity?: Entity ) => {
	if ( _.isNil( entity ) ) {
		return res.status( 204 ).send();
	} else {
		return res.json( setIdFromIdHash( entity ) );
	}
};

interface SubApiMap {
	[key: string]: {
		description: string;
		parameters?: {
			[key: string]: {
				optional: boolean;
				description: string;
			};
		};
		canonicalUrl: string;
	};
}

export enum EDataAction {
	FIND = 'find',
	DELETE = 'delete',
	UPDATE = 'update',
	INSERT = 'insert',
	REPLACE = 'replace',
}

const HttpVerbQuery = {
	[HttpVerb.GET]: EDataAction.FIND,
	[HttpVerb.DELETE]: EDataAction.DELETE,
	[HttpVerb.PATCH]: EDataAction.UPDATE,
	[HttpVerb.POST]: EDataAction.INSERT,
	[HttpVerb.PUT]: EDataAction.REPLACE,
};
export enum EQueryNumber {
	SINGULAR = 'singular',
	PLURAL = 'plural',
}
// Should not be exported
export interface IDiasporaApiRequest extends express.Request {
	diasporaApi: {
		where?: object;
		options?: object;
		body: any;
		id: string;
		number: EQueryNumber;
		model: Model;
		action: EDataAction;
		raw?: any;
	};
}
type IModelRequestApplier = (
	queryNumber: EQueryNumber,
	req: IDiasporaApiRequest,
	res: express.Response,
	model: Model,
) => Promise<any>;
type IModelRequestHandler = (
	req: IDiasporaApiRequest,
	res: express.Response,
	next: express.NextFunction,
	model: Model,
) => Promise<any>;
type DiasporaApiParamHandler = (
	req: IDiasporaApiRequest,
	res: express.Response,
	next: express.NextFunction,
) => any;

const deleteHandler: IModelRequestApplier = async (
	queryNumber,
	req,
	res,
	model,
) => {
	if ( _.isEmpty( req.diasporaApi.where ) ) {
		return res.status( 405 ).send( {
			message: `${req.method} requires a "where" clause`,
		} );
	} else {
		try {
			await model[EQueryNumber.SINGULAR === queryNumber ? 'delete' : 'deleteMany'](
				req.diasporaApi.where,
				req.diasporaApi.options,
			);
			return res.status( 204 ).json();
		} catch ( error ) {
			return respondError( res, error );
		}
	}
};
const findHandler: IModelRequestApplier = async (
	queryNumber,
	req,
	res,
	model,
) => {
	const handler =
		EQueryNumber.SINGULAR === queryNumber
			? respondMaybeNoEntity
			: respondMaybeEmptySet;
	try {
		const foundItems = await model[
			EQueryNumber.SINGULAR === queryNumber ? 'find' : 'findMany'
		]( req.diasporaApi.where, req.diasporaApi.options );
		return handler( res, foundItems );
	} catch ( error ) {
		return respondError( res, error );
	}
};
const insertHandler: IModelRequestApplier = async (
	queryNumber,
	req,
	res,
	model,
) => {
	const handler =
		EQueryNumber.SINGULAR === queryNumber
			? respondMaybeNoEntity
			: respondMaybeEmptySet;
	try {
		const createdItems = await model[
			EQueryNumber.SINGULAR === queryNumber ? 'spawn' : 'spawnMany'
		]( req.diasporaApi.body ).persist();
		res.status( 201 );
		return handler( res, createdItems );
	} catch ( error ) {
		return respondError( res, error );
	}
};
const updateHandler: IModelRequestApplier = async (
	queryNumber,
	req,
	res,
	model,
) => {
	if ( _.isEmpty( req.diasporaApi.where ) ) {
		return res.status( 405 ).send( {
			message: `${req.method} requires a "where" clause`,
		} );
	} else {
		const handler =
			EQueryNumber.SINGULAR === queryNumber
				? respondMaybeNoEntity
				: respondMaybeEmptySet;
		try {
			const updatedItems = await model[
				EQueryNumber.SINGULAR === queryNumber ? 'update' : 'updateMany'
			]( req.diasporaApi.where, req.diasporaApi.body, req.diasporaApi.options );
			return handler( res, updatedItems );
		} catch ( error ) {
			return respondError( res, error );
		}
	}
};
const replaceHandler: IModelRequestApplier = async (
	queryNumber,
	req,
	res,
	model,
) => {
	if ( _.isEmpty( req.diasporaApi.where ) ) {
		return res.status( 405 ).send( {
			message: `${req.method} requires a "where" clause`,
		} );
	} else {
		const handler: (
			res: express.Response,
			entityOrSet?: Set | Entity,
		) => Response = ( EQueryNumber.SINGULAR === queryNumber
			? respondMaybeNoEntity
			: respondMaybeEmptySet ) as any;
		try {
			const toReplaceItems = await model[
				EQueryNumber.SINGULAR === queryNumber ? 'find' : 'findMany'
			]( req.diasporaApi.where, req.diasporaApi.options );

			// Replace with entity.replaceAttributes in next Diaspora version
			const action = ( entity: Entity ) =>
				entity.replaceAttributes( _.clone( req.diasporaApi.body ) ).persist();

			let updatedItems: undefined | Entity | Entity[];
			if ( EQueryNumber.PLURAL === queryNumber ) {
				updatedItems = new Diaspora.components.Set(
					model,
					await Promise.all( toReplaceItems.map( action ).value() ),
				);
			} else if ( toReplaceItems ) {
				updatedItems = await action( toReplaceItems );
			}

			return handler( res, updatedItems );
		} catch ( error ) {
			return respondError( res, error );
		}
	}
};

const handlers: { [key: string]: IModelRequestHandler } = {
	// Singular
	_delete( req, res, next, model ) {
		return deleteHandler( EQueryNumber.SINGULAR, req, res, model );
	},
	_get( req, res, next, model ) {
		return findHandler( EQueryNumber.SINGULAR, req, res, model );
	},
	_patch( req, res, next, model ) {
		return updateHandler( EQueryNumber.SINGULAR, req, res, model );
	},
	_post( req, res, next, model ) {
		return insertHandler( EQueryNumber.SINGULAR, req, res, model );
	},
	_put( req, res, next, model ) {
		return replaceHandler( EQueryNumber.SINGULAR, req, res, model );
	},

	// Plurals
	delete( req, res, next, model ) {
		return deleteHandler( EQueryNumber.PLURAL, req, res, model );
	},
	get( req, res, next, model ) {
		return findHandler( EQueryNumber.PLURAL, req, res, model );
	},
	patch( req, res, next, model ) {
		return updateHandler( EQueryNumber.PLURAL, req, res, model );
	},
	post( req, res, next, model ) {
		return insertHandler( EQueryNumber.PLURAL, req, res, model );
	},
	put( req, res, next, model ) {
		return replaceHandler( EQueryNumber.PLURAL, req, res, model );
	},
};
const optionHandler = (
	configuredModels: Model[],
	req: express.Request,
	res: express.Response,
) => {
	const response: SubApiMap = {};
	_.forEach( configuredModels, ( apiDesc, modelName ) => {
		let routeName = `/${apiDesc.singular}/$ID`;
		response[routeName] = {
			description: `Base API to query on a SINGLE item of ${modelName}`,
			parameters: {
				$ID: {
					optional: true,
					description: 'Id of the item to match',
				},
			},
			canonicalUrl: `${req.baseUrl}${routeName}`,
		};
		routeName = `/${apiDesc.plural}`;
		response[routeName] = {
			description: `Base API to query on SEVERAL items of ${modelName}`,
			canonicalUrl: `${req.baseUrl}${routeName}`,
		};
	} );
	return res.json( response );
};

const bind = (
	newRouter: express.Router,
	apiNumber: EQueryNumber,
	route: string,
	model: Model,
	middlewares: IMiddlewareHash,
) => {
	const prefix = EQueryNumber.SINGULAR === apiNumber ? '_' : '';
	const partialize = ( methods: Array<DiasporaApiParamHandler | undefined> ) =>
		_( methods )
			.compact()
			.map( ( func ) => _.ary( func, 4 ) )
			.map( ( func ) => _.partialRight( func, model ) )
			.value();
	newRouter
		.route( route )
		.all(
			partialize( [
				async ( req, res, next ) => {
					const queryId = Diaspora.components.Utils.generateUUID();
					Diaspora.logger.verbose(
						`Received ${chalk.bold.red( req.method )} request ${chalk.bold.yellow(
							queryId,
						)} on model ${chalk.bold.blue( model.name )}: `,
						{
							absPath: _.get(
								req,
								'_parsedOriginalUrl.path',
								_.get( req, '_parsedUrl.path' ),
							),
							path: req.path,
							apiNumber,
							body: req.body,
							query: req.query,
						},
					);
					req.diasporaApi = {
						id: queryId,
						number: apiNumber,
						action: HttpVerbQuery[req.method as HttpVerb],
						model,
						body: req.body,
					};
					try {
						_.assign( req.diasporaApi, parseQuery( req.query ) );
					} catch ( error ) {
						return respondError( res, error, 400 );
					}
					delete req.diasporaApi.raw;
					if ( 'singular' === req.diasporaApi.number ) {
						const id = _.get( req, 'params[1]' );
						if ( !_.isNil( id ) ) {
							if ( 'insert' === req.diasporaApi.action ) {
								respondError(
									res,
									new Error( 'POST (insert) to explicit ID is forbidden' ),
									405,
								);
							} else {
								const target = await model.find( id );
								if ( _.isNil( target ) ) {
									return res.status( 404 ).send();
								}
								_.assign( req.diasporaApi, {
									urlId: id,
									where: { id },
									target,
								} );
							}
						}
					}
					Diaspora.logger.debug(
						`DiasporaAPI params for request ${chalk.bold.yellow( queryId )}: `,
						req.diasporaApi,
					);
					return next();
				},
				middlewares.all,
			] ),
		)
		.delete(
			partialize( [
				middlewares.delete,
				( middlewares as any )[
					`delete${EQueryNumber.SINGULAR === apiNumber ? 'One' : 'Many'}`
				],
				handlers[`${prefix}delete`],
			] ),
		)
		.get(
			partialize( [
				middlewares.get,
				middlewares.find,
				( middlewares as any )[
					`find${EQueryNumber.SINGULAR === apiNumber ? 'One' : 'Many'}`
				],
				handlers[`${prefix}get`],
			] ),
		)
		.patch(
			partialize( [
				middlewares.patch,
				middlewares.update,
				( middlewares as any )[
					`update${EQueryNumber.SINGULAR === apiNumber ? 'One' : 'Many'}`
				],
				handlers[`${prefix}patch`],
			] ),
		)
		.post(
			partialize( [
				middlewares.post,
				middlewares.insert,
				( middlewares as any )[
					`insert${EQueryNumber.SINGULAR === apiNumber ? 'One' : 'Many'}`
				],
				handlers[`${prefix}post`],
			] ),
		)
		.put(
			partialize( [
				middlewares.put,
				middlewares.replace,
				( middlewares as any )[
					`replace${EQueryNumber.SINGULAR === apiNumber ? 'One' : 'Many'}`
				],
				handlers[`${prefix}put`],
			] ),
		)
		.options();
};

export default ( configHash: IConfiguration ) => {
	// Get only models authorized
	const allModels = _.keys( Diaspora.models );
	const configuredModels = ( () => {
		try {
			return configureList( configHash.models, allModels );
		} catch ( error ) {
			if ( error instanceof ReferenceError ) {
				throw new ReferenceError(
					`Tried to configure Diaspora Server with unknown model. Original message: ${
						error.message
					}`,
				);
			} else {
				throw error;
			}
		}
	} )();

	// Create the subrouter
	const newRouter = express.Router();
	// parse application/x-www-form-urlencoded
	newRouter.use(
		bodyParser.urlencoded( {
			extended: false,
		} ),
	);
	// parse application/json
	newRouter.use( bodyParser.json() );

	// Configure router
	_.forEach( configuredModels, ( apiDesc, modelName ) => {
		if ( true === apiDesc ) {
			apiDesc = {};
		}
		_.defaults( apiDesc, {
			singular: modelName.toLowerCase(),
			plural: `${modelName.toLowerCase()}s`,
			middlewares: {},
		} );
		Diaspora.logger.verbose( `Exposing ${modelName}`, apiDesc );
		const model = Diaspora.models[modelName];

		bind(
			newRouter,
			EQueryNumber.SINGULAR,
			`/${apiDesc.singular}(/*)?`,
			model,
			apiDesc.middlewares,
		);
		bind(
			newRouter,
			EQueryNumber.PLURAL,
			`/${apiDesc.plural}`,
			model,
			apiDesc.middlewares,
		);
	} );
	newRouter.options( '', _.partial( optionHandler, configuredModels ) );
	return newRouter as RequestHandler;
};
