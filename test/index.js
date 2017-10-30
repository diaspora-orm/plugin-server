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
const _ = require( 'lodash' );
const utils = require( '../lib/utils' );
const Diaspora = require( 'diaspora' );

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
	},
	{
		name:  'John Doe',
		phone: '051295',
	},
	{
		name:  'Frank Sinatra',
		email: 'frank@sinatra.com',
	},
	{
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
					checks.message = true;
					if ( _.isEqual( checks, {
						status:  true,
						message: true,
					})) {
						return resolve();
					} else {
						return reject();
					}
					return this;
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
	before( cb => {
		// runs before all tests in this block
		app = require( './webserver' );
		app.after = cb;
		return;
	});

	after( cb => {
		// runs after all tests in this block
		app.close();
		return cb();
	});

	beforeEach( function() {
		// runs before each test in this block
	});

	afterEach( function() {
		// runs after each test in this block
	});

	const baseAPI = `http://localhost:${ config.port }${ config.baseApi }`;
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

	describe( 'POST', () => {
		describe( 'Single', () => {
			let id;
			it( 'Create item', () => {
				return request.postAsync({
					url:  `${ baseAPI }/PhoneBook`,
					json: datas[0],
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 201 );
					expect( respJson ).to.include( datas[0]);
				});
			});
			describe( 'Use query string', () => {
				it( 'Update OK', () => {
					const update = {
						name: 'HeyDyde',
					};

					return request.postAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: update,
						qs:   {
							query: JSON.stringify({
								name: {
									$equal: datas[0].name,
								},
							}),
							limit: 1,
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 200 );
						_.assign( datas[0], update );
						expect( respJson ).to.deep.include( datas[0]);
						id = respJson.idHash.myDataSource;
					});
				});
				it( 'Trigger JSON error', () => {
					return request.postAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 400 );
					});
				});
				it( 'Update by id in URL', () => {
					const update = {
						name: 'Foo Bar',
					};
					return request.postAsync({
						url:  `${ baseAPI }/PhoneBook/${ id }`,
						json: update,
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 200 );
						_.assign( datas[0], update );
						expect( respJson ).to.deep.include( datas[0]);
					});
				});
			});
			it( 'Update not found', () => {
				return request.postAsync({
					url:  `${ baseAPI }/PhoneBook/12`,
					json: {
						Yolo: 'swag',
					},
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 404 );
					expect( respJson ).to.be.undefined;
				});
			});
		});
		describe( 'Multiple', () => {
			it( 'Create items', () => {
				let idx = 1;
				return request.postAsync({
					url:  `${ baseAPI }/PhoneBooks`,
					json: datas.slice( idx, idx + 2 ),
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 201 );
					expect( respJson ).to.have.lengthOf( 2 );
					expect( respJson[0]).to.include( datas[1]);
					expect( respJson[1]).to.include( datas[2]);
				});
			});
			it( 'Update not found', () => {
				return request.postAsync({
					url:  `${ baseAPI }/PhoneBooks`,
					json: {
						Yolo: 'swag',
					},
					qs: {
						name: 'NotFound',
					},
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 404 );
					expect( respJson ).to.be.an( 'array' ).that.have.lengthOf( 0 );
				});
			});
			describe( 'Use query string', () => {
				it( 'Update OK', () => {
					const update = {
						otherProp: 'foo',
					};
					return request.postAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: update,
						qs:   {
							query: JSON.stringify({
								name: {
									$diff: datas[0].name,
								},
							}),
						},
					}).then(([ res, respJson ]) => {
						const matched = [ 1, 2 ];
						_.forEach( matched, idx => {
							_.assign( datas[idx], update );
						});
						expect( res ).to.have.property( 'statusCode', 200 );
						expect( respJson ).to.have.lengthOf( 2 );
						_.forEach( respJson, ( entity, index ) => {
							expect( entity ).to.deep.include( datas[matched[index]]);
						});
					});
				});
				it( 'Trigger JSON error', () => {
					return request.postAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 400 );
					});
				});
			});
		});
	});
	describe( 'PUT', () => {
		describe( 'Single', () => {
			let id;
			it( 'Create item', () => {
				return request.putAsync({
					url:  `${ baseAPI }/PhoneBook`,
					json: datas[3],
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 201 );
					expect( respJson ).to.include( datas[3]);
				});
			});
			describe( 'Use query string', () => {
				it( 'Update OK', () => {
					const update = {
						name: 'HeyDyde',
					};

					return request.putAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: update,
						qs:   {
							query: JSON.stringify({
								name: {
									$equal: datas[0].name,
								},
							}),
							limit: 1,
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 200 );
						datas[0] = update;
						expect( respJson ).to.deep.include( datas[0]);
						id = respJson.idHash.myDataSource;
					});
				});
				it( 'Trigger JSON error', () => {
					return request.putAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 400 );
					});
				});
				it( 'Update by id in URL', () => {
					const update = {
						name: 'Foo Bar',
					};
					return request.putAsync({
						url:  `${ baseAPI }/PhoneBook/${ id }`,
						json: update,
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 200 );
						_.assign( datas[0], update );
						expect( respJson ).to.deep.include( datas[0]);
					});
				});
			});
			it( 'Update not found', () => {
				return request.putAsync({
					url:  `${ baseAPI }/PhoneBook/12`,
					json: {
						Yolo: 'swag',
					},
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 404 );
					expect( respJson ).to.be.undefined;
				});
			});
		});
		describe( 'Multiple', () => {
			it( 'Create items', () => {
				let idx = 4;
				return request.putAsync({
					url:  `${ baseAPI }/PhoneBooks`,
					json: datas.slice( idx, idx + 2 ),
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 201 );
					expect( respJson ).to.have.lengthOf( 2 );
					expect( respJson[0]).to.include( datas[4]);
					expect( respJson[1]).to.include( datas[5]);
				});
			});
			it( 'Update not found', () => {
				return request.putAsync({
					url:  `${ baseAPI }/PhoneBooks`,
					json: {
						Yolo: 'swag',
					},
					qs: {
						name: 'NotFound',
					},
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 404 );
					expect( respJson ).to.be.an( 'array' ).that.have.lengthOf( 0 );
				});
			});
			describe( 'Use query string', () => {
				it( 'Update OK', () => {
					const update = {
						name: 'Terry Fisher',
					};
					return request.putAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: update,
						qs:   {
							query: JSON.stringify({
								name: datas[0].name,
							}),
						},
					}).then(([ res, respJson ]) => {
						_.forEach( datas, ( entity, index ) => {
							if ( _.isMatch( entity, {
								name: datas[0].name,
							})) {
								datas[index] = _.clone( update );
							}
						});
						expect( res ).to.have.property( 'statusCode', 200 );
						expect( respJson ).to.have.lengthOf( 1 );
						_.forEach( respJson, entity => {
							expect( entity ).to.deep.include( update );
						});
					});
				});
				it( 'Trigger JSON error', () => {
					return request.putAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 400 );
					});
				});
			});
		});
	});
	describe( 'GET', () => {
		describe( 'Single', () => {
			let id;
			it( 'Get item', () => {
				return request.getAsync({
					url:  `${ baseAPI }/PhoneBook`,
					json: true,
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 200 );
					expect( respJson ).to.include( datas[0]);
				});
			});
			it( 'Get not found', () => {
				return request.getAsync({
					url:  `${ baseAPI }/PhoneBook/12`,
					json: true,
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 404 );
					expect( respJson ).to.be.undefined;
				});
			});
			describe( 'Use query string', () => {
				let id;
				it( 'Get item', () => {
					return request.getAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							email: datas[5].email,
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 200 );
						id = respJson.idHash.myDataSource;
						expect( respJson ).to.include( datas[5]);
					});
				});
				it( 'Trigger JSON error', () => {
					return request.getAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 400 );
					});
				});
				it( 'Get by id in URL', () => {
					return request.getAsync({
						url:  `${ baseAPI }/PhoneBook/${ id }`,
						json: true,
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 200 );
						expect( respJson ).to.deep.include( datas[5]);
					});
				});
			});
		});
		describe( 'Multiple', () => {
			it( 'Get items', () => {
				return request.getAsync({
					url:  `${ baseAPI }/PhoneBooks`,
					json: true,
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 200 );
					expect( respJson ).to.have.lengthOf( datas.length );
					_.forEach( respJson, ( entity, index ) => {
						expect( entity ).to.include( datas[index]);
					});
				});
			});
			it( 'Get not found', () => {
				return request.getAsync({
					url: `${ baseAPI }/PhoneBooks`,
					qs:  {
						name: 'NotFound',
					},
					json: true,
				}).then(([ res, respJson ]) => {
					expect( res ).to.have.property( 'statusCode', 404 );
					expect( respJson ).to.be.an( 'array' ).that.have.lengthOf( 0 );
				});
			});
			describe( 'Use query string', () => {
				it( 'Get OK', () => {
					return request.getAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   {
							query: JSON.stringify({
								name: {
									$exists: true,
								},
							}),
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 200 );
						const matches = _.reduce( datas, ( ret, entity ) => {
							if ( !_.isNil( entity.name )) {
								ret.push( entity );
							}
							return ret;
						}, []);
						expect( respJson ).to.have.lengthOf( 5 );
						_.forEach( respJson, ( entity, index ) => {
							expect( entity ).to.deep.include( matches[index]);
						});
					});
				});
				it( 'Trigger JSON error', () => {
					return request.getAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 400 );
					});
				});
			});
		});
	});
	describe( 'DELETE', () => {
		describe( 'Single', () => {
			let id;
			describe( 'Use query string', () => {
				it( 'Delete item', () => {
					return request.deleteAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							email: datas[5].email,
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 200 );
						datas.splice( 5, 1 );
						expect( respJson ).to.be.undefined;
					});
				});
				it( 'Trigger JSON error', () => {
					return request.deleteAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 400 );
					});
				});
				it( 'Delete by id in URL', () => {
					return request.getAsync({
						url:  `${ baseAPI }/PhoneBook`,
						json: true,
					}).then(([ res, foundEntity ]) => {
						return request.deleteAsync({
							url:  `${ baseAPI }/PhoneBook/${ foundEntity.idHash.myDataSource }`,
							json: true,
						});
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 200 );
						datas.splice( 0, 1 );
						expect( respJson ).to.be.undefined;
					});
				});
			});
		});
		describe( 'Multiple', () => {
			describe( 'Use query string', () => {
				it( 'Delete OK', () => {
					return request.deleteAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   {
							query: JSON.stringify({
								email: {
									$exists: false,
								},
							}),
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 200 );
						_.remove( datas, entity => {
							return _.isNil( entity.email );
						});
						expect( respJson ).to.be.undefined;
					});
				});
				it( 'Trigger JSON error', () => {
					return request.deleteAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
						qs:   {
							query: '{hey:"there"}',
						},
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 400 );
					});
				});
				it( 'Check delete', () => {
					return request.getAsync({
						url:  `${ baseAPI }/PhoneBooks`,
						json: true,
					}).then(([ res, respJson ]) => {
						expect( res ).to.have.property( 'statusCode', 200 );
						expect( respJson ).to.have.lengthOf( datas.length );
						_.forEach( respJson, ( entity, index ) => {
							expect( entity ).to.include( datas[index]);
						});
					});
				});
			});
		});
	});
});
