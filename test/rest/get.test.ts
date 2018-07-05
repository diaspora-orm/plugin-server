import * as _ from 'lodash';

import { datas } from '../mock';
import { baseAPI, requestApi, stripIdHash } from '../server';
import { resetMock, store } from '../webserver-init';
import { EHttpStatusCode } from '../../src/webservers/express';


beforeEach( resetMock );
describe( 'Find (GET)', () => {
	describe( 'Single', () => {
		describe( 'Find by query', () => {
			it( 'OK', async () => {
				const [res, respJson] = await requestApi.getAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: true,
					qs: {
						name: 'Rozanna Neiland',
					},
				} );
	   expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Ok );
				expect( respJson ).toMatchObject( datas[0] );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Not found', async () => {
				const [res, respJson] = await requestApi.getAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: true,
					qs: {
						email: 'NotFound@foo.bar',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NoContent );
				expect( respJson ).toBeUndefined();
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Trigger JSON error', async () => {
				const [res, respJson] = await requestApi.getAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: true,
					qs: {
						query: '{hey:"there"}',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MalformedQuery );
				expect( respJson ).toHaveProperty( 'message' );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Do not throw if no "where" clause', async () => {
				const [res, respJson] = await requestApi.getAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: true,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Ok );
				expect( respJson ).toMatchObject( stripIdHash( datas[0] ) );
				expect( store.items ).toHaveLength( 8 );
			} );
		} );
		describe( 'Find by id in URL', () => {
			it( 'OK', async () => {
				const id = store.items[5].id;
				const [res, respJson] = await requestApi.getAsync( {
					url: `${baseAPI}/PhoneBook/${id}`,
					json: true,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Ok );
				expect( respJson ).toMatchObject( datas[5] );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Not found', async () => {
				const id = 42;
				const [res, respJson] = await requestApi.getAsync( {
					url: `${baseAPI}/PhoneBook/${id}`,
					json: true,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NotFound );
				expect( respJson ).toBeUndefined();
				expect( store.items ).toHaveLength( 8 );
			} );
		} );
	} );
	describe( 'Mutliple', () => {
		describe( 'Find by query', () => {
			it( 'OK', async () => {
				const [res, respJson] = await requestApi.getAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: true,
					qs: {
						email: datas[1].email,
					},
				} );
	   expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Ok );
	   expect( respJson ).toHaveLength( 2 );
	   expect( respJson ).toMatchObject( _.filter( datas, { email: datas[1].email } ) );
	   expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Not found', async () => {
				const [res, respJson] = await requestApi.getAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: true,
					qs: {
						email: 'NotFound@foo.bar',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NoContent );
				expect( respJson ).toBeUndefined();
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Trigger JSON error', async () => {
				const [res, respJson] = await requestApi.getAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: true,
					qs: {
						query: '{hey:"there"}',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MalformedQuery );
				expect( respJson ).toHaveProperty( 'message' );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Do not throw if no "where" clause', async () => {
				const [res, respJson] = await requestApi.getAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: true,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Ok );
	   expect( respJson ).toHaveLength( 8 );
	   expect( respJson ).toMatchObject( datas );
	   expect( store.items ).toHaveLength( 8 );
			} );
		} );
	} );
} );
