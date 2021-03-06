import * as _ from 'lodash';

import { datas, DUPLICATE_DATA } from '../mock';
import { baseAPI, requestApi, stripIdHash } from '../server';
import { resetMock, store } from '../webserver-init';
import { EHttpStatusCode } from '../../src/webservers/express';


beforeEach( resetMock );
describe( 'Replace (PUT)', () => {
	const update = {
		name: 'Josey Passey',
		phone: '332-83-8304',
	};
	describe( 'Single', () => {
		describe( 'Replace by query', () => {
			it( 'OK', async () => {
				const [res, respJson] = await requestApi.putAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: update,
					qs: {
						name: 'Rozanna Neiland',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Ok );
				expect( respJson ).toMatchObject( update );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Not found', async () => {
				const [res, respJson] = await requestApi.putAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: update,
					qs: {
						email: 'NotFound@foo.bar',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NoContent );
				expect( respJson ).toBeUndefined();
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Trigger JSON error', async () => {
				const [res, respJson] = await requestApi.putAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: update,
					qs: {
						query: '{hey:"there"}',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MalformedQuery );
				expect( respJson ).toHaveProperty( 'message' );
				expect( store.items ).toHaveLength( datas.length );
			} );
			it( 'Throw if no "where" clause', async () => {
				const [res, respJson] = await requestApi.putAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MalformedQuery );
				expect( respJson ).toHaveProperty( 'message' );
				expect( store.items ).toHaveLength( 8 );
			} );
		} );
		describe( 'Replace by id in URL', () => {
			it( 'OK', async () => {
				const id = store.items[5].id;
				const [res, respJson] = await requestApi.putAsync( {
					url: `${baseAPI}/PhoneBook/${id}`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Ok );
				const patchedData = _.assign( {}, stripIdHash( store.items[5] ), update );
				expect( respJson ).toMatchObject( patchedData );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Not found', async () => {
				const id = 42;
				const [res, respJson] = await requestApi.putAsync( {
					url: `${baseAPI}/PhoneBook/${id}`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NotFound );
				expect( respJson ).toBeUndefined();
				expect( store.items ).toHaveLength( 8 );
			} );
		} );
	} );
	describe( 'Mutliple', () => {
		describe( 'Replace by query', () => {
			it( 'OK', async () => {
				const [res, respJson] = await requestApi.putAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: update,
					qs: {
						email: DUPLICATE_DATA[0].email,
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Ok );
				expect( respJson ).toMatchObject( [update, update] );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Not found', async () => {
				const [res, respJson] = await requestApi.putAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: update,
					qs: {
						email: 'NotFound@foo.bar',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NoContent );
				expect( respJson ).toBeUndefined();
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Trigger JSON error', async () => {
				const [res, respJson] = await requestApi.putAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: update,
					qs: {
						query: '{hey:"there"}',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MalformedQuery );
				expect( respJson ).toHaveProperty( 'message' );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Throw if no "where" clause', async () => {
				const [res, respJson] = await requestApi.putAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MalformedQuery );
				expect( respJson ).toHaveProperty( 'message' );
				expect( store.items ).toHaveLength( 8 );
			} );
		} );
	} );
} );
