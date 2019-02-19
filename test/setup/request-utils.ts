import * as request from 'request';
import * as _ from 'lodash';
import { promisifyAll } from 'bluebird';

type Param = {
	url: string;
	json?: object | boolean;
	qs?: object;
	headers?: {
		[key: string]: string;
	};
} | string;

export const requestApi: {
	optionsAsync( params: Param ): Promise<[Response, any]>;
	getAsync( params: Param ): Promise<[Response, any]>;
	deleteAsync( params: Param ): Promise<[Response, any]>;
	postAsync( params: Param ): Promise<[Response, any]>;
	patchAsync( params: Param ): Promise<[Response, any]>;
	putAsync( params: Param ): Promise<[Response, any]>;
} = promisifyAll( request, {
	multiArgs: true,
} ) as any;

export const stripIdHash = ( object: object ) => _.omit( object, ['idHash'] );
export const stripIdHashArr = ( objects: any[] ) => _.map( objects, stripIdHash );
