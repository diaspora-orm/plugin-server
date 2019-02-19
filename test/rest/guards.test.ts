import { SOURCE_NAME } from './../setup/mocks/datasource-init';
import { setApiMiddleware } from './../setup/webserver-init';
import { config } from './../setup/config';
import { requestApi } from './../setup/request-utils';
import { ExpressApiGenerator, IMiddlewareHash } from '../../src';
import { partition, keys, values, toPairs } from 'lodash';
import { Diaspora } from '@diaspora/diaspora';
import express = require( 'express' );

interface IGuardsMock{
	middlewares: IMiddlewareHash<any>;
	callOrder: string[];
}
const getMockMiddleware = () => {
	const callOrder: string[] = [];
	const makeMockGuard = ( name: string ) => jest.fn( ( req: express.Request, res: express.Response, next: express.NextFunction ) => {
			callOrder.push( name );
			next();
		} )
		.mockName( name );
	const middlewares = {
		all: makeMockGuard( 'all' ),
		
		delete: makeMockGuard( 'delete' ),
		deleteMany: makeMockGuard( 'deleteMany' ),
		deleteOne: makeMockGuard( 'deleteOne' ),
		
		get: makeMockGuard( 'get' ),
		find: makeMockGuard( 'find' ),
		findMany: makeMockGuard( 'findMany' ),
		findOne: makeMockGuard( 'findOne' ),
		
		post: makeMockGuard( 'post' ),
		insert: makeMockGuard( 'insert' ),
		insertMany: makeMockGuard( 'insertMany' ),
		insertOne: makeMockGuard( 'insertOne' ),
		
		put: makeMockGuard( 'put' ),
		replace: makeMockGuard( 'replace' ),
		replaceMany: makeMockGuard( 'replaceMany' ),
		replaceOne: makeMockGuard( 'replaceOne' ),
		
		patch: makeMockGuard( 'patch' ),
		update: makeMockGuard( 'update' ),
		updateMany: makeMockGuard( 'updateMany' ),
		updateOne: makeMockGuard( 'updateOne' ),
		
		optionsMany: makeMockGuard( 'optionsMany' ),
		optionsOne: makeMockGuard( 'optionsOne' ),
	};
	const apiGenerator = new ExpressApiGenerator( {
		webserverType: 'express',
		models: {
			Test: {
				middlewares,
			},
		},
	} );
	setApiMiddleware( apiGenerator.middleware );
	return {middlewares, callOrder} as IGuardsMock;
};
const checkGuardsCalled = ( calledFunctions: Array<keyof IMiddlewareHash<any>>, mocks: IGuardsMock ) => {
	const calledPartition = partition( toPairs( mocks.middlewares ), ( [key] ) => ( calledFunctions as string[] ).indexOf( key ) !== -1 );
	expect( mocks.callOrder ).toEqual( calledFunctions );
	calledPartition[0].forEach( ( [, fn], index, arr ) => expect( fn ).toHaveBeenCalledTimes( 1 ) );
	calledPartition[1].forEach( ( [, fn] ) => expect( fn ).not.toHaveBeenCalled() );
};

beforeAll( () => {
	Diaspora.declareModel( 'Test', {
		sources: [SOURCE_NAME],
		attributes: {},
	} );
} );
describe( 'Guards', () => {
	describe( 'Insert', () => {
		it( 'Insert one', async () => {
			const mocks = getMockMiddleware();
			await requestApi.postAsync( {
				url: `${config.baseUrl}/Test`,
				json: {},
			} );
			checkGuardsCalled( ['all', 'post', 'insert', 'insertOne' ], mocks );
		} );
		it( 'Insert many', async () => {
			const mocks = getMockMiddleware();
			await requestApi.postAsync( {
				url: `${config.baseUrl}/Tests`,
				json: [],
			} );
			checkGuardsCalled( ['all', 'post', 'insert', 'insertMany' ], mocks );
		} );
	} );
	describe( 'Find', () => {
		it( 'Find one', async () => {
			const mocks = getMockMiddleware();
			await requestApi.getAsync( {
				url: `${config.baseUrl}/Test`,
				headers: { accept: 'application/json'},
			} );
			checkGuardsCalled( ['all', 'get', 'find', 'findOne' ], mocks );
		} );
		it( 'Find many', async () => {
			const mocks = getMockMiddleware();
			await requestApi.getAsync( {
				url: `${config.baseUrl}/Tests`,
				headers: { accept: 'application/json'},
			} );
			checkGuardsCalled( ['all', 'get', 'find', 'findMany' ], mocks );
		} );
	} );
	describe( 'Update', () => {
		it( 'Update one', async () => {
			const mocks = getMockMiddleware();
			await requestApi.patchAsync( {
				url: `${config.baseUrl}/Test`,
				headers: { accept: 'application/json'},
			} );
			checkGuardsCalled( ['all', 'patch', 'update', 'updateOne' ], mocks );
		} );
		it( 'Update many', async () => {
			const mocks = getMockMiddleware();
			await requestApi.patchAsync( {
				url: `${config.baseUrl}/Tests`,
				headers: { accept: 'application/json'},
			} );
			checkGuardsCalled( ['all', 'patch', 'update', 'updateMany' ], mocks );
		} );
	} );
	describe( 'Replace', () => {
		it( 'Replace one', async () => {
			const mocks = getMockMiddleware();
			await requestApi.putAsync( {
				url: `${config.baseUrl}/Test`,
				headers: { accept: 'application/json'},
			} );
			checkGuardsCalled( ['all', 'put', 'replace', 'replaceOne' ], mocks );
		} );
		it( 'Replace many', async () => {
			const mocks = getMockMiddleware();
			await requestApi.putAsync( {
				url: `${config.baseUrl}/Tests`,
				headers: { accept: 'application/json'},
			} );
			checkGuardsCalled( ['all', 'put', 'replace', 'replaceMany' ], mocks );
		} );
	} );
	describe( 'Delete', () => {
		it( 'Delete one', async () => {
			const mocks = getMockMiddleware();
			await requestApi.deleteAsync( {
				url: `${config.baseUrl}/Test`,
				headers: { accept: 'application/json'},
			} );
			checkGuardsCalled( ['all', 'delete', 'deleteOne' ], mocks );
		} );
		it( 'Delete many', async () => {
			const mocks = getMockMiddleware();
			await requestApi.deleteAsync( {
				url: `${config.baseUrl}/Tests`,
				headers: { accept: 'application/json'},
			} );
			checkGuardsCalled( ['all', 'delete', 'deleteMany' ], mocks );
		} );
	} );
} );
