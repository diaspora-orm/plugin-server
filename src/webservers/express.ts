import bodyParser = require( 'body-parser' );
import chalk from 'chalk';
import express = require( 'express' );
import _ = require( 'lodash' );

import { Diaspora, Entities, Model, Errors } from '@diaspora/diaspora/dist/lib/index';

import { generateUUID } from '@diaspora/diaspora/dist/lib/utils';

import { IConfigurationRaw, IDiasporaApiRequest, IDiasporaApiRequestDescriptor, IDiasporaApiRequestDescriptorPreParse, IHookFunction, IMiddlewareHash, IModelConfiguration } from '../diaspora-server';
import { EQueryAction, EQueryNumber, JsonError } from '../utils';
import { ApiGenerator } from '../apiGenerator';

export enum HttpVerb {
	GET = 'GET',
	DELETE = 'DELETE',
	PATCH = 'PATCH',
	POST = 'POST',
	PUT = 'PUT',
}
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

type IModelRequestApplier = (
	queryNumber: EQueryNumber,
	req: IDiasporaApiRequest,
	res: express.Response,
	model: Model
) => Promise<any>;

/**
 * > *Note:* the middleware router is already bound with bodyParser urlencoded & json.
 */
export class ExpressDiasporaServer extends ApiGenerator<express.Router> {
	public constructor( configHash: IConfigurationRaw ){
		super( configHash );
		
		// Create the subrouter
		this._middleware = express.Router()
		// parse application/x-www-form-urlencoded
		.use( bodyParser.urlencoded( { extended: false } ) )
		// parse application/json
		.use( bodyParser.json() );
		
		// Configure router
		_.forEach( this._modelsConfiguration, ( apiDesc, modelName ) => {
			this.bind(
				EQueryNumber.SINGULAR,
				`/${apiDesc.singular}(/*)?`,
				modelName
			);
			this.bind(
				EQueryNumber.PLURAL,
				`/${apiDesc.plural}`,
				modelName
			);
		} );
		this._middleware.options( '', this.optionsHandler.bind( this ) );
	}
	
	protected static respondMaybeEmptySet( res: express.Response, set: Entities.Set, responseCode = EHttpStatusCode.Ok ) {
		res.status( 0 === set.length ? EHttpStatusCode.NoContent : responseCode );
		return res.json( set.entities.map( ExpressDiasporaServer.setIdFromIdHash ) );
	}
	protected static respondMaybeNoEntity ( res: express.Response, entity: Entities.Entity | null, responseCode = EHttpStatusCode.Ok ) {
		if ( _.isNil( entity ) ) {
			return res.status( EHttpStatusCode.NoContent ).send();
		} else {
			return res.status( responseCode ).json( ExpressDiasporaServer.setIdFromIdHash( entity ) );
		}
	}
	
	protected static async castToDiasporaApiRequest ( request: express.Request, diasporaApi: IDiasporaApiRequestDescriptorPreParse ): Promise<IDiasporaApiRequestDescriptor>{
		const diasporaApiWithParsedQuery = _.assign( diasporaApi, ExpressDiasporaServer.parseQuery( request.query ) );
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
	}
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
	
	protected static getLoggableDiasporaApi( diasporaApi: IDiasporaApiRequestDescriptorPreParse ){
		const diasporaApiParsed = diasporaApi as IDiasporaApiRequestDescriptor;
		return _.assign( {}, _.omit( diasporaApi, ['id', 'target'] ), {
			model: diasporaApi.model.name,
			targetFound: diasporaApiParsed.urlId ? !_.isNil( diasporaApiParsed.target ) : undefined,
		} );
	}

