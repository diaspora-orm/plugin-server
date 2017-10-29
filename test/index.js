'use strict';

const Promise = require( 'bluebird' );
const request = Promise.promisifyAll( Promise.promisify( require( 'request' ), {
	multiArgs: true,
}), {
	multiArgs: true,
});
const chai = require( 'chai' );
const chaiAsPromised = require( 'chai-as-promised' );
chai.use( chaiAsPromised );
const assert = chai.assert;
const expect = chai.expect;
const config = require( './config' );
const _ = require('lodash');

describe('Test utilities', () => {
	const utils = require('../lib/utils');
	it('configureList', () => {
		expect(utils.configureList({'*': true, b: false}, ['a', 'b', 'c'])).to.deep.equal({a: true, c: true});
		expect(utils.configureList({'/aa?/': true}, ['a', 'aa', 'ab', 'aaa', 'b', 'ba', 'c'])).to.deep.equal({a: true, aa: true, ab: true, aaa: true, ba: true});
		expect(utils.configureList({
			'*foo*': {foo: true, last: 'foo'},
			'*bar*': {bar: true, last: 'bar'}
		}, ['foo', 'fooqux', 'bar', 'barqux', 'foobar', 'qux'])).to.deep.equal({
			foo: {foo: true, last: 'foo'},
			fooqux: {foo: true, last: 'foo'},
			bar: {bar: true, last: 'bar'},
			barqux: {bar: true, last: 'bar'},
			foobar: {foo: true, bar: true, last: 'bar'},
		})
	});
});

