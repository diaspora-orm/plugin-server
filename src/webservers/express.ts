import bodyParser = require( 'body-parser' );
import chalk from 'chalk';
import express = require( 'express' );
import _ = require( 'lodash' );

import { Diaspora, Model, Errors, Utils, Set, Entity, ELoggingLevel } from '@diaspora/diaspora';

import { IConfigurationRaw, IDiasporaApiRequest, IDiasporaApiRequestDescriptor, IDiasporaApiRequestDescriptorPreParse, THookFunction, IMiddlewareHash, IModelConfiguration, IHookFunctionOrArr } from '../index';
import { EQueryAction, EQueryPlurality, JsonError } from '../utils';
import { ApiGenerator } from '../apiGenerator';
import { ApiError } from '../errors/apiError';
import { ApiSyntaxError } from '../errors/apiSyntaxError';
import { ApiResponseError } from '../errors/apiResponseError';
import { EHttpStatusCode } from '../types';
import minimatch = require( 'minimatch' );

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

export const HttpVerbQuery = {
	[HttpVerb.GET]: EQueryAction.FIND,
	[HttpVerb.DELETE]: EQueryAction.DELETE,
	[HttpVerb.PATCH]: EQueryAction.UPDATE,
	[HttpVerb.POST]: EQueryAction.INSERT,
	[HttpVerb.PUT]: EQueryAction.REPLACE,
};

