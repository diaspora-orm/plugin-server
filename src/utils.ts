'use strict';

const _ = require('lodash');
const util = require('util');
const Diaspora = require('diaspora');
const Minimatch = require('minimatch').Minimatch;

const applySelector = (oldVal, newVal) => {
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

var Utils = {
	configureList(pickers, set) {
		const configurationObject = {};
		_.forEach(pickers, (picker, key) => {
			// If the key is a regex or a minimatch (check for `*`), this var will be set to a function
			let matcher = false;

			if (key.startsWith('/') && key.endsWith('/')) {
				const regex = new RegExp(key.slice(1).slice(0, -1));
				matcher = name => {
					return !_.isNil(name.match(regex));
				};
			} else if (key.includes('*')) {
				const mm = new Minimatch(key, {});
				matcher = name => {
					return mm.match(name);
				};
			}

			if (matcher) {
				// Matching is optionnal
				_.forEach(set, element => {
					if (matcher(element)) {
						configurationObject[element] = applySelector(
							configurationObject[element],
							picker
						);
					}
				});
			} else {
				// Matching is required
				if (-1 === set.indexOf(key)) {
					throw new ReferenceError(
						`Trying to match unexistent key ${key} in ${JSON.stringify(set)}.`
					);
				}
				configurationObject[key] = applySelector(configurationObject[key], picker);
			}
		});
		return _.pickBy(configurationObject);
	},
	prettylog(object, config) {
		config = _.defaults(config, {
			colors: true,
			depth: 8,
		});
		console.log(util.inspect(object, config));
	},
	respondError(res, error, status) {
		const jsonError = _.assign({}, error);
		jsonError.message = _.isError(error)
			? error.message || error.toString()
			: undefined;
		if (error instanceof Diaspora.components.Errors.ValidationError) {
			Diaspora.logger.debug(
				`Request ${res.req.diasporaApi
					.id} triggered a validation error: message is ${JSON.stringify(
					jsonError.message
				)}`,
				jsonError
			);
			return res.status(status || 400).send(jsonError);
		} else {
			Diaspora.logger.error(
				`Request ${_.get(
					res,
					'req.diasporaApi.id',
					'UNKNOWN'
				)} triggered an error: message is ${JSON.stringify(jsonError.message)}`,
				jsonError
			);
			return res.status(status || 500).send(jsonError);
		}
	},
};

module.exports = Utils;
