import _ = require( 'lodash' );

import { QueryLanguage, Entities, Diaspora } from '@diaspora/diaspora';
import { IModelConfiguration, IConfigurationRaw } from './diaspora-server';
import { configureList } from './utils';

const QUERY_OPTS = ['skip', 'limit', 'sort', 'page'];

export abstract class ApiGenerator<T>{

	protected _middleware: T;
	public get middleware() {
		return this._middleware;
	}

	protected _modelsConfiguration: _.Dictionary<IModelConfiguration>;

	protected constructor( configHash: IConfigurationRaw ){
		// Get only models authorized
		const allModels = _.keys( Diaspora.models );
		const configuredModels = ( () => {
			try {
				return configureList( configHash.models, allModels ) || {};
			} catch ( error ) {
				if ( error instanceof ReferenceError ) {
					throw new ReferenceError(
						`Tried to configure Diaspora Server with unknown model. Original message: ${
							error.message
						}.${allModels.length === 0 ? '\nSee http://www.foo.bar for more infos.' : ''}`
					);
				} else {
					throw error;
				}
			}
		} )();
		
	
		
		// Configure router
		this._modelsConfiguration = _.mapValues( configuredModels, ( apiDesc, modelName ) => {
			const defaultedApiDest = apiDesc === true ? {} : apiDesc;
			const defaulted = _.defaults( apiDesc, {
				singular: modelName.toLowerCase(),
				plural: `${modelName.toLowerCase()}s`,
				middlewares: {},
			} );
			Diaspora.logger.verbose( `Exposing ${modelName}`, apiDesc );
			const model = Diaspora.models[modelName];
			const modelConfiguration = _.assign( defaulted, {model} ) as IModelConfiguration;
			return modelConfiguration;
		} );
	}

	public static parseQuery( queryObj: object ){
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
	}
	public static setIdFromIdHash( entity: Entities.Entity ){
		const retVal = entity.toObject();
		if ( retVal ) {
			retVal.id = entity.id;
		}
		return retVal;
	}
}
