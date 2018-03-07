import _ from 'lodash';

import { requestApi, baseAPI, config } from '../server';
import { prettylog } from '../../src/utils';

describe('Infos (OPTION)', () => {
	it('Get API index (OPTION)', async () => {
		const [res, body] = await requestApi.optionsAsync(baseAPI);

		expect(res).toHaveProperty('statusCode', 200);
		const respJson = JSON.parse(body);

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
});
