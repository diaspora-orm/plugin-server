import { DUPLICATE_DATA } from '../mock';
import { baseAPI, requestApi } from '../server';
import { resetMock, store } from '../webserver-init';
import { EHttpStatusCode } from '../../src/webservers/express';

beforeEach( resetMock );
describe( 'Delete (DELETE)', () => {
	describe( 'Single', () => {
		describe( 'Delete by query', () => {
			it( 'OK', async () => {
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: true,
					qs: {
						name: 'Rozanna Neiland',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NoContent );
				expect( respJson ).toBeUndefined();
				expect( store.items ).not.toContainEqual( {name: 'Rozanna Neiland'} );
				expect( store.items ).toHaveLength( 7 );
			} );
			it( 'Not found', async () => {
				const [res, respJson] = await requestApi.deleteAsync( {
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
				const [res, respJson] = await requestApi.deleteAsync( {
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
			it( 'Throw if no "where" clause', async () => {
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: true,
				} );
	   expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MalformedQuery );
				expect( respJson ).toEqual( {message: 'DELETE requires a "where" clause'} );
				expect( store.items ).toHaveLength( 8 );
			} );
		} );
		describe( 'Delete by id in URL', () => {
			it( 'OK', async () => {
				const id = store.items[5].id;
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBook/${id}`,
					json: true,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NoContent );
				expect( respJson ).toBeUndefined();
				expect( store.items ).not.toContainEqual( {id} );
				expect( store.items ).toHaveLength( 7 );
			} );
			it( 'Not found', async () => {
				const id = 42;
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBook/${id}`,
					json: true,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NotFound );
				expect( respJson ).toBeUndefined();
				expect( store.items ).toHaveLength( 8 );
			} );
		} );
	} );
	describe( 'Multiple', () => {
		describe( 'Delete by query', () => {
			it( 'OK', async () => {
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: true,
					qs: DUPLICATE_DATA[0],
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NoContent );
				expect( respJson ).toBeUndefined();
	   expect( store.items ).not.toContainEqual( DUPLICATE_DATA[0] );
				expect( store.items ).toHaveLength( 6 );
			} );
			it( 'Not found', async () => {
				const prevLen = store.items.length;
				const [res, respJson] = await requestApi.deleteAsync( {
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
				const [res, respJson] = await requestApi.deleteAsync( {
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
			it( 'Throw if no "where" clause', async () => {
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: true,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MalformedQuery );
				expect( respJson ).toEqual( {message: 'DELETE requires a "where" clause'} );
				expect( store.items ).toHaveLength( 8 );
			} );
		} );
	} );
} );
