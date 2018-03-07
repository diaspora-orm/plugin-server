import _ from 'lodash';

import { PhoneBook, inMemorySource } from '../webserver-init';
import { datas, DUPLICATE_DATA } from '../mock';
import { requestApi, baseAPI, compareArrays, resetDataSource } from '../server';

describe('Replace (PUT)', () => {
	const idx1 = 1;
	const idx2 = 0;
	const update = {
		name: 'Josey Passey',
		phone: '332-83-8304',
	};
	describe('Single', () => {
		resetDataSource();
		describe('Replace by query', () => {
			it('OK', async () => {
				const entityId = (await PhoneBook.find({
					email: datas[idx1].email,
				})).getId();
				const [res, respJson] = await requestApi.putAsync({
					url: `${baseAPI}/PhoneBook`,
					json: update,
					qs: {
						email: datas[idx1].email,
					},
				});
				expect(res).toHaveProperty('statusCode', 200);
				expect(respJson).toMatchObject(update);
				expect((await PhoneBook.find({ id: entityId })).attributes).toMatchObject(
					update
				);
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(datas.length);
			});
			it('Not found', async () => {
				const [res, respJson] = await requestApi.putAsync({
					url: `${baseAPI}/PhoneBook`,
					json: update,
					qs: {
						email: 'NotFound@foo.bar',
					},
				});
				expect(res).toHaveProperty('statusCode', 204);
				expect(respJson).toBeUndefined();
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(datas.length);
			});
			it('Trigger JSON error', async () => {
				const [res] = await requestApi.putAsync({
					url: `${baseAPI}/PhoneBook`,
					json: update,
					qs: {
						query: '{hey:"there"}',
					},
				});
				expect(res).toHaveProperty('statusCode', 400);
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(datas.length);
			});
			it('Throw if no "where" clause', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res] = await requestApi.putAsync({
					url: `${baseAPI}/PhoneBook`,
					json: update,
				});
				expect(res).toHaveProperty('statusCode', 405);
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(datas.length);
			});
		});
		describe('Replace by id in URL', () => {
			it('OK', async () => {
				const entity = await PhoneBook.find(
					{},
					{
						skip: 1,
					}
				);
				const id = entity.getId();
				const [res, respJson] = await requestApi.putAsync({
					url: `${baseAPI}/PhoneBook/${id}`,
					json: update,
				});
				expect(res).toHaveProperty('statusCode', 200);
				const patchedData = _.assign({}, datas[idx2], update);
				expect(respJson).toMatchObject(patchedData);
				expect((await PhoneBook.find(id)).attributes).toMatchObject(patchedData);
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(datas.length);
			});
			it('Not found', async () => {
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(datas.length);
				const id = 42;
				const [res, respJson] = await requestApi.putAsync({
					url: `${baseAPI}/PhoneBook/${id}`,
					json: update,
				});
				expect(res).toHaveProperty('statusCode', 404);
				expect(respJson).toBeUndefined();
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(datas.length);
			});
		});
	});
	describe('Mutliple', () => {
		resetDataSource();
		describe('Replace by query', () => {
			it('OK', async () => {
				const entitiesId = _.map(
					await PhoneBook.findMany({
						email: DUPLICATE_DATA[0].email,
					}),
					(entity: any) => entity.getId() as string
				);
				const [res, respJson] = await requestApi.putAsync({
					url: `${baseAPI}/PhoneBooks`,
					json: update,
					qs: {
						email: DUPLICATE_DATA[0].email,
					},
				});
				expect(res).toHaveProperty('statusCode', 200);
				compareArrays(respJson, [update, update]);
				compareArrays(
					_.map(
						await Promise.all(
							_.map(entitiesId, entityId => PhoneBook.find({ id: entityId }))
						),
						entity => entity.toObject()
					),
					[update, update]
				);
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(datas.length);
			});
			it('Not found', async () => {
				const [res, respJson] = await requestApi.putAsync({
					url: `${baseAPI}/PhoneBooks`,
					json: update,
					qs: {
						email: 'NotFound@foo.bar',
					},
				});
				expect(res).toHaveProperty('statusCode', 204);
				expect(respJson).toBeUndefined();
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(datas.length);
			});
			it('Trigger JSON error', async () => {
				const prevLen = inMemorySource.store.PhoneBook.items.length;
				const [res] = await requestApi.putAsync({
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
				const [res] = await requestApi.putAsync({
					url: `${baseAPI}/PhoneBooks`,
					json: update,
				});
				expect(res).toHaveProperty('statusCode', 405);
				expect(inMemorySource.store.PhoneBook.items).toHaveLength(prevLen);
			});
		});
	});
});
