// TODO: Define interface, and skip this import.
import express from 'express';
import * as _ from 'lodash';
import { Minimatch } from 'minimatch';
import { inspect, InspectOptions } from 'util';

import Diaspora from '@diaspora/diaspora/lib';
import { ValidationError } from '@diaspora/diaspora/lib/errors/validationError';
import { IDiasporaApiRequest, IDiasporaApiRequestDescriptor, IDiasporaApiRequestDescriptorPreParse } from './diaspora-server';

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

export enum EQueryAction {
	FIND = 'find',
	DELETE = 'delete',
	UPDATE = 'update',
	INSERT = 'insert',
	REPLACE = 'replace',
}
export enum EQueryNumber {
	SINGULAR = 'singular',
	PLURAL = 'plural',
}

const applySelector = <T1, T2>( oldVal: T1, newVal: T2 ): T2 | ( T1 & T2 ) => {
	if ( _.isObject( newVal ) ) {
		if ( _.isObject( oldVal ) ) {
			return _.assign( {}, oldVal, newVal );
		} else {
			return _.clone( newVal );
		}
	} else {
		return newVal;
	}
};

export const configureList = <T extends object>(
	pickers: { [key: string]: T | boolean },
	set: string[]
) => {
	// TODO: detail
	const configurationObject: { [key: string]: T | undefined | boolean } = {};

	_.forEach( pickers, ( picker, key ) => {
		// If the key is a regex or a minimatch (check for `*`), this var will be set to a function
		let matcher: ( ( name: string ) => boolean ) | false = false;

		if ( key.startsWith( '/' ) && key.endsWith( '/' ) ) {
			const regex = new RegExp( key.slice( 1 ).slice( 0, -1 ) );
			matcher = ( name: string ) => {
				return !_.isNil( name.match( regex ) );
			};
		} else if ( key.includes( '*' ) ) {
			const mm = new Minimatch( key, {} );
			matcher = ( name: string ) => {
				return mm.match( name );
			};
		}

		if ( !matcher ) {
			// Matching is required
			if ( -1 === set.indexOf( key ) ) {
				throw new ReferenceError(
					`Trying to match unexistent key ${key} in ${JSON.stringify( set )}.`
				);
			}
			configurationObject[key] = applySelector( configurationObject[key], picker );
		} else {
			const subMatcher = matcher;
			// Matching is optionnal
			_.forEach( set, ( element ) => {
				if ( subMatcher( element ) ) {
					configurationObject[element] = applySelector(
						configurationObject[element],
						picker
					);
				}
			} );
		}
	} );
	return _.pickBy( configurationObject );
};

export const prettylog = ( object: any, config: InspectOptions = {} ) => {
	config = _.defaults( config, {
		colors: true,
		depth: 8,
	} );
	console.log( inspect( object, config ) );
};

export interface JsonError {
	message?: string;
}

export const respondError = (
	req: IDiasporaApiRequest<IDiasporaApiRequestDescriptorPreParse>,
	res: express.Response,
	error?: Error,
	status?: number
) => {
	const jsonError: JsonError = _.assign( {}, error );
	jsonError.message = _.isError( error )
	? error.message || error.toString()
	: undefined;

 const isValidationError = error instanceof ValidationError;
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
};

export const getLoggableDiasporaApi = ( diasporaApi: IDiasporaApiRequestDescriptorPreParse ) => {
	const diasporaApiParsed = diasporaApi as IDiasporaApiRequestDescriptor;
	return _.assign( {}, _.omit( diasporaApi, ['id', 'target'] ), {
		model: diasporaApi.model.name,
		targetFound: diasporaApiParsed.urlId ? !_.isNil( diasporaApiParsed.target ) : undefined,
	} );
};
