import _ = require( 'lodash' );

import { ApiError } from './apiError';
import { EHttpStatusCode } from '../types';

const messagesHash = {
	[EHttpStatusCode.NotFound]: 'The requested resource does not exist',
	[EHttpStatusCode.MalformedQuery]: 'The query contains syntax error(s)',
	[EHttpStatusCode.MethodNotAllowed]: 'The method used on this resource is not allowed',
};

export class ApiResponseError extends ApiError{
	public readonly statusCode: EHttpStatusCode;

	public constructor( statusCode: EHttpStatusCode, ancestor?: Error ){
		const message = _.get( messagesHash, statusCode, 'API Error' ) + ( ancestor ? '\nOriginal message: ' + ancestor.message : '' );

		super( message, ancestor );
		this.statusCode = statusCode;
	}

	public static Forbidden = ( ancestor?: Error ) => new ApiResponseError( EHttpStatusCode.Forbidden, ancestor );
	public static NotFound = ( ancestor?: Error ) => new ApiResponseError( EHttpStatusCode.NotFound, ancestor );
	public static MethodNotAllowed = ( ancestor?: Error ) => new ApiResponseError( EHttpStatusCode.MethodNotAllowed, ancestor );
	public static MalformedQuery = ( ancestor?: Error ) => new ApiResponseError( EHttpStatusCode.MalformedQuery, ancestor );
	public static ServerError = ( ancestor?: Error ) => new ApiResponseError( EHttpStatusCode.ServerError, ancestor );
	public static UnsupportedMediaType = ( ancestor?: Error ) => new ApiResponseError( EHttpStatusCode.UnsupportedMediaType, ancestor );
}
