import bodyParser = require( 'body-parser' );
import chalk from 'chalk';
import express = require( 'express' );
import _ = require( 'lodash' );

import { Diaspora, Entities, Model, Errors } from '@diaspora/diaspora';

import { generateUUID } from '@diaspora/diaspora/dist/lib/utils';

import { IConfigurationRaw, IDiasporaApiRequest, IDiasporaApiRequestDescriptor, IDiasporaApiRequestDescriptorPreParse, IHookFunction, IMiddlewareHash, IModelConfiguration } from '../index';
import { EQueryAction, EQueryPlurality, JsonError } from '../utils';
import { ApiGenerator } from '../apiGenerator';

/**
 * Lists all HTTP verbs used by this webserver
 * 
 * @author Gerkin
 */
export enum HttpVerb {
	GET = 'GET',
	DELETE = 'DELETE',
	PATCH = 'PATCH',
	POST = 'POST',
	PUT = 'PUT',
}

/**
 * Lists all HTTP status codes used by this webserver
 * 
 * @author Gerkin
 */
export enum EHttpStatusCode {
	Ok = 200,
	Created = 201,
	NoContent = 204,
	
	MalformedQuery = 400,
	NotFound = 404,
	MethodNotAllowed = 405,
}

export const HttpVerbQuery = {
	[HttpVerb.GET]: EQueryAction.FIND,
	[HttpVerb.DELETE]: EQueryAction.DELETE,
	[HttpVerb.PATCH]: EQueryAction.UPDATE,
	[HttpVerb.POST]: EQueryAction.INSERT,
	[HttpVerb.PUT]: EQueryAction.REPLACE,
};

type IModelRequestApplier = (
	queryNumber: EQueryPlurality,
	req: IDiasporaApiRequest,
	res: express.Response,
	model: Model
) => Promise<any>;

/**
 * Generates a new RESTful API using express.
 * This API responds to all verbs declared in {@link HttpVerb}.
 * > *Note:* the middleware router is already bound with bodyParser urlencoded & json.
 * 
 * @author Gerkin
 */
export class ExpressApiGenerator extends ApiGenerator<express.Router> {
	public constructor( configHash: IConfigurationRaw ){
		// Init with the subrouter
		super( configHash, express.Router() );
		
		this._middleware
		// parse application/x-www-form-urlencoded
		.use( bodyParser.urlencoded( { extended: false } ) )
		// parse application/json
		.use( bodyParser.json() );
		
		// Configure router
		_.forEach( this._modelsConfiguration, ( apiDesc, modelName ) => {
			this.bind(
				EQueryPlurality.SINGULAR,
				`/${apiDesc.singular}(/*)?`,
				modelName
			);
			this.bind(
				EQueryPlurality.PLURAL,
				`/${apiDesc.plural}`,
				modelName
			);
		} );
		this._middleware.options( '', this.optionsHandler.bind( this ) );
	}
	
	/**
	 * Responds to the request with either an empty array or the set
	 * 
	 * @param res          - The express response to respond to.
	 * @param set          - The set to send to the client.
	 * @param responseCode - The HTTP status code to send.
	 * @author Gerkin
	 */
	protected static respondMaybeEmptySet( res: express.Response, set: Entities.Set, responseCode = EHttpStatusCode.Ok ) {
		res.status( 0 === set.length ? EHttpStatusCode.NoContent : responseCode );
		return res.json( set.entities.map( ExpressApiGenerator.setIdFromIdHash ) );
	}
	
	/**
	 * Responds to the request with either undefined or the entity
	 * 
	 * @param res          - The express response to respond to.
	 * @param entity       - The entity to send to the client.
	 * @param responseCode - The HTTP status code to send.
	 * @author Gerkin
	 */
	protected static respondMaybeNoEntity ( res: express.Response, entity: Entities.Entity | null, responseCode = EHttpStatusCode.Ok ) {
		if ( _.isNil( entity ) ) {
			return res.status( EHttpStatusCode.NoContent ).send();
		} else {
			return res.status( responseCode ).json( ExpressApiGenerator.setIdFromIdHash( entity ) );
		}
	}
	
