import * as _ from 'lodash';

import { EHttpStatusCode } from '../../../src/types';
import { setCurrent, resetMock, store, unsetCurrent } from '../../setup/mocks/phonebook-mock';
import { requestApi } from '../../setup/request-utils';
import { datas } from '../../setup/mocks/mock';
import { config } from '../../setup/config';

beforeAll( setCurrent );
beforeEach( resetMock );
describe( 'Update (PATCH)', () => {
	const update = {
		name: 'Sig Chisnell',
	};
	describe( 'Single', () => {
		describe( 'Update by query', () => {
			it( 'OK', async () => {
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${config.baseUrl}/PhoneBook`,
					json: update,
					qs: {
						email: datas[1].email,
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Ok );
				const patchedData = _.assign( {}, datas[1], update );
				expect( respJson ).toMatchObject( patchedData );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Not found', async () => {
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${config.baseUrl}/PhoneBook`,
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
				const [res] = await requestApi.patchAsync( {
					url: `${config.baseUrl}/PhoneBook`,
					json: update,
					qs: {
						query: '{hey:"there"}',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MalformedQuery );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Throw if no "where" clause', async () => {
				const prevLen = store.items.length;
				const [res] = await requestApi.patchAsync( {
					url: `${config.baseUrl}/PhoneBook`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MalformedQuery );
				expect( store.items ).toHaveLength( prevLen );
			} );
		} );
		describe( 'Update by id in URL', () => {
			it( 'OK', async () => {
				const id = store.items[5].id;
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${config.baseUrl}/PhoneBook/${id}`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Ok );
				const patchedData = _.assign( {}, datas[5], update );
				expect( respJson ).toMatchObject( patchedData );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Not found', async () => {
				const id = 42;
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${config.baseUrl}/PhoneBook/${id}`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NotFound );
				expect( respJson ).toHaveProperty( 'message' );
				expect( respJson.message ).toMatch( /not (found|exist)/ );
				expect( store.items ).toHaveLength( 8 );
			} );
		} );
	} );
	describe( 'Mutliple', () => {
		describe( 'Update by query', () => {
			it( 'OK', async () => {
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${config.baseUrl}/PhoneBooks`,
					json: update,
					qs: {
						email: datas[1].email,
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', 200 );
				const patchedData = [
					_.assign( {}, datas[1], update ),
					_.assign( {}, datas[2], update ),
				];
				expect( respJson ).toMatchObject( patchedData );
				expect( store.items ).toHaveLength( 8 );
			} );
			it( 'Not found', async () => {
				const prevLen = store.items.length;
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${config.baseUrl}/PhoneBooks`,
					json: update,
					qs: {
						email: 'NotFound@foo.bar',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.NoContent );
				expect( respJson ).toBeUndefined();
				expect( store.items ).toHaveLength( prevLen );
			} );
			it( 'Trigger JSON error', async () => {
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${config.baseUrl}/PhoneBooks`,
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
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${config.baseUrl}/PhoneBooks`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MalformedQuery );
				expect( respJson ).toHaveProperty( 'message' );
				expect( store.items ).toHaveLength( 8 );
			} );
		} );
	} );
} );
afterAll( unsetCurrent );
