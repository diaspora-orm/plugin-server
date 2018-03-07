import _ from 'lodash';

import { PhoneBook, inMemorySource } from '../webserver-init';
import { datas } from '../mock';
import { requestApi, baseAPI, compareArrays, resetDataSource } from '../server';

describe('Find (GET)', () => {
	const idx1 = 0;
	const idx2 = 1;
	describe('Single', () => {
		resetDataSource();
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
	});
	describe('Mutliple', () => {
		resetDataSource();
		describe('Find by query', () => {
			it('OK', async () => {
				const [res, respJson] = await requestApi.getAsync({
					url: `${baseAPI}/PhoneBooks`,
					json: true,
					qs: {
						email: datas[idx2].email,
					},
				});
				expect(res).toHaveProperty('statusCode', 200);
				compareArrays(respJson, _.filter(datas, { email: datas[idx2].email }));
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
				compareArrays(respJson, datas);
				compareArrays(
					_.map(await PhoneBook.findMany({}), (entity: any) => entity.toObject()),
					datas
				);
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
			});
		});
	});
});