	protected prepareQueryHandling( apiNumber: EQueryNumber ): IHookFunction<express.Request>{
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
				const diasporaApi = await ExpressDiasporaServer.castToDiasporaApiRequest( req, preParseParams );
				const reqExtended = _.assign( req, {diasporaApi} );
				Diaspora.logger.debug(
					`DiasporaAPI params for request ${chalk.bold.yellow( queryId )}: `,
					ExpressDiasporaServer.getLoggableDiasporaApi( diasporaApi )
				);
				return next();
			} catch ( error ) {
				const catchReq = _.assign( req, {diasporaApi: preParseParams} );
				if ( error instanceof URIError ) {
					return ExpressDiasporaServer.respondError( catchReq, res, error, EHttpStatusCode.MethodNotAllowed );
				} else if ( typeof error === 'number' ) {
					return res.status( error ).send();
				} else {
					return ExpressDiasporaServer.respondError( catchReq, res, error, EHttpStatusCode.MalformedQuery );
				}
			}
		};
	}

	protected static deleteHandler: IModelRequestApplier = async function( queryNumber, req, res, model ) {
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
				return ExpressDiasporaServer.respondError( req, res, error );
			}
		}
	};
	
	protected static findHandler: IModelRequestApplier = async function( queryNumber, req, res, model ) {
		const {where, options} = req.diasporaApi;
		try {
			if ( queryNumber === EQueryNumber.SINGULAR ) {
				return ExpressDiasporaServer.respondMaybeNoEntity( res, await model.find( where, options ) );
			} else {
				return ExpressDiasporaServer.respondMaybeEmptySet( res, await model.findMany( where, options ) );
			}
		} catch ( error ) {
			return ExpressDiasporaServer.respondError( req, res, error );
		}
	};
	protected static insertHandler: IModelRequestApplier = async function( queryNumber, req, res, model ) {
		const {body} = req.diasporaApi;
		try {
			if ( queryNumber === EQueryNumber.SINGULAR ) {
				return ExpressDiasporaServer.respondMaybeNoEntity( res, await ( ( await model.spawn( body ) ).persist() ), EHttpStatusCode.Created );
			} else {
				return ExpressDiasporaServer.respondMaybeEmptySet( res, await ( ( await model.spawnMany( body ) ).persist() ), EHttpStatusCode.Created );
			}
		} catch ( error ) {
			return ExpressDiasporaServer.respondError( req, res, error );
		}
	};
	
	protected static updateHandler: IModelRequestApplier = async function( queryNumber, req, res, model ) {
		if ( _.isEmpty( req.diasporaApi.where ) ) {
			return res.status( EHttpStatusCode.MalformedQuery ).send( {
				message: `${req.method} requires a "where" clause`,
			} );
		} else {
			const {where, body, options} = req.diasporaApi;
			try {
				if ( queryNumber === EQueryNumber.SINGULAR ) {
					return ExpressDiasporaServer.respondMaybeNoEntity( res, await model.update( where, body, options ) );
				} else {
					return ExpressDiasporaServer.respondMaybeEmptySet( res, await model.updateMany( where, body, options ) );
				}
			} catch ( error ) {
				return ExpressDiasporaServer.respondError( req, res, error );
			}
		}
	};
	
	protected static replaceHandler: IModelRequestApplier = async function( queryNumber, req, res, model ){
		if ( _.isEmpty( req.diasporaApi.where ) ) {
			return res.status( EHttpStatusCode.MalformedQuery ).send( {
				message: `${req.method} requires a "where" clause`,
			} );
		} else {
			const {where, body, options} = req.diasporaApi;
			const replaceEntity = ( entity: Entities.Entity ) => {
				entity.replaceAttributes( _.clone( req.diasporaApi.body ) );
				return entity;
			};
			try {
				if ( queryNumber === EQueryNumber.SINGULAR ) {
					const foundEntity = await model.find( where, options );
					if ( foundEntity ) {
						const updatedEntity = replaceEntity( foundEntity );
						const persistedEntity = await updatedEntity.persist();
						return ExpressDiasporaServer.respondMaybeNoEntity( res, persistedEntity );
					} else {
						return ExpressDiasporaServer.respondMaybeNoEntity( res, null );
					}
				} else {
					const foundSet = await model.findMany( where, options );
					const updatedSet = new Entities.Set( model, foundSet.entities.map( replaceEntity ) );
					const persistedSet = await updatedSet.persist();
					return ExpressDiasporaServer.respondMaybeEmptySet( res, persistedSet );
				}
			} catch ( error ) {
				return ExpressDiasporaServer.respondError( req, res, error );
			}
		}
	};
	
	protected static handlers: { [key: string]: IHookFunction<IDiasporaApiRequest> } = {
		// Singular
		_delete( req, res, next, model ) {
			ExpressDiasporaServer.deleteHandler( EQueryNumber.SINGULAR, req, res, model );
		},
		
		_get( req, res, next, model ) {
			ExpressDiasporaServer.findHandler( EQueryNumber.SINGULAR, req, res, model );
		},
		_patch( req, res, next, model ) {
			ExpressDiasporaServer.updateHandler( EQueryNumber.SINGULAR, req, res, model );
		},
		_post( req, res, next, model ) {
			ExpressDiasporaServer.insertHandler( EQueryNumber.SINGULAR, req, res, model );
		},
		_put( req, res, next, model ) {
			ExpressDiasporaServer.replaceHandler( EQueryNumber.SINGULAR, req, res, model );
		},
		
		// Plurals
		delete( req, res, next, model ) {
			ExpressDiasporaServer.deleteHandler( EQueryNumber.PLURAL, req, res, model );
		},
		get( req, res, next, model ) {
			ExpressDiasporaServer.findHandler( EQueryNumber.PLURAL, req, res, model );
		},
		patch( req, res, next, model ) {
			ExpressDiasporaServer.updateHandler( EQueryNumber.PLURAL, req, res, model );
		},
		post( req, res, next, model ) {
			ExpressDiasporaServer.insertHandler( EQueryNumber.PLURAL, req, res, model );
		},
		put( req, res, next, model ) {
			ExpressDiasporaServer.replaceHandler( EQueryNumber.PLURAL, req, res, model );
		},
	};

	protected bind( apiNumber: EQueryNumber, route: string, modelName: string ){
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

	protected optionsHandler( req: express.Request, res: express.Response ) {
		return res.json( _.mapValues( this._modelsConfiguration, apiDesc => ( {
			[`/${apiDesc.singular}/$ID`]: this.generateApiMap( apiDesc, EQueryNumber.SINGULAR, req.baseUrl ),
			[`/${apiDesc.plural}`]: this.generateApiMap( apiDesc, EQueryNumber.PLURAL, req.baseUrl ),
		} ) ) );
	}

	protected generateApiMap( modelApi: IModelConfiguration, queryNumber: EQueryNumber, baseUrl: string ){
		const singularRouteName = `/${modelApi.plural}`;
		const pluralRouteName = `/${modelApi.singular}/$ID`;
		return queryNumber === EQueryNumber.PLURAL ? {
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
	
	protected getRelevantHandlers ( modelApi: IModelConfiguration, apiNumber: EQueryNumber, actionName: EQueryAction, methodName: HttpVerb ){
		const action: 'find' | 'delete' | 'update' | 'insert' | 'replace' = actionName.toLowerCase() as any;
		const method: 'get' | 'delete' | 'patch' | 'post' | 'put' = methodName.toLowerCase() as any;
		const middlewares = modelApi.middlewares;
		
		return [
			middlewares[method],
			middlewares[action],
			( middlewares as any )[action + ( EQueryNumber.SINGULAR === apiNumber ? 'One' : 'Many' )],
			( ExpressDiasporaServer.handlers as any )[( EQueryNumber.SINGULAR === apiNumber ? '_' : '' ) + method],
		] as Array<_.Many<IHookFunction<IDiasporaApiRequest> | undefined>>;
	}
}

export default ( configHash: IConfigurationRaw ) => {
	const expressDiasporaServer = new ExpressDiasporaServer( configHash );
	return expressDiasporaServer.middleware as express.RequestHandler;
};
