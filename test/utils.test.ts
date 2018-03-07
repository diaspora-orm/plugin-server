import _ from 'lodash';

import { configureList, respondError, prettylog } from '../src/utils';
import { datas } from './mock';
import { inspect } from 'util';

describe('Test utilities', () => {
	it('configureList', () => {
		expect(
			configureList(
				{
					'*': true,
					b: false,
				},
				['a', 'b', 'c']
			)
		).toEqual({
			a: true,
			c: true,
		});
		expect(
			configureList(
				{
					'/aa?/': true,
				},
				['a', 'aa', 'ab', 'aaa', 'b', 'ba', 'c']
			)
		).toEqual({
			a: true,
			aa: true,
			ab: true,
			aaa: true,
			ba: true,
		});
		expect(
			configureList(
				{
					'*foo*': {
						foo: true,
						last: 'foo',
					},
					'*bar*': {
						bar: true,
						last: 'bar',
					},
				},
				['foo', 'fooqux', 'bar', 'barqux', 'foobar', 'qux']
			)
		).toEqual({
			foo: {
				foo: true,
				last: 'foo',
			},
			fooqux: {
				foo: true,
				last: 'foo',
			},
			bar: {
				bar: true,
				last: 'bar',
			},
			barqux: {
				bar: true,
				last: 'bar',
			},
			foobar: {
				foo: true,
				bar: true,
				last: 'bar',
			},
		});
	});
	it('respondError', () => {
		return new Promise((resolve, reject) => {
			let checks = {
				status: false,
				message: false,
			};
			const pseudoRes = {
				status(code) {
					checks.status = 500 === code;
					return this;
				},
				send(message) {
					expect(message).not.toBeUndefined();
					checks.message = true;
					if (
						_.isEqual(checks, {
							status: true,
							message: true,
						})
					) {
						return resolve();
					} else {
						return reject();
					}
				},
			};
			respondError(pseudoRes as any);
		});
	});
	it('prettylog', () => {
		const oldConsole = console;
		(global as any).console = {
			log: jest.fn(),
		};

		prettylog(datas);
		expect(console.log).toHaveBeenCalledWith(
			inspect(datas, {
				colors: true,
				depth: 8,
			})
		);

		(global as any).console = oldConsole;
	});
});
