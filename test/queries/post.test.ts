import _ from 'lodash';

import { inMemorySource, PhoneBook } from '../webserver-init';
import { requestApi, baseAPI, resetDataSource } from '../server';
import { datas } from '../mock';

describe('Create (POST)', () => {
	resetDataSource();
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
});
