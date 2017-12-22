'use strict';

/* globals describe: false, it: false, before: false, after: false */

const Promise = require( 'bluebird' );
const request = Promise.promisifyAll( Promise.promisify( require( 'request' ), {
	multiArgs: true,
}), {
	multiArgs: true,
});
const chai = require( 'chai' );
const chaiAsPromised = require( 'chai-as-promised' );
chai.use( chaiAsPromised );
const expect = chai.expect;
const config = require( './config' );
const _ = require( 'lodash' );
const utils = require( '../lib/utils' );
const compareArrays = ( a, b ) => {
	expect( a ).to.have.lengthOf( b.length );
	_.forEach( a, ( item, index ) => {
		expect( a[index]).to.deep.include( b[index]);
	});
};

const DUPLICATE_DATA = [
	{
		email: 'heythere@mail.com', 
	},
	{
		phone: '123456', 
	},
];

const datas = [
	{
		name: 'YoloMan', 
	},
	_.assign({
		name: 'HeyThere', 
	}, DUPLICATE_DATA[0]),
	_.assign({
		name: 'Hey There', 
	}, DUPLICATE_DATA[0]),
	_.assign({
		name:  'Another Test',
		email: 'test.another@mail.com', 
	}, DUPLICATE_DATA[1]),
	_.assign({
		name: 'Another Test alias', 
	}, DUPLICATE_DATA[1]),
	{
		name:  'John Doe',
		phone: '051295', 
	},
	{
		name:  'Frank Sinatra',
		email: 'frank@sinatra.com', 
	},
	{
		name:  'aname',
		email: 'mickael.jackson@musicking.org',
		phone: '555-975-123', 
	},
];

describe( 'Test utilities', () => {
	it( 'configureList', () => {
		expect( utils.configureList({
			'*': true,
			b:   false,
		}, [ 'a', 'b', 'c' ])).to.deep.equal({
			a: true,
			c: true,
		});
		expect( utils.configureList({
			'/aa?/': true,
		}, [ 'a', 'aa', 'ab', 'aaa', 'b', 'ba', 'c' ])).to.deep.equal({
			a:   true,
			aa:  true,
			ab:  true,
			aaa: true,
			ba:  true,
		});
		expect( utils.configureList({
			'*foo*': {
				foo:  true,
				last: 'foo',
			},
			'*bar*': {
				bar:  true,
				last: 'bar',
			},
		}, [ 'foo', 'fooqux', 'bar', 'barqux', 'foobar', 'qux' ])).to.deep.equal({
			foo: {
				foo:  true,
				last: 'foo',
			},
			fooqux: {
				foo:  true,
				last: 'foo',
			},
			bar: {
				bar:  true,
				last: 'bar',
			},
			barqux: {
				bar:  true,
				last: 'bar',
			},
			foobar: {
				foo:  true,
				bar:  true,
				last: 'bar',
			},
		});
	});
	it( 'respondError', () => {
		return new Promise(( resolve, reject ) => {
			let checks = {
				status:  false,
				message: false,
			};
			const pseudoRes = {
				status( code ) {
					checks.status = 500 === code;
					return this;
				},
				send( message ) {
					expect( message ).to.not.be.undefined;
					checks.message = true;
					if ( _.isEqual( checks, {
						status:  true,
						message: true,
					})) {
						return resolve();
					} else {
						return reject();
					}
				},
			};
			utils.respondError( pseudoRes );
		});
	});
	it( 'prettylog', () => {
		utils.prettylog( datas );
	});
});

