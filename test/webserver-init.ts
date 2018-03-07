import express from 'express';
import http from 'http';

const Diaspora = require( 'diaspora' );

import { buildApi as DiasporaServer } from '../src/diaspora-server';
const config = require( './config' );

export const inMemorySource = Diaspora.createNamedDataSource(
	'myDataSource',
	'inMemory',
	{},
);

export const PhoneBook = Diaspora.declareModel( 'PhoneBook', {
	sources: ['myDataSource'],
	attributes: {
		name: {
			type: 'string',
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
} );
Diaspora.declareModel( 'Ignored', {
	sources: ['myDataSource'],
	attributes: {},
} );

const app = express();
app.use(
	'/api',
	DiasporaServer( {
		webserverType: 'express',
		models: {
			PhoneBook: {
				singular: 'PhoneBook',
				plural: 'PhoneBooks',
			},
			Ignored: false,
		},
	} ),
);

export const server: ( port: number ) => Promise<http.Server> = ( port: number ) =>
	new Promise( ( resolve, reject ) => {
		const httpServer = app.listen( port, () => {
			console.log( `Example app listening on port ${port}!` );
			resolve( httpServer );
		} );
	} );
