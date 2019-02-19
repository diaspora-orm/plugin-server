import * as _ from 'lodash';

import { EHttpStatusCode } from '../../../src/types';
import { requestApi } from '../../setup/request-utils';
import { config } from '../../setup/config';
import { setCurrent, unsetCurrent } from '../../setup/mocks/phonebook-mock';

beforeAll( setCurrent );
describe( 'Infos (OPTION)', () => {
	it( 'Get API index (OPTION)', async () => {
		const [res, body] = await requestApi.optionsAsync( {
			url: config.baseUrl,
			headers: {
				Accept: 'application/json',
			},
		} );

		expect( res ).toHaveProperty( 'statusCode', EHttpStatusCode.Ok );
		const respJson = JSON.parse( body );

		expect( _.keys( respJson ) ).toEqual( expect.arrayContaining( ['apiType', 'version', 'routes'] ) );
		expect( respJson ).toHaveProperty( 'apiType', require( '../../../package.json' ).name );
		expect( respJson ).toHaveProperty( 'version', require( '../../../package.json' ).version );


		const routes = respJson.routes;
		expect( _.keys( routes ) ).toEqual( expect.arrayContaining( ['PhoneBook'] ) );
		expect( Object.keys( routes.PhoneBook ) ).toEqual( ['/phonebook/$ID', '/phonebooks'] );
		expect( routes.PhoneBook['/phonebook/$ID'] )
			.toHaveProperty( 'canonicalUrl', `${config.basePath}/phonebook/$ID` );
		expect( routes.PhoneBook['/phonebook/$ID'] ).toHaveProperty( 'parameters' );
		expect( routes.PhoneBook['/phonebook/$ID'] ).toHaveProperty( 'description' );

		expect( routes.PhoneBook['/phonebooks'] )
			.toHaveProperty( 'canonicalUrl', `${config.basePath}/phonebooks` );
		expect( routes.PhoneBook['/phonebooks'] ).toHaveProperty( 'description' );
	} );
} );
afterAll( unsetCurrent );