describe( 'Test basic interactions', () => {
	let app;
	let PhoneBook;
	let inMemorySource;

	before( cb => {
		// runs before all tests in this block
		const initComponents = require( './webserver' );
		app = initComponents.server;
		PhoneBook = initComponents.PhoneBook;
		inMemorySource = initComponents.inMemorySource;
		initComponents.after = cb;
		return;
	});
	after( cb => {
		// runs after all tests in this block
		app.close( cb );
	});

	/*
	beforeEach( () => {
		// runs before each test in this block
	});

	afterEach( () => {
		// runs after each test in this block
	});
	*/

	const baseAPI = `http://localhost:${ config.port }${ config.baseApi }`;
	// test cases
	it( 'Get API index (OPTION)', () => {
		return request( baseAPI ).then(([ res, body ]) => {
			expect( res ).to.have.property( 'statusCode', 200 );
			const respJson = JSON.parse( body );
			utils.prettylog( respJson );
			expect( respJson ).to.have.all.keys([ '/PhoneBook/$ID', '/PhoneBooks' ]);
			expect( respJson['/PhoneBook/$ID']).to.have.property( 'canonicalUrl', `${ config.baseApi }/PhoneBook/$ID` );
			expect( respJson['/PhoneBook/$ID']).to.have.property( 'parameters' );
			expect( respJson['/PhoneBook/$ID']).to.have.property( 'description' );
			expect( respJson['/PhoneBooks']).to.have.property( 'canonicalUrl', `${ config.baseApi }/PhoneBooks` );
			expect( respJson['/PhoneBooks']).to.have.property( 'description' );
		});
	});

	describe( 'Create (POST)', () => {
		describe( 'Single', () => {
			it( 'OK', async() => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				let idx = 3;
				const [ res, respJson ] = await request.postAsync({
					url:  `${ baseAPI }/PhoneBook`,
					json: datas[idx],
				});
				expect( res ).to.have.property( 'statusCode', 201 );
				expect( respJson ).to.include( datas[idx]);
				expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen + 1 );
			});
			it( 'Validation error', async() => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [ res, respJson ] = await request.postAsync({
					url:  `${ baseAPI }/PhoneBook`,
					json: {
						phone: '123',
					},
				});
				expect( res ).to.have.property( 'statusCode', 400 );
				expect( respJson ).to.have.property( 'name', 'EntityValidationError' );
				expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
			});
			it( 'Forbid post to explicit ID', async() => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [ res ] = await request.postAsync({
					url:  `${ baseAPI }/PhoneBook/42`,
					json: {
						name: 'Qux',
					},
				});
				expect( res ).to.have.property( 'statusCode', 405 );
				expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
			});
		});
		describe( 'Multiple', () => {
			it( 'OK', async() => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				let idx = 4;
				const [ res, respJson ] = await request.postAsync({
					url:  `${ baseAPI }/PhoneBooks`,
					json: datas.slice( idx, idx + 2 ),
				});
				expect( res ).to.have.property( 'statusCode', 201 );
				expect( respJson ).to.have.lengthOf( 2 );
				expect( respJson[0]).to.include( datas[idx]);
				expect( respJson[1]).to.include( datas[idx + 1]);
				expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen + 2 );
			});
			it( 'Validation error', async() => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [ res, respJson ] = await request.postAsync({
					url:  `${ baseAPI }/PhoneBooks`,
					json: [
						{
							phone: '123', 
						},
						{
							name: 'foo', 
						},
					],
				});
				expect( res ).to.have.property( 'statusCode', 400 );
				expect( respJson ).to.have.property( 'name', 'SetValidationError' );
				expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
			});
		});
		after(() => {
			return PhoneBook.deleteMany();
		});
	});
	describe( 'Update (PATCH)', () => {
		const idx1 = 1;
		const idx2 = 3;
		const update = {
			name: 'HeyDyde',
		};
		describe( 'Single', () => {
			before(() => {
				return PhoneBook.insertMany([
					datas[idx1],
					datas[idx2],
				]);
			});
			describe( 'Update by query', () => {
				it( 'OK', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.patchAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: update,
						qs:   {
							email: datas[idx1].email,
						},
					});
					expect( res ).to.have.property( 'statusCode', 200 );
					const patchedData = _.assign({}, datas[idx1], update );
					expect( respJson ).to.deep.include( patchedData );
					expect(( await PhoneBook.find({
						email: datas[idx1].email,
					})).attributes ).to.include( patchedData );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Not found', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.patchAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: update,
						qs:   {
							email: 'NotFound@foo.bar',
						},
					});
					expect( res ).to.have.property( 'statusCode', 204 );
					expect( respJson ).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Trigger JSON error', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res ] = await request.patchAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: update,
						qs:   {
							query: '{hey:"there"}',
						},
					});
					expect( res ).to.have.property( 'statusCode', 400 );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Throw if no "where" clause', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res ] = await request.patchAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: update,
					});
					expect( res ).to.have.property( 'statusCode', 405 );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
			});
			describe( 'Update by id in URL', () => {
				it( 'OK', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const entity = await PhoneBook.find({}, {
						skip: 1,
					});
					const id = entity.getId();
					const [ res, respJson ] = await request.patchAsync({
						url:  `${ baseAPI }/PhoneBook/${ id }`,
						json: update,
					});
					expect( res ).to.have.property( 'statusCode', 200 );
					const patchedData = _.assign({}, datas[idx2], update );
					expect( respJson ).to.deep.include( patchedData );
					expect(( await PhoneBook.find( id )).attributes ).to.include( patchedData );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Not found', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const id = 42;
					const [ res, respJson ] = await request.patchAsync({
						url:  `${ baseAPI }/PhoneBook/${ id }`,
						json: update,
					});
					expect( res ).to.have.property( 'statusCode', 404 );
					expect( respJson ).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
			});
			after(() => {
				return PhoneBook.deleteMany();
			});
		});
		describe( 'Mutliple', () => {
			before(() => {
				return PhoneBook.insertMany([
					datas[idx1],
					datas[idx1 + 1],
					datas[idx2],
				]);
			});
			describe( 'Update by query', () => {
				it( 'OK', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.patchAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: update,
						qs:   {
							email: datas[idx1].email,
						},
					});
					expect( res ).to.have.property( 'statusCode', 200 );
					const patchedData = [
						_.assign({}, datas[idx1], update ),
						_.assign({}, datas[idx1 + 1], update ),
					];
					compareArrays( respJson, patchedData );
					compareArrays( _.map( await PhoneBook.findMany({
						email: datas[idx1].email,
					}), 'attributes' ), patchedData );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Not found', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.patchAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: update,
						qs:   {
							email: 'NotFound@foo.bar',
						},
					});
					expect( res ).to.have.property( 'statusCode', 204 );
					expect( respJson ).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Trigger JSON error', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res ] = await request.patchAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: update,
						qs:   {
							query: '{hey:"there"}',
						},
					});
					expect( res ).to.have.property( 'statusCode', 400 );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Throw if no "where" clause', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res ] = await request.patchAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: update,
					});
					expect( res ).to.have.property( 'statusCode', 405 );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
			});
			after(() => {
				return PhoneBook.deleteMany();
			});
		});
	});
	describe( 'Find (GET)', () => {
		const idx1 = 1;
		const idx2 = 3;
		describe( 'Single', () => {
			before(() => {
				return PhoneBook.insertMany([
					datas[idx1],
					datas[idx2],
				]);
			});
			describe( 'Find by query', () => {
				it( 'OK', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.getAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							email: datas[idx1].email,
						},
					});
					expect( res ).to.have.property( 'statusCode', 200 );
					expect( respJson ).to.deep.include( datas[idx1]);
					expect(( await PhoneBook.find({
						email: datas[idx1].email,
					})).attributes ).to.include( datas[idx1]);
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Not found', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.getAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							email: 'NotFound@foo.bar',
						},
					});
					expect( res ).to.have.property( 'statusCode', 204 );
					expect( respJson ).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Trigger JSON error', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res ] = await request.getAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					});
					expect( res ).to.have.property( 'statusCode', 400 );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Do not throw if no "where" clause', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.getAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
					});
					expect( res ).to.have.property( 'statusCode', 200 );
					expect( respJson ).to.include( datas[idx1]);
					expect(( await PhoneBook.find({})).attributes ).to.include( datas[idx1]);
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
			});
			describe( 'Find by id in URL', () => {
				it( 'OK', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const entity = await PhoneBook.find({}, {
						skip: 1,
					});
					const id = entity.getId();
					const [ res, respJson ] = await request.getAsync({
						url:  `${ baseAPI }/PhoneBook/${ id }`,
						json: true,
					});
					expect( res ).to.have.property( 'statusCode', 200 );
					expect( respJson ).to.deep.include( datas[idx2]);
					expect(( await PhoneBook.find( id )).attributes ).to.include( datas[idx2]);
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Not found', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const id = 42;
					const [ res, respJson ] = await request.getAsync({
						url:  `${ baseAPI }/PhoneBook/${ id }`,
						json: true,
					});
					expect( res ).to.have.property( 'statusCode', 404 );
					expect( respJson ).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
			});
			after(() => {
				return PhoneBook.deleteMany();
			});
		});
		describe( 'Mutliple', () => {
			const datasIn = [
				datas[idx1],
				datas[idx1 + 1],
				datas[idx2],
			];
			before(() => {
				return PhoneBook.insertMany( datasIn );
			});
			describe( 'Find by query', () => {
				it( 'OK', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.getAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   {
							email: datas[idx1].email,
						},
					});
					expect( res ).to.have.property( 'statusCode', 200 );
					const patchedData = [
						datas[idx1],
						datas[idx1 + 1],
					];
					compareArrays( respJson, patchedData );
					compareArrays( _.map( await PhoneBook.findMany({
						email: datas[idx1].email,
					}), 'attributes' ), patchedData );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Not found', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.getAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   {
							email: 'NotFound@foo.bar',
						},
					});
					expect( res ).to.have.property( 'statusCode', 204 );
					expect( respJson ).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Trigger JSON error', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res ] = await request.getAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					});
					expect( res ).to.have.property( 'statusCode', 400 );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Do not throw if no "where" clause', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.getAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
					});
					expect( res ).to.have.property( 'statusCode', 200 );
					compareArrays( respJson, datasIn );
					compareArrays( _.map( await PhoneBook.findMany({}), 'attributes' ), datasIn );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
			});
			after(() => {
				return PhoneBook.deleteMany();
			});
		});
	});
	describe( 'Delete (DELETE)', () => {
		before(() => {
			return PhoneBook.insertMany( datas );
		});
		describe( 'Single', () => {
			describe( 'Delete by query', () => {
				it( 'OK', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.deleteAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							email: datas[7].email,
						},
					});
					expect( res ).to.have.property( 'statusCode', 204 );
					expect( respJson ).to.be.undefined;
					expect( await PhoneBook.find({
						email: datas[7].email,
					})).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen - 1 );
				});
				it( 'Not found', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.deleteAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							email: 'NotFound@foo.bar',
						},
					});
					expect( res ).to.have.property( 'statusCode', 204 );
					expect( respJson ).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Trigger JSON error', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res ] = await request.deleteAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					});
					expect( res ).to.have.property( 'statusCode', 400 );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Throw if no "where" clause', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res ] = await request.deleteAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
					});
					expect( res ).to.have.property( 'statusCode', 405 );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
			});
			describe( 'Delete by id in URL', () => {
				it( 'OK', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const entity = await PhoneBook.find();
					const id = entity.getId();
					const [ res, respJson ] = await request.deleteAsync({
						url:  `${ baseAPI }/PhoneBook/${ id }`,
						json: true,
					});
					expect( res ).to.have.property( 'statusCode', 204 );
					expect( respJson ).to.be.undefined;
					expect( await PhoneBook.find( id )).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen - 1 );
				});
				it( 'Not found', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const id = 42;
					const [ res, respJson ] = await request.deleteAsync({
						url:  `${ baseAPI }/PhoneBook/${ id }`,
						json: true,
					});
					expect( res ).to.have.property( 'statusCode', 404 );
					expect( respJson ).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
			});
		});
		describe( 'Multiple', () => {
			describe( 'Delete by query', () => {
				it( 'OK', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.deleteAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   DUPLICATE_DATA[0],
					});
					expect( res ).to.have.property( 'statusCode', 204 );
					expect( respJson ).to.be.undefined;
					expect( await PhoneBook.find( DUPLICATE_DATA[0])).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen - 2 );
				});
				it( 'Not found', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res, respJson ] = await request.deleteAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   {
							email: 'NotFound@foo.bar',
						},
					});
					expect( res ).to.have.property( 'statusCode', 204 );
					expect( respJson ).to.be.undefined;
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Trigger JSON error', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res ] = await request.deleteAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					});
					expect( res ).to.have.property( 'statusCode', 400 );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
				it( 'Throw if no "where" clause', async() => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [ res ] = await request.deleteAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
					});
					expect( res ).to.have.property( 'statusCode', 405 );
					expect( inMemorySource.store.PhoneBook.items ).to.have.lengthOf( prevLen );
				});
			});
		});
	});
});
