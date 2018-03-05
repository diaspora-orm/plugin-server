'use strict';

const _ = require('lodash');

const DiasporaServer = (config = {}) => {
	_.defaults(config, {
		webserverType: 'express',
	});

	return require(`./webservers/${config.webserverType}`)(config);
};

module.exports = DiasporaServer;
