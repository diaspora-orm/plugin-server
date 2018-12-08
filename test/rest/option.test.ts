import * as _ from 'lodash';

import { baseAPI, config, requestApi } from '../server';

describe( 'Infos (OPTION)', () => {
	it( 'Get API index (OPTION)', async () => {
		const [res, body] = await requestApi.optionsAsync( baseAPI );

		expect( res ).toHaveProperty( 'statusCode', 200 );
		const respJson = JSON.parse( body );

		expect( _.keys( respJson ) ).toEqual( expect.arrayContaining( ['PhoneBook'] ) );
		expect( Object.keys( respJson.PhoneBook ) ).toEqual( ['/PhoneBook/$ID', '/PhoneBooks'] );
		expect( respJson.PhoneBook['/PhoneBook/$ID'] ).toHaveProperty(
			'canonicalUrl',
			`${config.baseApi}/PhoneBook/$ID`
		);
		expect( respJson.PhoneBook['/PhoneBook/$ID'] ).toHaveProperty( 'parameters' );
		expect( respJson.PhoneBook['/PhoneBook/$ID'] ).toHaveProperty( 'description' );

		expect( respJson.PhoneBook['/PhoneBooks'] ).toHaveProperty(
			'canonicalUrl',
			`${config.baseApi}/PhoneBooks`
		);
		expect( respJson.PhoneBook['/PhoneBooks'] ).toHaveProperty( 'description' );
	} );
} );
