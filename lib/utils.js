'use strict';

const _ = require( 'lodash' );
const util = require( 'util' );
const Diaspora = require( 'diaspora' );
const Minimatch = require( 'minimatch' ).Minimatch;

const applySelector = ( oldVal, newVal ) => {
	if ( _.isObject( newVal )) {
		if ( _.isObject( oldVal )) {
			return _.assign( oldVal, newVal );
		} else {
			return _.clone( newVal );
		}
	} else {
		return newVal;
	}
};

var Utils = {
	configureList( pickers, set ) {
		const configurationObject = {};
		_.forEach( pickers, ( picker, key ) => {
			let matcher;
			// If the key is neither a regex nor a minimatch (check for `*`), this var will be set to `false`
			let maybeMatch = true;

			if ( key.startsWith( '/' ) && key.endsWith( '/' )) {
				const regex = new RegExp( key.slice( 1 ).slice( 0, -1 ));
				matcher = name => {
					return !_.isNil( name.match( regex ));
				};
			} else if ( key.includes( '*' )) {
				const mm = new Minimatch( key, {});
				matcher = name => {
					return mm.match( name );
				};
			} else {
				maybeMatch = false;
			}

			if ( maybeMatch ) {
				// Matching is optionnal
				_.forEach( set, element => {
					if ( matcher( element )) {
						configurationObject[element] = applySelector( configurationObject[element], picker );
					}
				});
			} else {
				// Matching is required
				if ( -1 === set.indexOf( key )) {
					throw new ReferenceError( `Trying to match unexistent key ${ key } in ${ JSON.stringify( set ) }.` );
				}
				configurationObject[key] = applySelector( configurationObject[key], picker );
			}
		});
		return _.pickBy( configurationObject );
	},
	prettylog( object, config ) {
		config = _.defaults( config, {
			colors: true,
			depth:  8,
		});
		console.log( util.inspect( object, config ));
	},
	respondError( res, error ) {
		const jsonError = _.assign({}, error);
		jsonError.message = error.message;
		if(error instanceof Diaspora.components.Errors.ValidationError){
			Diaspora.logger.debug( `Request ${res.req.diasporaApi.id} triggered a validation error:`, error );
			return res.status( 400 ).send( jsonError );
		} else {
			Diaspora.logger.error( `Request ${res.req.diasporaApi.id} triggered an error:`, error );
			return res.status( 500 ).send( jsonError );
		}
	},
};

module.exports = Utils;
