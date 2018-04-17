import bodyParser from 'body-parser';
import chalk from 'chalk';
import Express from 'express';
import * as _ from 'lodash';

import Diaspora from '@diaspora/diaspora/lib';

import { Entity, Set } from '@diaspora/diaspora/lib/entities';
import { Model } from '@diaspora/diaspora/lib/model';
import { QueryLanguage } from '@diaspora/diaspora/lib/types/queryLanguage';
import { generateUUID } from '@diaspora/diaspora/lib/utils';
import { IConfiguration, IConfigurationRaw, IDiasporaApiRequest, IDiasporaApiRequestDescriptor, IDiasporaApiRequestDescriptorPreParse, IHookFunction, IHookFunctionOrArr, IMiddlewareHash, IModelConfiguration } from '../diaspora-server';
import {
	configureList,
	EHttpStatusCode,
	EQueryAction,
	EQueryNumber,
	getLoggableDiasporaApi,
	HttpVerb,
	respondError,
} from '../utils';

const QUERY_OPTS = ['skip', 'limit', 'sort', 'page'];

const parseQuery = ( queryObj: object ) => {
	const raw = _.mapValues( queryObj, ( val, key ) => {
		if ( ['query', 'options'].includes( key ) ) {
			return JSON.parse( val );
		} else {
			return val;
		}
	} );

	return {
		raw,
		options: _.pick( raw, QUERY_OPTS ) as QueryLanguage.QueryOptions,
		where: _.get( raw, 'where', _.omit( raw, QUERY_OPTS ) ) as QueryLanguage.SelectQueryOrCondition,
	};
};

