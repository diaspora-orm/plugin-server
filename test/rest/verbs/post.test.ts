import * as _ from 'lodash';

import { EHttpStatusCode } from '../../../src/types';
import { setCurrent, resetMock, store, unsetCurrent } from '../../setup/mocks/phonebook-mock';
import { requestApi } from '../../setup/request-utils';
import { config } from '../../setup/config';

beforeAll( setCurrent );
beforeEach( resetMock );
describe( 'Create (POST)', () => {
	describe( 'Single', () => {
		it( 'OK', async () => {
			const newItem = {
				name: 'New item',
			};
			const [res, respJson] = await requestApi.postAsync( {
				url: `${config.baseUrl}/PhoneBook`,
				json: newItem,
			} );
			expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Created );
			expect( respJson ).toMatchObject( newItem );
			expect( store.items ).toHaveLength( 9 );
		} );
		it( 'Validation error', async () => {
			const [res, respJson] = await requestApi.postAsync( {
				url: `${config.baseUrl}/PhoneBook`,
				json: {
					phone: '123',
				},
			} );
			expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Forbidden );
			expect( respJson ).toHaveProperty( 'name', 'EntityValidationError' );
			expect( store.items ).toHaveLength( 8 );
		} );
		it( 'Forbid post to explicit ID', async () => {
			const [res] = await requestApi.postAsync( {
				url: `${config.baseUrl}/PhoneBook/42`,
				json: {
					name: 'Qux',
				},
			} );
			expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.MethodNotAllowed );
			expect( store.items ).toHaveLength( 8 );
		} );
	} );
	describe( 'Multiple', () => {
		it( 'OK', async () => {
			const newItems = [
				{
					name: 'Some new item',
					email: 'helloworld@gmail.com',
				},
				{
					name: 'Bara Cuda',
					phone: '123-456-78',
				},
			];
			const [res, respJson] = await requestApi.postAsync( {
				url: `${config.baseUrl}/PhoneBooks`,
				json: newItems,
			} );
			expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Created );
			expect( respJson ).toHaveLength( 2 );
			expect( respJson ).toMatchObject( newItems );
			expect( store.items ).toHaveLength( 10 );
		} );
		it( 'Validation error', async () => {
			const prevLen = store.items.length;
			const [res, respJson] = await requestApi.postAsync( {
				url: `${config.baseUrl}/PhoneBooks`,
				json: [
					{
						phone: '123',
					},
					{
						email: 'foo@bar.qux',
					},
				],
			} );
			expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Forbidden );
			expect( respJson ).toHaveProperty( 'name', 'SetValidationError' );
			expect( respJson ).toHaveProperty( 'validationErrors' );
			expect( _.compact( respJson.validationErrors ) ).toHaveLength( 2 );
			expect( store.items ).toHaveLength( 8 );
		} );
	} );
} );
afterAll( unsetCurrent );
