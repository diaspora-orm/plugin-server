import * as _ from 'lodash';
import { Diaspora, EFieldType } from '@diaspora/diaspora';

import { setApiMiddleware } from '../webserver-init';
import { inMemorySource, SOURCE_NAME } from './datasource-init';
import { datas } from './mock';
import { ExpressApiGenerator } from '../../../src';

const PHONEBOOK_MODEL_NAME = 'PhoneBook';

export const PhoneBook = Diaspora.declareModel( PHONEBOOK_MODEL_NAME, {
	sources: SOURCE_NAME,
	attributes: {
		name: {
			type: EFieldType.STRING,
			required: true,
		},
		phone: EFieldType.STRING,
		email: {
			type: EFieldType.STRING,
		},
		index: {
			type: EFieldType.INTEGER,
		},
	},
} );

export const store: { items: any[] } = ( inMemorySource.adapter as any ).store[PHONEBOOK_MODEL_NAME];

export const resetMock = () => {
	store.items = [];
	_.forEach( datas, ( entity ) => {
		store.items.push( inMemorySource.adapter.classEntity.setId( _.cloneDeep( entity ), inMemorySource.adapter ) );
	} );
};

export const apiGenerator = new ExpressApiGenerator( {
	webserverType: 'express',
	models: {
		[PHONEBOOK_MODEL_NAME]: true,
	},
} );

export const setCurrent = () => setApiMiddleware( apiGenerator.middleware );
export const unsetCurrent = () => setApiMiddleware( undefined );
