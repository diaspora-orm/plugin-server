import { isObject, assign, clone, forEach, isNil, pickBy, defaults } from 'lodash';
import { Minimatch } from 'minimatch';
import { inspect, InspectOptions } from 'util';


/**
 * Name of the Diaspora actions doable. Combined with {@link EQueryPlurality}, it defines the method to call on the model.
 */
export enum EQueryAction {
	FIND = 'find',
	DELETE = 'delete',
	UPDATE = 'update',
	INSERT = 'insert',
	REPLACE = 'replace',
}

/**
 * Types of actions to do. Combined with {@link EQueryAction}, it defines the method to call on the model.
 */
export enum EQueryPlurality {
	SINGULAR = 'singular',
	PLURAL = 'plural',
}

const applySelector = <T1, T2>( oldVal: T1, newVal: T2 ): T2 | ( T1 & T2 ) => {
	if ( isObject( newVal ) ) {
		if ( isObject( oldVal ) ) {
			return assign( {}, oldVal, newVal );
		} else {
			return clone( newVal );
		}
	} else {
		return newVal;
	}
};

export const configureList = <T extends object>( pickers: { [key: string]: T | boolean }, set: string[] ) => {
	const configurationObject: { [key: string]: T | undefined | boolean } = {};

	forEach( pickers, ( picker, key ) => {
		// If the key is a regex or a minimatch (check for `*`), this var will be set to a function
		let matcher: ( ( name: string ) => boolean ) | false = false;

		if ( key.startsWith( '/' ) && key.endsWith( '/' ) ) {
			const regex = new RegExp( key.slice( 1 ).slice( 0, -1 ) );
			matcher = ( name: string ) => {
				return !isNil( name.match( regex ) );
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
			forEach( set, ( element ) => {
				if ( subMatcher( element ) ) {
					configurationObject[element] = applySelector(
						configurationObject[element],
						picker
					);
				}
			} );
		}
	} );
	return pickBy( configurationObject );
};

export const prettylog = ( object: any, config: InspectOptions = {} ) => {
	config = defaults( config, {
		colors: true,
		depth: 8,
	} );
	console.log( inspect( object, config ) );
};

export interface JsonError {
	message?: string;
}