	/**
	 * Retrieves data handled by Diaspora and add them to the request.
	 * 
	 * @param request     - Request to parse.
	 * @param diasporaApi - Diaspora API description targeted by the request.
	 * @returns The express request transformed.
	 * @author Gerkin
	 */
	protected static async castToDiasporaApiRequest ( request: express.Request, diasporaApi: IDiasporaApiRequestDescriptorPreParse ): Promise<IDiasporaApiRequestDescriptor>{
		const diasporaApiWithParsedQuery = _.assign( diasporaApi, ExpressApiGenerator.parseQuery( request.query ) );
		if ( EQueryPlurality.SINGULAR === diasporaApiWithParsedQuery.number ) {
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
	}

	/**
	 * Respond to the request with an error code
	 * 
	 * @param req    - Parsed request to answer to
	 * @param res    - express response object related to the request
	 * @param error  - Error to return to the client.
	 * @param status - Status code to answer with. If not provided, it is guessed depending on the error.
	 * @author Gerkin
	 */
	protected static respondError(
		req: IDiasporaApiRequest<IDiasporaApiRequestDescriptorPreParse>,
		res: express.Response,
		error?: Error,
		status?: number
	){
		const jsonError: JsonError = _.assign( {}, error );
		jsonError.message = _.isError( error )
		? error.message || error.toString()
		: undefined;
		
		const isValidationError = error instanceof Errors.ValidationError;
		if ( isValidationError ) {
			Diaspora.logger.debug(
				`Request ${
					req.diasporaApi.id
				} triggered a validation error: message is ${JSON.stringify(
					jsonError.message
				)}`,
				jsonError
			);
		} else {
			Diaspora.logger.error(
				`Request ${_.get(
					res,
					'req.diasporaApi.id',
					'UNKNOWN'
				)} triggered an error: message is ${JSON.stringify( jsonError.message )}`,
				jsonError
			);
		}
		res.status( status || ( isValidationError ? 400 : 500 ) ).send( jsonError );
	}
	
	/**
	 * Gets the loggable version of the request.
	 * 
	 * @param diasporaApi - Request descriptor to log.
	 * @returns Object containing a description of the Diaspora request.
	 * @author Gerkin
	 */
	protected static getLoggableDiasporaApi( diasporaApi: IDiasporaApiRequestDescriptor ){
		return _.assign( {}, _.omit( diasporaApi, ['id', 'target'] ), {
			model: diasporaApi.model.name,
			targetFound: diasporaApi.urlId ? !_.isNil( diasporaApi.target ) : undefined,
		} );
	}

	/**
	 * Parse the query and triggers the Diaspora call. This is the main middleware function of this server
	 * 
	 * @param apiNumber - Indicates the type of the query, saying if we are targetting a single or several entitie(s)
	 * @returns The Hook function to add to the router.
	 * @author Gerkin
	 */
	protected prepareQueryHandling( apiNumber: EQueryPlurality ): IHookFunction<express.Request>{
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
				const diasporaApi = await ExpressApiGenerator.castToDiasporaApiRequest( req, preParseParams );
				_.assign( req, {diasporaApi} );
				Diaspora.logger.debug(
					`DiasporaAPI params for request ${chalk.bold.yellow( queryId )}: `,
					ExpressApiGenerator.getLoggableDiasporaApi( diasporaApi )
				);
				return next();
			} catch ( error ) {
				const catchReq = _.assign( req, {diasporaApi: preParseParams} );
				if ( error instanceof URIError ) {
					return ExpressApiGenerator.respondError( catchReq, res, error, EHttpStatusCode.MethodNotAllowed );
				} else if ( typeof error === 'number' ) {
					return res.status( error ).send();
				} else {
					return ExpressApiGenerator.respondError( catchReq, res, error, EHttpStatusCode.MalformedQuery );
				}
			}
		};
	}

	/**
	 * Generic `delete` handler that can be called by middlewares.
	 * 
	 * @author Gerkin
	 */
	protected static deleteHandler: IModelRequestApplier = async function( queryNumber, req, res, model ) {
		if ( _.isEmpty( req.diasporaApi.where ) ) {
			return res.status( EHttpStatusCode.MalformedQuery ).send( {
				message: `${req.method} requires a "where" clause`,
			} );
		} else {
			const {where, options} = req.diasporaApi;
			try {
				if ( queryNumber === EQueryPlurality.SINGULAR ) {
					await model.delete( where, options );
				} else {
					await model.deleteMany( where, options );
				}
				return res.status( EHttpStatusCode.NoContent ).json();
			} catch ( error ) {
				return ExpressApiGenerator.respondError( req, res, error );
			}
		}
	};
	

	/**
	 * Generic `find` handler that can be called by middlewares.
	 * 
	 * @author Gerkin
	 */
	protected static findHandler: IModelRequestApplier = async function( queryNumber, req, res, model ) {
		const {where, options} = req.diasporaApi;
		try {
			if ( queryNumber === EQueryPlurality.SINGULAR ) {
				return ExpressApiGenerator.respondMaybeNoEntity( res, await model.find( where, options ) );
			} else {
				return ExpressApiGenerator.respondMaybeEmptySet( res, await model.findMany( where, options ) );
			}
		} catch ( error ) {
			return ExpressApiGenerator.respondError( req, res, error );
		}
	};


	/**
	 * Generic `insert` handler that can be called by middlewares.
	 * 
	 * @author Gerkin
	 */
	protected static insertHandler: IModelRequestApplier = async function( queryNumber, req, res, model ) {
		const {body} = req.diasporaApi;
		try {
			if ( queryNumber === EQueryPlurality.SINGULAR ) {
				return ExpressApiGenerator.respondMaybeNoEntity( res, await ( model.spawn( body ).persist() ), EHttpStatusCode.Created );
			} else {
				return ExpressApiGenerator.respondMaybeEmptySet( res, await ( model.spawnMany( body ).persist() ), EHttpStatusCode.Created );
			}
		} catch ( error ) {
			return ExpressApiGenerator.respondError( req, res, error );
		}
	};
	

	/**
	 * Generic `update` handler that can be called by middlewares.
	 * 
	 * @author Gerkin
	 */
	protected static updateHandler: IModelRequestApplier = async function( queryNumber, req, res, model ) {
		if ( _.isEmpty( req.diasporaApi.where ) ) {
			return res.status( EHttpStatusCode.MalformedQuery ).send( {
				message: `${req.method} requires a "where" clause`,
			} );
		} else {
			const {where, body, options} = req.diasporaApi;
			try {
				if ( queryNumber === EQueryPlurality.SINGULAR ) {
					return ExpressApiGenerator.respondMaybeNoEntity( res, await model.update( where, body, options ) );
				} else {
					return ExpressApiGenerator.respondMaybeEmptySet( res, await model.updateMany( where, body, options ) );
				}
			} catch ( error ) {
				return ExpressApiGenerator.respondError( req, res, error );
			}
		}
	};
	

	/**
	 * Generic `update` handler that can be called by middlewares. it has the particularity of fully replacing entities attributes, keeping only IDs.
	 * 
	 * @author Gerkin
	 */
	protected static replaceHandler: IModelRequestApplier = async function( queryNumber, req, res, model ){
		if ( _.isEmpty( req.diasporaApi.where ) ) {
			return res.status( EHttpStatusCode.MalformedQuery ).send( {
				message: `${req.method} requires a "where" clause`,
			} );
		} else {
			const {where, options} = req.diasporaApi;
			const replaceEntity = ( entity: Entities.Entity ) => {
				entity.replaceAttributes( _.clone( req.diasporaApi.body ) );
				return entity;
			};
			try {
				if ( queryNumber === EQueryPlurality.SINGULAR ) {
					const foundEntity = await model.find( where, options );
					if ( foundEntity ) {
						const updatedEntity = replaceEntity( foundEntity );
						const persistedEntity = await updatedEntity.persist();
						return ExpressApiGenerator.respondMaybeNoEntity( res, persistedEntity );
					} else {
						return ExpressApiGenerator.respondMaybeNoEntity( res, null );
					}
				} else {
					const foundSet = await model.findMany( where, options );
					const updatedSet = new Entities.Set( model, foundSet.entities.map( replaceEntity ) );
					const persistedSet = await updatedSet.persist();
					return ExpressApiGenerator.respondMaybeEmptySet( res, persistedSet );
				}
			} catch ( error ) {
				return ExpressApiGenerator.respondError( req, res, error );
			}
		}
	};
	
	/**
	 * Hash of espress middlewares to bind to router.
	 * 
	 * @author Gerkin
	 */
	protected static handlers: { [key: string]: IHookFunction<IDiasporaApiRequest> } = {
		// Singular
		_delete( req, res, next, model ) {
			return ExpressApiGenerator.deleteHandler( EQueryPlurality.SINGULAR, req, res, model );
		},
		
		_get( req, res, next, model ) {
			return ExpressApiGenerator.findHandler( EQueryPlurality.SINGULAR, req, res, model );
		},
		_patch( req, res, next, model ) {
			return ExpressApiGenerator.updateHandler( EQueryPlurality.SINGULAR, req, res, model );
		},
		_post( req, res, next, model ) {
			return ExpressApiGenerator.insertHandler( EQueryPlurality.SINGULAR, req, res, model );
		},
		_put( req, res, next, model ) {
			return ExpressApiGenerator.replaceHandler( EQueryPlurality.SINGULAR, req, res, model );
		},
		
		// Plurals
		delete( req, res, next, model ) {
			return ExpressApiGenerator.deleteHandler( EQueryPlurality.PLURAL, req, res, model );
		},
		get( req, res, next, model ) {
			return ExpressApiGenerator.findHandler( EQueryPlurality.PLURAL, req, res, model );
		},
		patch( req, res, next, model ) {
			return ExpressApiGenerator.updateHandler( EQueryPlurality.PLURAL, req, res, model );
		},
		post( req, res, next, model ) {
			return ExpressApiGenerator.insertHandler( EQueryPlurality.PLURAL, req, res, model );
		},
		put( req, res, next, model ) {
			return ExpressApiGenerator.replaceHandler( EQueryPlurality.PLURAL, req, res, model );
		},
	};

	/**
	 * Binds the instance router with each route verbs.
	 * 
	 * @param apiNumber - Number of entities that this router will bind.
	 * @param route     - Path to the API endpoint
	 * @param modelName - Name of the model that is targetted.
	 * @author Gerkin
	 */
	protected bind( apiNumber: EQueryPlurality, route: string, modelName: string ){
		const modelApi = this._modelsConfiguration[modelName];
		const partialize = ( methods: Array<_.Many<IHookFunction<IDiasporaApiRequest> | undefined>> ) =>
		_.chain( methods )
		.flatten()
		.compact()
		.map( ( func ) => _.ary( func, 4 ) )
		.map( ( func ) => _.partialRight( func, modelApi.model ) )
		.value();
		
		this._middleware
		.route( route )
		.all( partialize( [
			this.prepareQueryHandling( apiNumber ),
			modelApi.middlewares.all,
		] ) )
		.delete( partialize( this.getRelevantHandlers( modelApi, apiNumber, EQueryAction.DELETE, HttpVerb.DELETE ) ) )
		.get( partialize( this.getRelevantHandlers( modelApi, apiNumber, EQueryAction.FIND, HttpVerb.GET ) ) )
		.patch( partialize( this.getRelevantHandlers( modelApi, apiNumber, EQueryAction.UPDATE, HttpVerb.PATCH ) ) )
		.post( partialize( this.getRelevantHandlers( modelApi, apiNumber, EQueryAction.INSERT, HttpVerb.POST ) ) )
		.put( partialize( this.getRelevantHandlers( modelApi, apiNumber, EQueryAction.REPLACE, HttpVerb.PUT ) ) );
	}

	/**
	 * Respond to the request with a map of the API.
	 * 
	 * @param req - express request to answer to with API map.
	 * @param res - express response which we are responding to.
	 * @returns Returns the answered response.
	 * @author Gerkin
	 */
	protected optionsHandler( req: express.Request, res: express.Response ) {
		return res.json( _.mapValues( this._modelsConfiguration, apiDesc => ( {
			[`/${apiDesc.singular}/$ID`]: this.generateApiMap( apiDesc, EQueryPlurality.SINGULAR, req.baseUrl ),
			[`/${apiDesc.plural}`]: this.generateApiMap( apiDesc, EQueryPlurality.PLURAL, req.baseUrl ),
		} ) ) );
	}

	/**
	 * Generates the API map of the specified endpoint. This is usually used with the `options` verb.
	 * 
	 * @param modelApi    - Model api configuration to answer to
	 * @param queryNumber - The action number to get map for.
	 * @param baseUrl     - Base URL of the endpoint (usually taken from the express request).
	 * @returns Object containing the API map.
	 */
	protected generateApiMap( modelApi: IModelConfiguration, queryNumber: EQueryPlurality, baseUrl: string ){
		const singularRouteName = `/${modelApi.plural}`;
		const pluralRouteName = `/${modelApi.singular}/$ID`;
		return queryNumber === EQueryPlurality.PLURAL ? {
				path: singularRouteName,
				description: `Base API to query on SEVERAL items of ${modelApi.model.name}`,
				canonicalUrl: `${baseUrl}${singularRouteName}`,
		} : {
				path: pluralRouteName,
				description: `Base API to query on a SINGLE item of ${modelApi.model.name}`,
				parameters: {
					$ID: {
						optional: true,
						description: 'Id of the item to match',
					},
				},
				canonicalUrl: `${baseUrl}${pluralRouteName}`,
		};
	}
	
	/**
	 * Gets the handler to use with the provided query configuration. This is used at initialization for short binding.
	 * 
	 * @param modelApi   - Description of the API to bind
	 * @param apiNumber  - Numbering of the API.
	 * @param actionName - Action done by the handlers to get.
	 * @param methodName - HTTP verb that matches the handlers to get.
	 */
	protected getRelevantHandlers ( modelApi: IModelConfiguration, apiNumber: EQueryPlurality, actionName: EQueryAction, methodName: HttpVerb ){
		const action: 'find' | 'delete' | 'update' | 'insert' | 'replace' = actionName.toLowerCase() as any;
		const method: 'get' | 'delete' | 'patch' | 'post' | 'put' = methodName.toLowerCase() as any;
		const middlewares = modelApi.middlewares;
		
		return [
			middlewares[method],
			middlewares[action],
			( middlewares as any )[action + ( EQueryPlurality.SINGULAR === apiNumber ? 'One' : 'Many' )],
			( ExpressApiGenerator.handlers as any )[( EQueryPlurality.SINGULAR === apiNumber ? '_' : '' ) + method],
		] as Array<_.Many<IHookFunction<IDiasporaApiRequest> | undefined>>;
	}
}
