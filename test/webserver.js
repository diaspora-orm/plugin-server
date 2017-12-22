'use strict';

const express = require( 'express' );
const app = express();
const Diaspora = require( 'diaspora' );

const inMemorySource = Diaspora.createNamedDataSource( 'myDataSource', 'inMemory', {});
const PhoneBook = Diaspora.declareModel( 'PhoneBook', {
	sources:    [ 'myDataSource' ],
	attributes: {
		name: {
			type:     'string',
			required: true,
		},
		phone: 'string',
		email: {
			type: 'string',
		},
		index: {
			type: 'integer',
		},
	},
});
/*const Ignored = */Diaspora.declareModel( 'Ignored', {
	sources:    [ 'myDataSource' ],
	attributes: {},
});

const DiasporaServer = require( '../index' );
app.use( '/api', DiasporaServer({
	webserverType: 'express',
	models:        {
		PhoneBook: {
			singular: 'PhoneBook',
			plural:   'PhoneBooks',
		},
		Ignored: false,
	},
}));

const config = require( './config' );
const server = app.listen( config.port, () => {
	console.log( `Example app listening on port ${ config.port }!` );
	if ( module.exports.after ) {
		module.exports.after();
	}
});

module.exports = {
	server,
	PhoneBook,
	inMemorySource,
};
