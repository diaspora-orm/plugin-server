import Express, { RequestHandler } from 'express';
import * as _ from 'lodash';

import { Model } from '@diaspora/diaspora/lib/model';

import { Entity } from '@diaspora/diaspora/lib/entities';
import { QueryLanguage } from '@diaspora/diaspora/lib/types/queryLanguage';
import { EQueryAction, EQueryNumber } from './utils';
import expressServer from './webservers/express';

export interface IDiasporaApiRequestDescriptorPreParse {
	id: string;
	number: EQueryNumber;
	action: EQueryAction;
	model: Model;
	body: object | object[] | any;
}
export interface IDiasporaApiRequestDescriptor extends IDiasporaApiRequestDescriptorPreParse {
	where: QueryLanguage.SelectQueryOrCondition | { id: string };
	options: QueryLanguage.QueryOptions;
	raw: any;
	urlId?: string;
	target?: Entity;
}
export interface IDiasporaApiRequest<T extends IDiasporaApiRequestDescriptorPreParse = IDiasporaApiRequestDescriptor> extends Express.Request {
	diasporaApi: T;
}

export type IHookFunction<T extends Express.Request> = ( req: T, res: Express.Response, next: Express.NextFunction, model: Model ) => void;
export type IHookFunctionOrArr<T extends Express.Request> = IHookFunction<T> | Array<IHookFunction<T>>;
export interface IMiddlewareHash {
	all?: IHookFunctionOrArr<IDiasporaApiRequest>;

	delete?: IHookFunctionOrArr<IDiasporaApiRequest>;
	deleteOne?: IHookFunctionOrArr<IDiasporaApiRequest>;
	deleteMany?: IHookFunctionOrArr<IDiasporaApiRequest>;

	get?: IHookFunctionOrArr<IDiasporaApiRequest>;
	find?: IHookFunctionOrArr<IDiasporaApiRequest>;
	findOne?: IHookFunctionOrArr<IDiasporaApiRequest>;
	findMany?: IHookFunctionOrArr<IDiasporaApiRequest>;

	patch?: IHookFunctionOrArr<IDiasporaApiRequest>;
	update?: IHookFunctionOrArr<IDiasporaApiRequest>;
	updateOne?: IHookFunctionOrArr<IDiasporaApiRequest>;
	updateMany?: IHookFunctionOrArr<IDiasporaApiRequest>;

	put?: IHookFunctionOrArr<IDiasporaApiRequest>;
	replace?: IHookFunctionOrArr<IDiasporaApiRequest>;
	replaceOne?: IHookFunctionOrArr<IDiasporaApiRequest>;
	replaceMany?: IHookFunctionOrArr<IDiasporaApiRequest>;

	post?: IHookFunctionOrArr<IDiasporaApiRequest>;
	insert?: IHookFunctionOrArr<IDiasporaApiRequest>;
	insertOne?: IHookFunctionOrArr<IDiasporaApiRequest>;
	insertMany?: IHookFunctionOrArr<IDiasporaApiRequest>;
}

export interface IModelConfigurationRaw {
	singular?: string;
	plural?: string;
	middlewares?: IMiddlewareHash;
}
export interface IConfigurationRaw {
	webserverType?: string;
	models: {
		[key: string]: IModelConfigurationRaw | boolean;
	};
}


export interface IModelConfiguration extends IModelConfigurationRaw {
	singular: string;
	plural: string;
	middlewares: IMiddlewareHash;
}
export interface IConfiguration extends IConfigurationRaw {
	webserverType: EWebServerType;
	models: {
		[key: string]: IModelConfiguration;
	};
}

export enum EWebServerType {
	EXPRESS = 'express',
}

const servers = {
	[EWebServerType.EXPRESS]: expressServer,
};

export const buildApi = ( config: IConfigurationRaw = {models: {}} ) => {
	const defaulted: IConfiguration = _.defaults( config, {
		webserverType: EWebServerType.EXPRESS,
		models: {},
	} );

	return servers[defaulted.webserverType]( defaulted ) as any;
};
