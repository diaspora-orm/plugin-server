import { ApiError } from './apiError';

export class ApiSyntaxError extends ApiError {
	public constructor( message: string, ancestor?: Error ) {
		super( message, ancestor );
	}
}
