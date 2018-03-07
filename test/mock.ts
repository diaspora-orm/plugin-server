import _ from 'lodash';

export const DUPLICATE_DATA = [
	{
		email: 'misitt1@goodreads.com',
	},
	{
		phone: '880-18-2457',
	},
];

export const datas = [
	{
		name: 'Rozanna Neiland',
	},
	_.assign(
		{
			name: 'Mannie Isitt',
		},
		DUPLICATE_DATA[0]
	),
	_.assign(
		{
			name: 'Margy Keach',
		},
		DUPLICATE_DATA[0]
	),
	_.assign(
		{
			name: 'Orelie Robert',
			email: 'orobert3@hc360.com',
		},
		DUPLICATE_DATA[1]
	),
	_.assign(
		{
			name: 'Vera Jirka',
		},
		DUPLICATE_DATA[1]
	),
	{
		name: 'Claudia Legh',
		phone: '509-12-6322',
	},
	{
		name: 'Milty Spon',
		email: 'mspon6@paginegialle.it',
	},
	{
		name: "Sumner M'Quhan",
		email: 'smquhan7@bloglines.com',
		phone: '303-77-0246',
	},
];