type TModelRequestApplier<TModel, TRet> = (
	queryNumber: EQueryPlurality,
	req: IDiasporaApiRequest<TModel>,
	res: express.Response,
	model: Model<TModel>
) => Promise<TRet>;

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
			.use( ( req, res, next ) => {
				const accept = req.headers['accept'];
				if ( !accept || !minimatch( 'application/json', accept.toLowerCase() ) ){
					const error = new Error( `Unsupported Accept MIME "${accept}". This API only supports "application/json".` );
					return ExpressApiGenerator.respondNativeError( req as any, res, ApiResponseError.UnsupportedMediaType( error ) );
				}
				return next();
			} )
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
	protected static respondMaybeEmptySet<TModel>( res: express.Response, set: Set<TModel>, responseCode = EHttpStatusCode.Ok ) {
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
	protected static respondMaybeNoEntity<TModel>( res: express.Response, entity: Entity<TModel> | null, responseCode = EHttpStatusCode.Ok ) {
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
	protected static async castToDiasporaApiRequest<TModel>(
		request: express.Request,
		diasporaApi: IDiasporaApiRequestDescriptorPreParse<TModel>
	): Promise<IDiasporaApiRequestDescriptor<TModel>>{
		const diasporaApiWithParsedQuery = _.assign( diasporaApi, ExpressApiGenerator.parseQuery( request.query ) );

		// Check the type of the input
		if ( EQueryAction.INSERT === diasporaApiWithParsedQuery.action ){
			if ( EQueryPlurality.SINGULAR === diasporaApiWithParsedQuery.number && !_.isObject( diasporaApiWithParsedQuery.body ) ){
				throw ApiResponseError.MalformedQuery( new ApiError( 'Expected a single object' ) );
			} else if ( EQueryPlurality.PLURAL === diasporaApiWithParsedQuery.number &&
				( !_.isArray( diasporaApiWithParsedQuery.body ) || !_.every( diasporaApiWithParsedQuery.body, _.isObject ) ) ){
				throw ApiResponseError.MalformedQuery( new ApiError( 'Expected an array of objects' ) );
			}
		}

		// Populate data with targetted entity
		if ( EQueryPlurality.SINGULAR === diasporaApiWithParsedQuery.number ) {
			const id = _.get( request, 'params[1]' );
			if ( !_.isNil( id ) ) {
				if ( EQueryAction.INSERT === diasporaApiWithParsedQuery.action ) {
					throw ApiResponseError.MethodNotAllowed( new ApiError( 'POST (insert) to explicit ID is forbidden' ) );
				} else {
					const target = await diasporaApi.model.find( id );
					if ( _.isNil( target ) ) {
						throw ApiResponseError.NotFound();
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

	protected static wrapApiErrors( error: Errors.ExtendableError ){
		if ( error instanceof Errors.ValidationError ){
			return ApiResponseError.Forbidden( error );
		} else if ( error instanceof ApiResponseError ){
			return error;
		} else {
			return ApiResponseError.ServerError( error );
		}
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
	protected static respondError<TModel>(
		req: IDiasporaApiRequest<TModel, IDiasporaApiRequestDescriptorPreParse<TModel>>,
		res: express.Response,
		error: Error
	){
		if ( error instanceof Errors.ExtendableError ){
			const wrappedError = ( error instanceof ApiError ? error : this.wrapApiErrors( error ) );

			const message = wrappedError.makeMessage( req );

			switch ( wrappedError.logLevel ){
				case ELoggingLevel.Error:
					Diaspora.logger.error( message );
					break;
				case ELoggingLevel.Debug:
					Diaspora.logger.debug( message );
					break;
			}

			return res.status( wrappedError.statusCode ).send( wrappedError.toJson( req ) );
		} else {
			return this.respondNativeError( req, res, error );
		}
	}

	protected static respondNativeError<TModel>(
		req: IDiasporaApiRequest<TModel, IDiasporaApiRequestDescriptorPreParse<TModel>> ,
		res: express.Response,
		error: Error
	){
		// TODO: Check for environment: if prod, respond a simple non-descriptive error
		Diaspora.logger.error(
			`Request ${_.get(
				res,
				'req.diasporaApi.id',
				'UNKNOWN'
			)} triggered a native error: message is ${JSON.stringify( error.message )}
			Stack trace:
			`, error.stack,
			error
		);
		return res.status( 500 ).send( error.message );
	}

	/**
	 * Gets the loggable version of the request.
	 *
	 * @param diasporaApi - Request descriptor to log.
	 * @returns Object containing a description of the Diaspora request.
	 * @author Gerkin
	 */
	protected static getLoggableDiasporaApi<TModel>( diasporaApi: IDiasporaApiRequestDescriptor<TModel> ){
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
	protected prepareQueryHandling<TModel>( apiNumber: EQueryPlurality ): THookFunction <TModel, express.Request>{
		return async ( req, res, next, model ) => {
			const queryId = Utils.generateUUID();
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
				req = _.assign( req, {diasporaApi} );
				Diaspora.logger.debug(
					`DiasporaAPI params for request ${chalk.bold.yellow( queryId )}: `,
					ExpressApiGenerator.getLoggableDiasporaApi( diasporaApi )
				);
				return next();
			} catch ( error ) {
				const catchReq = _.assign( req, {diasporaApi: preParseParams} );
				return ExpressApiGenerator.respondError( catchReq, res, error );
			}
		};
	}

	/**
	 * Generic `delete` handler that can be called by middlewares.
	 *
	 * @author Gerkin
	 */
	protected static async deleteHandler<TModel>(
		queryNumber: EQueryPlurality,
		req: IDiasporaApiRequest<TModel>,
		res: express.Response,
		model: Model<TModel>
	){
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
	}


	/**
	 * Generic `find` handler that can be called by middlewares.
	 *
	 * @author Gerkin
	 */
	protected static async findHandler<TModel>(
		queryNumber: EQueryPlurality,
		req: IDiasporaApiRequest<TModel>,
		res: express.Response,
		model: Model<TModel>
	){
		const {where, options} = req.diasporaApi;
		try {
			if ( queryNumber === EQueryPlurality.SINGULAR ) {
				return ExpressApiGenerator.respondMaybeNoEntity( res, await model.find( where, options ) );
			} else {
				return ExpressApiGenerator.respondMaybeEmptySet( res, await model.findMany( where, options ) );
			}
		} catch ( error ) {
			console.error( error );
			return ExpressApiGenerator.respondError( req, res, error );
		}
	}


	/**
	 * Generic `insert` handler that can be called by middlewares.
	 *
	 * @author Gerkin
	 */
	protected static async insertHandler<TModel>(
		queryNumber: EQueryPlurality,
		req: IDiasporaApiRequest<TModel>,
		res: express.Response,
		model: Model<TModel>
	){
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
	}


	/**
	 * Generic `update` handler that can be called by middlewares.
	 *
	 * @author Gerkin
	 */
	protected static async updateHandler<TModel>(
		queryNumber: EQueryPlurality,
		req: IDiasporaApiRequest<TModel>,
		res: express.Response,
		model: Model<TModel>
	){
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
	}


	/**
	 * Generic `update` handler that can be called by middlewares. it has the particularity of fully replacing entities attributes, keeping only IDs.
	 *
	 * @author Gerkin
	 */
	protected static async replaceHandler<TModel>(
		queryNumber: EQueryPlurality,
		req: IDiasporaApiRequest<TModel> ,
		res: express.Response,
		model: Model<TModel>
	){
		if ( _.isEmpty( req.diasporaApi.where ) ) {
			return res.status( EHttpStatusCode.MalformedQuery ).send( {
				message: `${req.method} requires a "where" clause`,
			} );
		} else {
			const {where, options} = req.diasporaApi;
			const replaceEntity = ( entity: Entity<TModel> ) => {
				entity.attributes = _.clone( req.diasporaApi.body );
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
					const updatedSet = new Set( model, foundSet.entities.map( replaceEntity ) );
					const persistedSet = await updatedSet.persist();
					return ExpressApiGenerator.respondMaybeEmptySet( res, persistedSet );
				}
			} catch ( error ) {
				return ExpressApiGenerator.respondError( req, res, error );
			}
		}
	}

	/**
	 * Hash of express middlewares to bind to router.
	 *
	 * @author Gerkin
	 */
	protected static handlers: { [key: string]: THookFunction<any, IDiasporaApiRequest<any>> } = {
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

		forbidden( req, res, next, model ){
			return res.status( 403 ).send( 'Forbidden' );
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
		const partialize = <TModel>( methods: Array<THookFunction<TModel, IDiasporaApiRequest<TModel>>> ) =>
		_.chain( methods )
			.map( ( func ) => _.ary( func, 4 ) )
			.map( ( func ) => _.partialRight( func, modelApi.model ) )
			.value();

		this._middleware
		.route( route )
		.options( ( req, res ) => res.status( 200 ).send() )
		.all( partialize( [
			this.prepareQueryHandling( apiNumber ),
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
		return res.json( {
			apiType: require( '../../package.json' ).name,
			version: require( '../../package.json' ).version,
			routes: _.mapValues( this._modelsConfiguration, apiDesc => ( {
				[`/${apiDesc.singular}/$ID`]: this.generateApiMap( apiDesc, EQueryPlurality.SINGULAR, req.baseUrl ),
				[`/${apiDesc.plural}`]: this.generateApiMap( apiDesc, EQueryPlurality.PLURAL, req.baseUrl ),
			} ) ),
		} );
	}

	/**
	 * Generates the API map of the specified endpoint. This is usually used with the `options` verb.
	 *
	 * @param modelApi    - Model api configuration to answer to
	 * @param queryNumber - The action number to get map for.
	 * @param baseUrl     - Base URL of the endpoint (usually taken from the express request).
	 * @returns Object containing the API map.
	 */
	protected generateApiMap<TModel>( modelApi: IModelConfiguration<TModel> , queryNumber: EQueryPlurality, baseUrl: string ){
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
	 * @param action - Action done by the handlers to get.
	 * @param verb - HTTP verb that matches the handlers to get.
	 */
	protected getRelevantHandlers<TModel>(
		modelApi: IModelConfiguration<TModel>,
		apiNumber: EQueryPlurality,
		action: EQueryAction,
		verb: HttpVerb
	) : Array<THookFunction<TModel, IDiasporaApiRequest<TModel>>>{
		const actionLowered: 'find' | 'delete' | 'update' | 'insert' | 'replace' = action.toLowerCase() as any;
		const verbLowered: 'get' | 'patch' | 'post' | 'put' = verb.toLowerCase() as any;
		const middlewares = modelApi.middlewares;

		// Get all handlers that apply to this verb
		const relevantSpecificMiddlewares = _.uniq( _.reject( [
			middlewares[verbLowered],
			middlewares[actionLowered],
			( middlewares as any )[actionLowered + ( EQueryPlurality.SINGULAR === apiNumber ? 'One' : 'Many' )] as IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean | undefined,
		], _.isNil ) );
		if (
			( middlewares.all === false && relevantSpecificMiddlewares.length > 0 )  ||
			_.some( relevantSpecificMiddlewares, item => item === false )
		) {
			return [ExpressApiGenerator.handlers.forbidden];
		}

		const allFunctions = _.chain( relevantSpecificMiddlewares as any )
			.flattenDeep<THookFunction<TModel, IDiasporaApiRequest<TModel>> | true>()
			.reject( handler => handler === true )
			.value() as Array<THookFunction<TModel, IDiasporaApiRequest<TModel>>>;

		const actionHandler = ( ExpressApiGenerator.handlers as any )[( EQueryPlurality.SINGULAR === apiNumber ? '_' : '' ) + verbLowered];
		allFunctions.push( actionHandler );
		return allFunctions;
	}
}
