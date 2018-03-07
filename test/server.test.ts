import { promisifyAll, promisify } from 'bluebird';
import _ from 'lodash';
import request, { Response } from 'request';
import http from 'http';

const config = require('./config');
const utils = require('../src/utils');

import { server, PhoneBook, inMemorySource } from './webserver-init';

type Param =
	| {
			url: string;
			json?: object | boolean;
			qs?: object;
	  }
	| string;
const requestApi = promisifyAll(request, {
	multiArgs: true,
}) as {
	optionsAsync(params: Param): Promise<[Response, any]>;
	getAsync(params: Param): Promise<[Response, any]>;
	deleteAsync(params: Param): Promise<[Response, any]>;
	postAsync(params: Param): Promise<[Response, any]>;
	patchAsync(params: Param): Promise<[Response, any]>;
};

const compareArrays = (a: any[], b: any[]) => {
	expect(a).toHaveLength(b.length);
	_.forEach(a, (item, index) => {
		expect(a[index]).toMatchObject(b[index]);
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
	_.assign(
		{
			name: 'HeyThere',
		},
		DUPLICATE_DATA[0]
	),
	_.assign(
		{
			name: 'Hey There',
		},
		DUPLICATE_DATA[0]
	),
	_.assign(
		{
			name: 'Another Test',
			email: 'test.another@mail.com',
		},
		DUPLICATE_DATA[1]
	),
	_.assign(
		{
			name: 'Another Test alias',
		},
		DUPLICATE_DATA[1]
	),
	{
		name: 'John Doe',
		phone: '051295',
	},
	{
		name: 'Frank Sinatra',
		email: 'frank@sinatra.com',
	},
	{
		name: 'aname',
		email: 'mickael.jackson@musicking.org',
		phone: '555-975-123',
	},
];

describe('Test utilities', () => {
	it('configureList', () => {
		expect(
			utils.configureList(
				{
					'*': true,
					b: false,
				},
				['a', 'b', 'c']
			)
		).toEqual({
			a: true,
			c: true,
		});
		expect(
			utils.configureList(
				{
					'/aa?/': true,
				},
				['a', 'aa', 'ab', 'aaa', 'b', 'ba', 'c']
			)
		).toEqual({
			a: true,
			aa: true,
			ab: true,
			aaa: true,
			ba: true,
		});
		expect(
			utils.configureList(
				{
					'*foo*': {
						foo: true,
						last: 'foo',
					},
					'*bar*': {
						bar: true,
						last: 'bar',
					},
				},
				['foo', 'fooqux', 'bar', 'barqux', 'foobar', 'qux']
			)
		).toEqual({
			foo: {
				foo: true,
				last: 'foo',
			},
			fooqux: {
				foo: true,
				last: 'foo',
			},
			bar: {
				bar: true,
				last: 'bar',
			},
			barqux: {
				bar: true,
				last: 'bar',
			},
			foobar: {
				foo: true,
				bar: true,
				last: 'bar',
			},
		});
	});
	it('respondError', () => {
		return new Promise((resolve, reject) => {
			let checks = {
				status: false,
				message: false,
			};
			const pseudoRes = {
				status(code) {
					checks.status = 500 === code;
					return this;
				},
				send(message) {
					expect(message).not.toBeUndefined();
					checks.message = true;
					if (
						_.isEqual(checks, {
							status: true,
							message: true,
						})
					) {
						return resolve();
					} else {
						return reject();
					}
				},
			};
			utils.respondError(pseudoRes);
		});
	});
	it('prettylog', () => {
		utils.prettylog(datas);
	});
});

describe('Test basic interactions', () => {
	let app: http.Server | undefined;

	beforeAll(async () => {
		// runs before all tests in this block
		app = await server();
	});
	afterAll(async () => {
		// runs after all tests in this block
		return new Promise(resolve => app.close(resolve));
	});

	/*
	beforeEach( () => {
		// runs before each test in this block
	});
	
	afterEach( () => {
		// runs after each test in this block
	});
	*/

	const baseAPI = `http://localhost:${config.port}${config.baseApi}`;
	// test cases
	it('Get API index (OPTION)', async () => {
		const [res, body] = await requestApi.optionsAsync(baseAPI);

		expect(res).toHaveProperty('statusCode', 200);
		const respJson = JSON.parse(body);
		utils.prettylog(respJson);

		expect(_.keys(respJson)).toEqual(
			expect.arrayContaining(['/PhoneBook/$ID', '/PhoneBooks'])
		);
		expect(respJson['/PhoneBook/$ID']).toHaveProperty(
			'canonicalUrl',
			`${config.baseApi}/PhoneBook/$ID`
		);
		expect(respJson['/PhoneBook/$ID']).toHaveProperty('parameters');
		expect(respJson['/PhoneBook/$ID']).toHaveProperty('description');
		expect(respJson['/PhoneBooks']).toHaveProperty(
			'canonicalUrl',
			`${config.baseApi}/PhoneBooks`
		);
		expect(respJson['/PhoneBooks']).toHaveProperty('description');
	});

	describe('Create (POST)', () => {
		describe('Single', () => {
			it('OK', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				let idx = 3;
				const [res, respJson] = await requestApi.postAsync({
					url: `${baseAPI}/PhoneBook`,
					json: datas[idx],
				});
				expect(res).toHaveProperty('statusCode', 201);
				expect(respJson).toMatchObject(datas[idx]);
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen + 1);
			});
			it('Validation error', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res, respJson] = await requestApi.postAsync({
					url: `${baseAPI}/PhoneBook`,
					json: {
						phone: '123',
					},
				});
				expect(res).toHaveProperty('statusCode', 400);
				expect(respJson).toHaveProperty('name', 'EntityValidationError');
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
			});
			it('Forbid post to explicit ID', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res] = await requestApi.postAsync({
					url: `${baseAPI}/PhoneBook/42`,
					json: {
						name: 'Qux',
					},
				});
				expect(res).toHaveProperty('statusCode', 405);
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
			});
		});
		describe('Multiple', () => {
			it('OK', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				let idx = 4;
				const [res, respJson] = await requestApi.postAsync({
					url: `${baseAPI}/PhoneBooks`,
					json: datas.slice(idx, idx + 2),
				});
				expect(res).toHaveProperty('statusCode', 201);
				expect(respJson).toHaveLength(2);
				expect(respJson[0]).toMatchObject(datas[idx]);
				expect(respJson[1]).toMatchObject(datas[idx + 1]);
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen + 2);
			});
			it('Validation error', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res, respJson] = await requestApi.postAsync({
					url: `${baseAPI}/PhoneBooks`,
					json: [
						{
							phone: '123',
						},
						{
							name: 'foo',
						},
					],
				});
				expect(res).toHaveProperty('statusCode', 400);
				expect(respJson).toHaveProperty('name', 'SetValidationError');
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
			});
		});
		afterAll(() => {
			return PhoneBook.deleteMany();
		});
	});

	describe('Update (PATCH)', () => {
		const idx1 = 1;
		const idx2 = 3;
		const update = {
			name: 'HeyDyde',
		};
		describe('Single', () => {
			beforeAll(() => {
				return PhoneBook.insertMany([datas[idx1], datas[idx2]]);
			});
			describe('Update by query', () => {
				it('OK', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.patchAsync({
						url: `${baseAPI}/PhoneBook`,
						json: update,
						qs: {
							email: datas[idx1].email,
						},
					});
					expect(res).toHaveProperty('statusCode', 200);
					const patchedData = _.assign({}, datas[idx1], update);
					expect(respJson).toMatchObject(patchedData);
					expect(
						(await PhoneBook.find({
							email: datas[idx1].email,
						})).attributes
					).toMatchObject(patchedData);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Not found', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.patchAsync({
						url: `${baseAPI}/PhoneBook`,
						json: update,
						qs: {
							email: 'NotFound@foo.bar',
						},
					});
					expect(res).toHaveProperty('statusCode', 204);
					expect(respJson).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Trigger JSON error', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res] = await requestApi.patchAsync({
						url: `${baseAPI}/PhoneBook`,
						json: update,
						qs: {
							query: '{hey:"there"}',
						},
					});
					expect(res).toHaveProperty('statusCode', 400);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Throw if no "where" clause', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res] = await requestApi.patchAsync({
						url: `${baseAPI}/PhoneBook`,
						json: update,
					});
					expect(res).toHaveProperty('statusCode', 405);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
			});
			describe('Update by id in URL', () => {
				it('OK', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const entity = await PhoneBook.find(
						{},
						{
							skip: 1,
						}
					);
					const id = entity.getId();
					const [res, respJson] = await requestApi.patchAsync({
						url: `${baseAPI}/PhoneBook/${id}`,
						json: update,
					});
					expect(res).toHaveProperty('statusCode', 200);
					const patchedData = _.assign({}, datas[idx2], update);
					expect(respJson).toMatchObject(patchedData);
					expect((await PhoneBook.find(id)).attributes).toMatchObject(patchedData);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Not found', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const id = 42;
					const [res, respJson] = await requestApi.patchAsync({
						url: `${baseAPI}/PhoneBook/${id}`,
						json: update,
					});
					expect(res).toHaveProperty('statusCode', 404);
					expect(respJson).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
			});
			afterAll(() => {
				return PhoneBook.deleteMany();
			});
		});
		describe('Mutliple', () => {
			beforeAll(() => {
				return PhoneBook.insertMany([datas[idx1], datas[idx1 + 1], datas[idx2]]);
			});
			describe('Update by query', () => {
				it('OK', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.patchAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: update,
						qs: {
							email: datas[idx1].email,
						},
					});
					expect(res).toHaveProperty('statusCode', 200);
					const patchedData = [
						_.assign({}, datas[idx1], update),
						_.assign({}, datas[idx1 + 1], update),
					];
					compareArrays(respJson, patchedData);
					compareArrays(
						_.map(
							await PhoneBook.findMany({
								email: datas[idx1].email,
							}),
							'attributes'
						),
						patchedData
					);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Not found', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.patchAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: update,
						qs: {
							email: 'NotFound@foo.bar',
						},
					});
					expect(res).toHaveProperty('statusCode', 204);
					expect(respJson).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Trigger JSON error', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res] = await requestApi.patchAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: update,
						qs: {
							query: '{hey:"there"}',
						},
					});
					expect(res).toHaveProperty('statusCode', 400);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Throw if no "where" clause', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res] = await requestApi.patchAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: update,
					});
					expect(res).toHaveProperty('statusCode', 405);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
			});
			afterAll(() => {
				return PhoneBook.deleteMany();
			});
		});
	});
	describe('Find (GET)', () => {
		const idx1 = 1;
		const idx2 = 3;
		describe('Single', () => {
			beforeAll(() => {
				return PhoneBook.insertMany([datas[idx1], datas[idx2]]);
			});
			describe('Find by query', () => {
				it('OK', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.getAsync({
						url: `${baseAPI}/PhoneBook`,
						json: true,
						qs: {
							email: datas[idx1].email,
						},
					});
					expect(res).toHaveProperty('statusCode', 200);
					expect(respJson).toMatchObject(datas[idx1]);
					expect(
						(await PhoneBook.find({
							email: datas[idx1].email,
						})).attributes
					).toMatchObject(datas[idx1]);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Not found', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.getAsync({
						url: `${baseAPI}/PhoneBook`,
						json: true,
						qs: {
							email: 'NotFound@foo.bar',
						},
					});
					expect(res).toHaveProperty('statusCode', 204);
					expect(respJson).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Trigger JSON error', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res] = await requestApi.getAsync({
						url: `${baseAPI}/PhoneBook`,
						json: true,
						qs: {
							query: '{hey:"there"}',
						},
					});
					expect(res).toHaveProperty('statusCode', 400);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Do not throw if no "where" clause', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.getAsync({
						url: `${baseAPI}/PhoneBook`,
						json: true,
					});
					expect(res).toHaveProperty('statusCode', 200);
					expect(respJson).toMatchObject(datas[idx1]);
					expect((await PhoneBook.find({})).attributes).toMatchObject(datas[idx1]);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
			});
			describe('Find by id in URL', () => {
				it('OK', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const entity = await PhoneBook.find(
						{},
						{
							skip: 1,
						}
					);
					const id = entity.getId();
					const [res, respJson] = await requestApi.getAsync({
						url: `${baseAPI}/PhoneBook/${id}`,
						json: true,
					});
					expect(res).toHaveProperty('statusCode', 200);
					expect(respJson).toMatchObject(datas[idx2]);
					expect((await PhoneBook.find(id)).attributes).toMatchObject(datas[idx2]);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Not found', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const id = 42;
					const [res, respJson] = await requestApi.getAsync({
						url: `${baseAPI}/PhoneBook/${id}`,
						json: true,
					});
					expect(res).toHaveProperty('statusCode', 404);
					expect(respJson).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
			});
			afterAll(() => {
				return PhoneBook.deleteMany();
			});
		});
		describe('Mutliple', () => {
			const datasIn = [datas[idx1], datas[idx1 + 1], datas[idx2]];
			beforeAll(() => {
				return PhoneBook.insertMany(datasIn);
			});
			describe('Find by query', () => {
				it('OK', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.getAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: true,
						qs: {
							email: datas[idx1].email,
						},
					});
					expect(res).toHaveProperty('statusCode', 200);
					const patchedData = [datas[idx1], datas[idx1 + 1]];
					compareArrays(respJson, patchedData);
					compareArrays(
						_.map(
							await PhoneBook.findMany({
								email: datas[idx1].email,
							}),
							'attributes'
						),
						patchedData
					);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Not found', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.getAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: true,
						qs: {
							email: 'NotFound@foo.bar',
						},
					});
					expect(res).toHaveProperty('statusCode', 204);
					expect(respJson).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Trigger JSON error', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res] = await requestApi.getAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: true,
						qs: {
							query: '{hey:"there"}',
						},
					});
					expect(res).toHaveProperty('statusCode', 400);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Do not throw if no "where" clause', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.getAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: true,
					});
					expect(res).toHaveProperty('statusCode', 200);
					compareArrays(respJson, datasIn);
					compareArrays(_.map(await PhoneBook.findMany({}), 'attributes'), datasIn);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
			});
			afterAll(() => {
				return PhoneBook.deleteMany();
			});
		});
	});
	describe('Delete (DELETE)', () => {
		beforeAll(() => {
			return PhoneBook.insertMany(datas);
		});
		describe('Single', () => {
			describe('Delete by query', () => {
				it('OK', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.deleteAsync({
						url: `${baseAPI}/PhoneBook`,
						json: true,
						qs: {
							email: datas[7].email,
						},
					});
					expect(res).toHaveProperty('statusCode', 204);
					expect(respJson).toBeUndefined();
					expect(
						await PhoneBook.find({
							email: datas[7].email,
						})
					).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen - 1);
				});
				it('Not found', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.deleteAsync({
						url: `${baseAPI}/PhoneBook`,
						json: true,
						qs: {
							email: 'NotFound@foo.bar',
						},
					});
					expect(res).toHaveProperty('statusCode', 204);
					expect(respJson).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Trigger JSON error', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res] = await requestApi.deleteAsync({
						url: `${baseAPI}/PhoneBook`,
						json: true,
						qs: {
							query: '{hey:"there"}',
						},
					});
					expect(res).toHaveProperty('statusCode', 400);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Throw if no "where" clause', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res] = await requestApi.deleteAsync({
						url: `${baseAPI}/PhoneBook`,
						json: true,
					});
					expect(res).toHaveProperty('statusCode', 405);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
			});
			describe('Delete by id in URL', () => {
				it('OK', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const entity = await PhoneBook.find();
					const id = entity.getId();
					const [res, respJson] = await requestApi.deleteAsync({
						url: `${baseAPI}/PhoneBook/${id}`,
						json: true,
					});
					expect(res).toHaveProperty('statusCode', 204);
					expect(respJson).toBeUndefined();
					expect(await PhoneBook.find(id)).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen - 1);
				});
				it('Not found', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const id = 42;
					const [res, respJson] = await requestApi.deleteAsync({
						url: `${baseAPI}/PhoneBook/${id}`,
						json: true,
					});
					expect(res).toHaveProperty('statusCode', 404);
					expect(respJson).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
			});
		});
		describe('Multiple', () => {
			describe('Delete by query', () => {
				it('OK', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.deleteAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: true,
						qs: DUPLICATE_DATA[0],
					});
					expect(res).toHaveProperty('statusCode', 204);
					expect(respJson).toBeUndefined();
					expect(await PhoneBook.find(DUPLICATE_DATA[0])).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen - 2);
				});
				it('Not found', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res, respJson] = await requestApi.deleteAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: true,
						qs: {
							email: 'NotFound@foo.bar',
						},
					});
					expect(res).toHaveProperty('statusCode', 204);
					expect(respJson).toBeUndefined();
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Trigger JSON error', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res] = await requestApi.deleteAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: true,
						qs: {
							query: '{hey:"there"}',
						},
					});
					expect(res).toHaveProperty('statusCode', 400);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
				it('Throw if no "where" clause', async () => {
					const prevLen = inMemorySource.store.PhoneBook.items.length;
					const [res] = await requestApi.deleteAsync({
						url: `${baseAPI}/PhoneBooks`,
						json: true,
					});
					expect(res).toHaveProperty('statusCode', 405);
					expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
				});
			});
		});
	});
});
