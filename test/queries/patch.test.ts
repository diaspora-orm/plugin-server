import _ from 'lodash';

import { datas } from '../mock';
import { baseAPI, compareArrays, requestApi, resetDataSource } from '../server';
import { inMemorySource, PhoneBook } from '../webserver-init';

describe( 'Update (PATCH)', () => {
	const idx1 = 1;
	const idx2 = 0;
	const update = {
		name: 'Sig Chisnell',
	};
	describe( 'Single', () => {
		resetDataSource();
		describe( 'Update by query', () => {
			it( 'OK', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: update,
					qs: {
						email: datas[idx1].email,
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', 200 );
				const patchedData = _.assign( {}, datas[idx1], update );
				expect( respJson ).toMatchObject( patchedData );
				expect(
					( await PhoneBook.find( {
						email: datas[idx1].email,
					} ) ).attributes,
				).toMatchObject( patchedData );
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
			it( 'Not found', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: update,
					qs: {
						email: 'NotFound@foo.bar',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', 204 );
				expect( respJson ).toBeUndefined();
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
			it( 'Trigger JSON error', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res] = await requestApi.patchAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: update,
					qs: {
						query: '{hey:"there"}',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', 400 );
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
			it( 'Throw if no "where" clause', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res] = await requestApi.patchAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', 405 );
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
		} );
		describe( 'Update by id in URL', () => {
			it( 'OK', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const entity = await PhoneBook.find(
					{},
					{
						skip: 1,
					},
				);
				const id = entity.getId();
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${baseAPI}/PhoneBook/${id}`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', 200 );
				const patchedData = _.assign( {}, datas[idx2], update );
				expect( respJson ).toMatchObject( patchedData );
				expect( ( await PhoneBook.find( id ) ).attributes ).toMatchObject( patchedData );
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
			it( 'Not found', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const id = 42;
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${baseAPI}/PhoneBook/${id}`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', 404 );
				expect( respJson ).toBeUndefined();
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
		} );
	} );
	describe( 'Mutliple', () => {
		resetDataSource();
		describe( 'Update by query', () => {
			it( 'OK', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: update,
					qs: {
						email: datas[idx1].email,
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', 200 );
				const patchedData = [
					_.assign( {}, datas[idx1], update ),
					_.assign( {}, datas[idx1 + 1], update ),
				];
				compareArrays( respJson, patchedData );
				compareArrays(
					_.map(
						await PhoneBook.findMany( {
							email: datas[idx1].email,
						} ),
						'attributes',
					),
					patchedData,
				);
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
			it( 'Not found', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res, respJson] = await requestApi.patchAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: update,
					qs: {
						email: 'NotFound@foo.bar',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', 204 );
				expect( respJson ).toBeUndefined();
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
			it( 'Trigger JSON error', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res] = await requestApi.patchAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: update,
					qs: {
						query: '{hey:"there"}',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', 400 );
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
			it( 'Throw if no "where" clause', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res] = await requestApi.patchAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: update,
				} );
				expect( res ).toHaveProperty( 'statusCode', 405 );
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
		} );
	} );
} );
