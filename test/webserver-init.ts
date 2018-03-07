import http from 'http';
import express from 'express';

const Diaspora = require('diaspora');

import { buildApi as DiasporaServer } from '../src/diaspora-server';
const config = require('./config');

export const inMemorySource = Diaspora.createNamedDataSource(
	'myDataSource',
	'inMemory',
	{}
);

export const PhoneBook = Diaspora.declareModel('PhoneBook', {
	sources: ['myDataSource'],
	attributes: {
		name: {
			type: 'string',
			required: true,
		},
		phone: 'string',
		email: {
			type: 'string',
		},
		index: {
			type: 'integer',
		},
	},
});
/*const Ignored = */ Diaspora.declareModel('Ignored', {
	sources: ['myDataSource'],
	attributes: {},
});

const app = express();
app.use(
	'/api',
	DiasporaServer({
		webserverType: 'express',
		models: {
			PhoneBook: {
				singular: 'PhoneBook',
				plural: 'PhoneBooks',
			},
			Ignored: false,
		},
	})
);

export const server: () => Promise<http.Server> = () =>
	new Promise((resolve, reject) => {
		const httpServer = app.listen(config.port, () => {
			console.log(`Example app listening on port ${config.port}!`);
			resolve(httpServer);
		});
	});
