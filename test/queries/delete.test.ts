import { datas, DUPLICATE_DATA } from '../mock';
import { baseAPI, requestApi, resetDataSource } from '../server';
import { inMemorySource, PhoneBook } from '../webserver-init';

describe( 'Delete (DELETE)', () => {
	describe( 'Single', () => {
		resetDataSource();
		describe( 'Delete by query', () => {
			it( 'OK', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: true,
					qs: {
						email: datas[7].email,
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', 204 );
				expect( respJson ).toBeUndefined();
				expect(
					await PhoneBook.find( {
						email: datas[7].email,
					} ),
				).toBeUndefined();
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen - 1 );
			} );
			it( 'Not found', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: true,
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
				const [res] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: true,
					qs: {
						query: '{hey:"there"}',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', 400 );
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
			it( 'Throw if no "where" clause', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBook`,
					json: true,
				} );
				expect( res ).toHaveProperty( 'statusCode', 405 );
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
		} );
		describe( 'Delete by id in URL', () => {
			it( 'OK', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const entity = await PhoneBook.find();
				const id = entity.getId();
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBook/${id}`,
					json: true,
				} );
				expect( res ).toHaveProperty( 'statusCode', 204 );
				expect( respJson ).toBeUndefined();
				expect( await PhoneBook.find( id ) ).toBeUndefined();
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen - 1 );
			} );
			it( 'Not found', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const id = 42;
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBook/${id}`,
					json: true,
				} );
				expect( res ).toHaveProperty( 'statusCode', 404 );
				expect( respJson ).toBeUndefined();
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
		} );
	} );
	describe( 'Multiple', () => {
		resetDataSource();
		describe( 'Delete by query', () => {
			it( 'OK', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: true,
					qs: DUPLICATE_DATA[0],
				} );
				expect( res ).toHaveProperty( 'statusCode', 204 );
				expect( respJson ).toBeUndefined();
				expect( await PhoneBook.find( DUPLICATE_DATA[0] ) ).toBeUndefined();
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen - 2 );
			} );
			it( 'Not found', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res, respJson] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: true,
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
				const [res] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: true,
					qs: {
						query: '{hey:"there"}',
					},
				} );
				expect( res ).toHaveProperty( 'statusCode', 400 );
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
			it( 'Throw if no "where" clause', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res] = await requestApi.deleteAsync( {
					url: `${baseAPI}/PhoneBooks`,
					json: true,
				} );
				expect( res ).toHaveProperty( 'statusCode', 405 );
				expect( inMemorySource.store.PhoneBook.items ).toHaveLength( prevLen );
			} );
		} );
	} );
} );