describe( 'Test basic interactions', () => {
	let app;
	before( cb => {
		// runs before all tests in this block
		app = require('./webserver');
		app.after = cb;
		return;
	});

	after( cb => {
		// runs after all tests in this block
		return cb();
	});

	beforeEach( function() {
		// runs before each test in this block
	});

	afterEach( function() {
		// runs after each test in this block
	});

	const baseAPI = `http://localhost:${ config.port }${ config.baseApi }`;
	const datas = [
		{
			name: 'YoloMan',
		},
		{
			name:  'HeyThere',
			email: 'heythere@mail.com',
		},
		{
			name:  'Another Test',
			phone: '123456',
			email: 'test.another@mail.com',
		}
	];
	// test cases
	it( 'Get API index', () => {
		return request( baseAPI ).then(([ res, body ]) => {
			const respJson = JSON.parse( body );
			expect( respJson ).to.have.all.keys([ '/PhoneBook/$ID', '/PhoneBooks' ]);
			expect( respJson['/PhoneBook/$ID']).to.have.property( 'canonicalUrl', `${ config.baseApi }/PhoneBook/$ID` );
			expect( respJson['/PhoneBook/$ID']).to.have.property( 'parameters' );
			expect( respJson['/PhoneBook/$ID']).to.have.property( 'description' );
			expect( respJson['/PhoneBooks']).to.have.property( 'canonicalUrl', `${ config.baseApi }/PhoneBooks` );
			expect( respJson['/PhoneBooks']).to.have.property( 'description' );
		});
	});
	describe( 'Create some items', () => {
		it('Create a single item', () => {
			return request.postAsync({
				url:  `${ baseAPI }/PhoneBook`,
				json: datas[0],
			}).then(([ res, respJson ]) => {
				expect(res).to.have.property('statusCode', 201);
				expect( respJson ).to.include( datas[0]);
			});
		});
		it('Create several items', () => {
			return request.postAsync({
				url:  `${ baseAPI }/PhoneBooks`,
				json: datas.slice(1),
			}).then(([ res, respJson ]) => {
				expect(res).to.have.property('statusCode', 201);
				expect( respJson ).to.have.lengthOf(2);
				expect(respJson[0]).to.include( datas[1]);
				expect(respJson[1]).to.include( datas[2]);
			});
		});
		let id;
		describe('Use query string', () => {
			it('Update OK', () => {
				return request.postAsync({
					url:  `${ baseAPI }/PhoneBook`,
					json: {
						name: 'HeyDude'
					},
					qs: {
						query: JSON.stringify({
							name: {
								$equal: 'HeyThere',
							},
						}),
						limit: 1
					},
				}).then(([res, respJson]) => {
					expect(respJson).to.deep.include(_.assign({}, datas[0], {name: 'HeyDude'}));
					id = respJson.idHash.myDataSource;
				});
			});
			it('Trigger JSON error (single)', () => {
				return request.postAsync({
					url:  `${ baseAPI }/PhoneBook`,
					json: true,
					qs: {
						query: '{hey:"there"}',
					},
				}).then(([res, respJson]) => {
					expect(res).to.have.property('statusCode', 400);
				});
			});
			it('Trigger JSON error (multiple)', () => {
				return request.postAsync({
					url:  `${ baseAPI }/PhoneBooks`,
					json: true,
					qs: {
						query: '{hey:"there"}',
					},
				}).then(([res, respJson]) => {
					expect(res).to.have.property('statusCode', 400);
				});
			});
			it('Update by id in URL', () => {
				return request.postAsync({
					url:  `${ baseAPI }/PhoneBook/${id}`,
					json: {name: 'HeyThere'},
				}).then(([res, respJson]) => {
					expect(respJson).to.deep.include(datas[0]);
				});
			});
		});
		it('Update not found', () => {
			return request.postAsync({
				url:  `${ baseAPI }/PhoneBook/12`,
				json: {Yolo:'swag'},
			}).then(([res, respJson]) => {
				expect(res).to.have.property('statusCode', 404);
				expect(respJson).to.be.undefined;
			});
		});
	});
	describe('Retrieve some items', () => {
		it('Get all', () => {
			return request.getAsync({
				url:  `${ baseAPI }/PhoneBooks`,
				json: true,
			}).then(([res, respJson]) => {
				expect(respJson).to.be.an('array').that.have.lengthOf(datas.length);
				_.forEach(respJson, (entity, index) => {
					expect(entity).to.deep.include(datas[index]);
				});
			});
		});
		it('Get single by name', () => {
			return request.getAsync({
				url:  `${ baseAPI }/PhoneBook`,
				json: true,
				qs: {
					name: datas[1].name,
				}
			}).then(([res, respJson]) => {
				expect(respJson).to.be.an('object').that.include(datas[1]);
			});
		});
		let id;
		describe('Use query string', () => {
			it('Search OK', () => {
				return request.getAsync({
					url:  `${ baseAPI }/PhoneBooks`,
					json: true,
					qs: {
						query: JSON.stringify({
							name: {
								$diff: 'HeyThere',
							},
						}),
						limit: 1
					},
				}).then(([res, respJson]) => {
					expect(respJson).to.be.an('array').that.have.lengthOf(1);
					expect(respJson[0]).to.deep.include(datas[0]);
					id = respJson[0].idHash.myDataSource;
				});
			});
			it('Trigger JSON error (single)', () => {
				return request.getAsync({
					url:  `${ baseAPI }/PhoneBook`,
					json: true,
					qs: {
						query: '{hey:"there"}',
					},
				}).then(([res, respJson]) => {
					expect(res).to.have.property('statusCode', 400);
				});
			});
			it('Trigger JSON error (multiple)', () => {
				return request.getAsync({
					url:  `${ baseAPI }/PhoneBooks`,
					json: true,
					qs: {
						query: '{hey:"there"}',
					},
				}).then(([res, respJson]) => {
					expect(res).to.have.property('statusCode', 400);
				});
			});
			it('Search by id in URL', () => {
				return request.getAsync({
					url:  `${ baseAPI }/PhoneBook/${id}`,
					json: true,
				}).then(([res, respJson]) => {
					expect(respJson).to.deep.include(datas[0]);
				});
			});
		});
		it('Search not found', () => {
			return request.getAsync({
				url:  `${ baseAPI }/PhoneBook/12`,
				json: true,
			}).then(([res, respJson]) => {
				expect(res).to.have.property('statusCode', 404);
				expect(respJson).to.be.undefined;
			});
		});
	});
});
