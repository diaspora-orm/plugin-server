import _ from 'lodash';

export interface IConfigurationRaw {
	webserverType?: string;
	models?: {
		[key: string]: any;
	};
}
export interface IConfiguration extends IConfigurationRaw {
	webserverType: EWebServerType;
	models: {
		[key: string]: {
			middlewares?: IMiddlewareHash;
		};
	};
}
export interface IMiddlewareHash {
	all?: ( req: any, res: any, next: Function ) => void;

	delete?: ( req: any, res: any, next: Function ) => void;
	deleteOne?: ( req: any, res: any, next: Function ) => void;
	deleteMany?: ( req: any, res: any, next: Function ) => void;

	get?: ( req: any, res: any, next: Function ) => void;
	find?: ( req: any, res: any, next: Function ) => void;
	findOne?: ( req: any, res: any, next: Function ) => void;
	findMany?: ( req: any, res: any, next: Function ) => void;

	patch?: ( req: any, res: any, next: Function ) => void;
	update?: ( req: any, res: any, next: Function ) => void;
	updateOne?: ( req: any, res: any, next: Function ) => void;
	updateMany?: ( req: any, res: any, next: Function ) => void;

	put?: ( req: any, res: any, next: Function ) => void;
	replace?: ( req: any, res: any, next: Function ) => void;
	replaceOne?: ( req: any, res: any, next: Function ) => void;
	replaceMany?: ( req: any, res: any, next: Function ) => void;

	post?: ( req: any, res: any, next: Function ) => void;
	insert?: ( req: any, res: any, next: Function ) => void;
	insertOne?: ( req: any, res: any, next: Function ) => void;
	insertMany?: ( req: any, res: any, next: Function ) => void;
}

export enum EWebServerType {
	EXPRESS = 'express',
}
import expressServer from './webservers/express';
const servers = {
	[EWebServerType.EXPRESS]: expressServer,
};

export const buildApi = ( config: IConfigurationRaw = {} ) => {
	const defaulted: IConfiguration = _.defaults( config, {
		webserverType: EWebServerType.EXPRESS,
		models: {},
	} );

	return servers[defaulted.webserverType]( defaulted ) as any;
};
