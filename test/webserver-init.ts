import express = require( 'express' );
import http from 'http';
import * as _ from 'lodash';

import { Diaspora } from '@diaspora/diaspora';
import { InMemoryEntity } from '@diaspora/diaspora/dist/lib/adapters/inMemory';

import { buildApi as DiasporaServer } from '../src/diaspora-server';
import { datas } from './mock';

export const inMemorySource = Diaspora.createNamedDataSource(
	'myDataSource',
	'inMemory',
	{}
);

const MODEL_NAME = 'PhoneBook';

export const PhoneBook = Diaspora.declareModel( MODEL_NAME, {
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

export const store: { items: any[] } = ( inMemorySource.adapter as any ).store[MODEL_NAME];

export const resetMock = () => {
	store.items = [];
	_.forEach( datas, ( entity ) => {
		store.items.push( InMemoryEntity.setId( _.cloneDeep( entity ), inMemorySource.adapter ) );
	} );
};

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
	} )
);

export const server: ( port: number ) => Promise<http.Server> = ( port: number ) =>
	new Promise( ( resolve, reject ) => {
		const httpServer = app.listen( port, () => {
			console.log( `Example app listening on port ${port}!` );
			resolve( httpServer );
		} );
	} );
