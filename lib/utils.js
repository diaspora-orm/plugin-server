'use strict';

const _ = require( 'lodash' );
const util = require( 'util' );
const Minimatch = require( 'minimatch' ).Minimatch;

const applySelector = ( oldVal, newVal ) => {
	if ( _.isObject( newVal )) {
		if ( _.isObject( oldVal )) {
			return _.assign( oldVal, newVal );
		} else {
			return _.clone(newVal);
		}
	} else {
		return newVal;
	}
};

var Utils = {
	configureList: function( picker, set ) {
		const configurationObject = {};
		_.forEach( picker, ( picker, key ) => {
			let matcher;

			if ( key.startsWith( '/' ) && key.endsWith( '/' )) {
				const regex = new RegExp( key.slice( 1 ).slice( 0, -1 ));
				matcher = name => {
					return !_.isNil(name.match(regex));
				};
			} else {
				const mm = new Minimatch( key, {});
				matcher = name => {
					return mm.match( name );
				};
			}
			_.forEach( set, element => {
				if ( matcher( element )) {
					configurationObject[element] = applySelector( configurationObject[element], picker );
				}
			});
		});
		return _.pickBy( configurationObject );
	},
	/*prettylog( object, config ) {
		config = _.defaults( config, {
			colors: true,
			depth:  8,
		});
		console.log( util.inspect( object, config ));
	},*/
};

module.exports = Utils;