const setIdFromIdHash = ( entity: Entity ) => {
	const retVal = entity.toObject();
	if ( retVal ) {
		retVal.id = entity.id;
	}
	return retVal;
};
const respondMaybeEmptySet = ( res: Express.Response, set: Set, responseCode = EHttpStatusCode.Ok ) => {
	res.status( 0 === set.length ? EHttpStatusCode.NoContent : responseCode );
	return res.json( set.entities.map( setIdFromIdHash ) );
};
const respondMaybeNoEntity = ( res: Express.Response, entity: Entity | null, responseCode = EHttpStatusCode.Ok ) => {
	if ( _.isNil( entity ) ) {
		return res.status( EHttpStatusCode.NoContent ).send();
	} else {
		return res.status( responseCode ).json( setIdFromIdHash( entity ) );
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

const HttpVerbQuery = {
	[HttpVerb.GET]: EQueryAction.FIND,
	[HttpVerb.DELETE]: EQueryAction.DELETE,
	[HttpVerb.PATCH]: EQueryAction.UPDATE,
	[HttpVerb.POST]: EQueryAction.INSERT,
	[HttpVerb.PUT]: EQueryAction.REPLACE,
};

type IModelRequestApplier = (
	queryNumber: EQueryNumber,
	req: IDiasporaApiRequest,
	res: Express.Response,
	model: Model
) => Promise<any>;

const deleteHandler: IModelRequestApplier = async (
	queryNumber,
	req,
	res,
	model
) => {
	if ( _.isEmpty( req.diasporaApi.where ) ) {
		return res.status( EHttpStatusCode.MalformedQuery ).send( {
			message: `${req.method} requires a "where" clause`,
		} );
	} else {
		const {where, options} = req.diasporaApi;
		try {
			if ( queryNumber === EQueryNumber.SINGULAR ) {
				await model.delete( where, options );
			} else {
				await model.deleteMany( where, options );
			}
			return res.status( EHttpStatusCode.NoContent ).json();
		} catch ( error ) {
			return respondError( req, res, error );
		}
	}
};
const findHandler: IModelRequestApplier = async (
	queryNumber,
	req,
	res,
	model
) => {
	const {where, options} = req.diasporaApi;
	try {
		if ( queryNumber === EQueryNumber.SINGULAR ) {
			return respondMaybeNoEntity( res, await model.find( where, options ) );
		} else {
			return respondMaybeEmptySet( res, await model.findMany( where, options ) );
		}
	} catch ( error ) {
		return respondError( req, res, error );
	}
};
const insertHandler: IModelRequestApplier = async (
	queryNumber,
	req,
	res,
	model
) => {
	const {body} = req.diasporaApi;
	try {
		if ( queryNumber === EQueryNumber.SINGULAR ) {
			return respondMaybeNoEntity( res, await ( model.spawn( body ).persist() ), EHttpStatusCode.Created );
		} else {
			return respondMaybeEmptySet( res, await ( model.spawnMany( body ).persist() ), EHttpStatusCode.Created );
		}
	} catch ( error ) {
		return respondError( req, res, error );
	}
};
const updateHandler: IModelRequestApplier = async (
	queryNumber,
	req,
	res,
	model
) => {
	if ( _.isEmpty( req.diasporaApi.where ) ) {
		return res.status( EHttpStatusCode.MalformedQuery ).send( {
			message: `${req.method} requires a "where" clause`,
		} );
	} else {
		const {where, body, options} = req.diasporaApi;
		try {
			if ( queryNumber === EQueryNumber.SINGULAR ) {
				return respondMaybeNoEntity( res, await model.update( where, body, options ) );
			} else {
				return respondMaybeEmptySet( res, await model.updateMany( where, body, options ) );
			}
		} catch ( error ) {
			return respondError( req, res, error );
		}
	}
};

const replaceHandler: IModelRequestApplier = async (
	queryNumber,
	req,
	res,
	model
) => {
	if ( _.isEmpty( req.diasporaApi.where ) ) {
		return res.status( EHttpStatusCode.MalformedQuery ).send( {
			message: `${req.method} requires a "where" clause`,
		} );
	} else {
		const {where, body, options} = req.diasporaApi;
		const action = ( entity: Entity ) => {
			entity.replaceAttributes( _.clone( req.diasporaApi.body ) );
			return entity;
		};
		try {
			if ( queryNumber === EQueryNumber.SINGULAR ) {
				const foundEntity = await model.find( where, options );
				if ( foundEntity ) {
					const updatedEntity = action( foundEntity );
					const persistedEntity = await updatedEntity.persist();
					return respondMaybeNoEntity( res, persistedEntity );
				} else {
					return respondMaybeNoEntity( res, null );
				}
			} else {
				const foundSet = await model.findMany( where, options );
				const updatedSet = new Set( model, foundSet.entities.map( action ) );
				const persistedSet = await updatedSet.persist();
				return respondMaybeEmptySet( res, persistedSet );
			}
		} catch ( error ) {
			return respondError( req, res, error );
		}
	}
};

const handlers: { [key: string]: IHookFunction<IDiasporaApiRequest> } = {
	// Singular
	_delete( req, res, next, model ) {
		deleteHandler( EQueryNumber.SINGULAR, req, res, model );
	},
	_get( req, res, next, model ) {
		findHandler( EQueryNumber.SINGULAR, req, res, model );
	},
	_patch( req, res, next, model ) {
		updateHandler( EQueryNumber.SINGULAR, req, res, model );
	},
	_post( req, res, next, model ) {
		insertHandler( EQueryNumber.SINGULAR, req, res, model );
	},
	_put( req, res, next, model ) {
		replaceHandler( EQueryNumber.SINGULAR, req, res, model );
	},

	// Plurals
	delete( req, res, next, model ) {
		deleteHandler( EQueryNumber.PLURAL, req, res, model );
	},
	get( req, res, next, model ) {
		findHandler( EQueryNumber.PLURAL, req, res, model );
	},
	patch( req, res, next, model ) {
		updateHandler( EQueryNumber.PLURAL, req, res, model );
	},
	post( req, res, next, model ) {
		insertHandler( EQueryNumber.PLURAL, req, res, model );
	},
	put( req, res, next, model ) {
		replaceHandler( EQueryNumber.PLURAL, req, res, model );
	},
};
const optionHandler = (
	configuredModels: IModelConfiguration[],
	req: Express.Request,
	res: Express.Response
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

const castToDiasporaApiRequest = async ( request: Express.Request, diasporaApi: IDiasporaApiRequestDescriptorPreParse ): Promise<IDiasporaApiRequestDescriptor> => {
	const diasporaApiWithParsedQuery = _.assign( diasporaApi, parseQuery( request.query ) );
	if ( EQueryNumber.SINGULAR === diasporaApiWithParsedQuery.number ) {
		const id = _.get( request, 'params[1]' );
		if ( !_.isNil( id ) ) {
			if ( EQueryAction.INSERT === diasporaApiWithParsedQuery.action ) {
				throw new URIError( 'POST (insert) to explicit ID is forbidden' );
			} else {
				const target = await diasporaApi.model.find( id );
				if ( _.isNil( target ) ) {
					throw EHttpStatusCode.NotFound;
				}
				return _.assign( diasporaApiWithParsedQuery, {
					urlId: id,
					where: { id },
					target,
				} );
			}
		}
	}
	return diasporaApiWithParsedQuery;
};

const prepareQueryHandling = ( apiNumber: EQueryNumber ): IHookFunction<Express.Request> => {
	return async ( req, res, next, model ) => {
		const queryId = generateUUID();
		Diaspora.logger.verbose(
			`Received ${chalk.bold.red( req.method )} request ${chalk.bold.yellow(
				queryId
			)} on model ${chalk.bold.blue( model.name )}: `,
			{
				absPath: _.get(
					req,
					'_parsedOriginalUrl.path',
					_.get( req, '_parsedUrl.path' )
				),
				path: req.path,
				apiNumber,
				body: req.body,
				query: req.query,
			}
		);
		const preParseParams = {
			id: queryId,
			number: apiNumber,
			action: HttpVerbQuery[req.method as HttpVerb],
			model,
			body: req.body,
		};
		try {
			const diasporaApi = await castToDiasporaApiRequest( req, preParseParams );
			const reqExtended = _.assign( req, {diasporaApi} );
			Diaspora.logger.debug(
				`DiasporaAPI params for request ${chalk.bold.yellow( queryId )}: `,
				getLoggableDiasporaApi( diasporaApi )
			);
			return next();
		} catch ( error ) {
			const catchReq = _.assign( req, {diasporaApi: preParseParams} );
			if ( error instanceof URIError ) {
				return respondError( catchReq, res, error, EHttpStatusCode.MethodNotAllowed );
			} else if ( typeof error === 'number' ) {
				return res.status( error ).send();
			} else {
				return respondError( catchReq, res, error, EHttpStatusCode.MalformedQuery );
			}
		}
	};
};

const getRelevantHandlers = (
	middlewares: IMiddlewareHash,
	apiNumber: EQueryNumber,
	actionName: EQueryAction,
	methodName: HttpVerb
) => {
	const action: 'find' | 'delete' | 'update' | 'insert' | 'replace' = actionName.toLowerCase() as any;
	const method: 'get' | 'delete' | 'patch' | 'post' | 'put' = methodName.toLowerCase() as any;

	return [
		middlewares[method],
		middlewares[action],
		( middlewares as any )[action + ( EQueryNumber.SINGULAR === apiNumber ? 'One' : 'Many' )],
		( handlers as any )[( EQueryNumber.SINGULAR === apiNumber ? '_' : '' ) + method],
	] as Array<_.Many<IHookFunction<IDiasporaApiRequest> | undefined>>;
};

const bind = (
	newRouter: Express.Router,
	apiNumber: EQueryNumber,
	route: string,
	model: Model,
	middlewares: IMiddlewareHash
) => {
	const partialize = ( methods: Array<_.Many<IHookFunction<IDiasporaApiRequest> | undefined>> ) =>
	_.chain( methods )
	.flatten()
	.compact()
	.map( ( func ) => _.ary( func, 4 ) )
	.map( ( func ) => _.partialRight( func, model ) )
	.value();

	newRouter
	.route( route )
	.all( partialize( [
		prepareQueryHandling( apiNumber ),
		middlewares.all,
	] ) )
	.delete( partialize( getRelevantHandlers( middlewares, apiNumber, EQueryAction.DELETE, HttpVerb.DELETE ) ) )
	.get( partialize( getRelevantHandlers( middlewares, apiNumber, EQueryAction.FIND, HttpVerb.GET ) ) )
	.patch( partialize( getRelevantHandlers( middlewares, apiNumber, EQueryAction.UPDATE, HttpVerb.PATCH ) ) )
	.post( partialize( getRelevantHandlers( middlewares, apiNumber, EQueryAction.INSERT, HttpVerb.POST ) ) )
	.put( partialize( getRelevantHandlers( middlewares, apiNumber, EQueryAction.REPLACE, HttpVerb.PUT ) ) );
};

export default ( configHash: IConfigurationRaw ) => {
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
					}`
				);
			} else {
				throw error;
			}
		}
	} )();

	// Create the subrouter
	const newRouter = Express.Router();
	// parse application/x-www-form-urlencoded
	newRouter.use(
		bodyParser.urlencoded( {
			extended: false,
		} )
	);
	// parse application/json
	newRouter.use( bodyParser.json() );

	// Configure router
	_.forEach( configuredModels, ( apiDesc, modelName ) => {
		if ( true === apiDesc ) {
			apiDesc = {};
		}
		const defaulted = _.defaults( apiDesc, {
			singular: modelName.toLowerCase(),
			plural: `${modelName.toLowerCase()}s`,
			middlewares: {},
		} ) as IModelConfiguration;
		Diaspora.logger.verbose( `Exposing ${modelName}`, apiDesc );
		const model = Diaspora.models[modelName];

		bind(
			newRouter,
			EQueryNumber.SINGULAR,
			`/${defaulted.singular}(/*)?`,
			model,
			defaulted.middlewares
		);
		bind(
			newRouter,
			EQueryNumber.PLURAL,
			`/${defaulted.plural}`,
			model,
			defaulted.middlewares
		);
	} );
	newRouter.options( '', _.partial( optionHandler, configuredModels ) );
	return newRouter as Express.RequestHandler;
};
