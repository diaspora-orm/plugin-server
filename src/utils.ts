import _ from 'lodash';
import util from 'util';
import { Minimatch } from 'minimatch';
// TODO: Define interface, and skip this import.
import express from 'express';
import { IDiasporaApiRequest } from './webservers/express';

const Diaspora = require('diaspora');

export interface SelectQuery {
	[key: string]: any;
}
export interface Model {
	[key: string]: any;
}
export interface Entity {
	[key: string]: any;
}
export interface Set extends _.LoDashImplicitArrayWrapper<Entity> {
	length: number;
}
export enum HttpVerb {
	GET = 'GET',
	DELETE = 'DELETE',
	PATCH = 'PATCH',
	POST = 'POST',
	PUT = 'PUT',
}

const applySelector = (oldVal: any, newVal: any) => {
	if (_.isObject(newVal)) {
		if (_.isObject(oldVal)) {
			return _.assign(oldVal, newVal);
		} else {
			return _.clone(newVal);
		}
	} else {
		return newVal;
	}
};

export const configureList = (
	pickers: { [key: string]: object | boolean },
	set: string[]
) => {
	// TODO: detail
	const configurationObject: { [key: string]: any } = {};

	_.forEach(pickers, (picker, key) => {
		// If the key is a regex or a minimatch (check for `*`), this var will be set to a function
		let matcher: ((name: string) => boolean) | false = false;

		if (key.startsWith('/') && key.endsWith('/')) {
			const regex = new RegExp(key.slice(1).slice(0, -1));
			matcher = (name: string) => {
				return !_.isNil(name.match(regex));
			};
		} else if (key.includes('*')) {
			const mm = new Minimatch(key, {});
			matcher = (name: string) => {
				return mm.match(name);
			};
		}

		if (!matcher) {
			// Matching is required
			if (-1 === set.indexOf(key)) {
				throw new ReferenceError(
					`Trying to match unexistent key ${key} in ${JSON.stringify(set)}.`
				);
			}
			configurationObject[key] = applySelector(configurationObject[key], picker);
		} else {
			const subMatcher = matcher;
			// Matching is optionnal
			_.forEach(set, element => {
				if (subMatcher(element)) {
					configurationObject[element] = applySelector(
						configurationObject[element],
						picker
					);
				}
			});
		}
	});
	return _.pickBy(configurationObject);
};

export const prettylog = (object: any, config: util.InspectOptions = {}) => {
	config = _.defaults(config, {
		colors: true,
		depth: 8,
	});
	console.log(util.inspect(object, config));
};

export interface JsonError {
	message?: string;
}

export const respondError = (
	res: express.Response,
	error?: Error,
	status?: number
) => {
	const jsonError: JsonError = _.assign({}, error);
	jsonError.message = _.isError(error)
		? error.message || error.toString()
		: undefined;
	if (error instanceof Diaspora.components.Errors.ValidationError) {
		Diaspora.logger.debug(
			`Request ${
				((res as any).req as IDiasporaApiRequest).diasporaApi.id
			} triggered a validation error: message is ${JSON.stringify(
				jsonError.message
			)}`,
			jsonError
		);
		res.status(status || 400).send(jsonError);
		return;
	} else {
		Diaspora.logger.error(
			`Request ${_.get(
				res,
				'req.diasporaApi.id',
				'UNKNOWN'
			)} triggered an error: message is ${JSON.stringify(jsonError.message)}`,
			jsonError
		);
		res.status(status || 500).send(jsonError);
		return;
	}
};
