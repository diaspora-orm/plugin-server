import Express from 'express';
import * as _ from 'lodash';

import { QueryLanguage, Model, Entity } from '@diaspora/diaspora';
import { EQueryAction, EQueryPlurality } from './utils';

export interface IDiasporaApiRequestDescriptorPreParse<TModel> {
	id: string;
	number: EQueryPlurality;
	action: EQueryAction;
	model: Model<TModel>;
	body: object | object[] | any;
}
export interface IDiasporaApiRequestDescriptor<TModel> extends IDiasporaApiRequestDescriptorPreParse<TModel> {
	where: QueryLanguage.SelectQueryOrCondition | { id: string };
	options: QueryLanguage.IQueryOptions;
	raw: any;
	urlId?: string;
	target?: Entity<TModel>;
}
export interface IDiasporaApiRequest<TModel, T extends IDiasporaApiRequestDescriptorPreParse<TModel> = IDiasporaApiRequestDescriptor<TModel>> extends Express.Request {
	diasporaApi: T;
}

export type THookFunction<TModel, T extends Express.Request> = ( req: T, res: Express.Response, next: Express.NextFunction, model: Model<TModel> ) => void;
export type IHookFunctionOrArr<TModel, T extends Express.Request> = THookFunction<TModel, T> | Array<THookFunction<TModel, T>>;
export interface IMiddlewareHash<TModel> {
	all?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;

	delete?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	deleteOne?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	deleteMany?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;

	get?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	find?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	findOne?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	findMany?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;

	patch?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	update?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	updateOne?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	updateMany?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;

	put?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	replace?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	replaceOne?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	replaceMany?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;

	post?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	insert?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	insertOne?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
	insertMany?: IHookFunctionOrArr<TModel, IDiasporaApiRequest<TModel>> | boolean;
}

export interface IModelConfigurationRaw<TModel> {
	singular?: string;
	plural?: string;
	middlewares?: IMiddlewareHash<TModel>;
}
export interface IConfigurationRaw {
	webserverType?: string;
	models: _.Dictionary<IModelConfigurationRaw<any> | boolean>;
}


export interface IModelConfiguration<TModel> extends IModelConfigurationRaw<TModel> {
	singular: string;
	plural: string;
	middlewares: IMiddlewareHash<TModel>;
	model: Model<TModel>;
}
export interface IConfiguration extends IConfigurationRaw {
	models: _.Dictionary<IModelConfiguration<any>>;
}

export { ExpressApiGenerator } from './webservers/express';
