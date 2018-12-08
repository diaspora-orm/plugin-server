import { Errors, ELoggingLevel } from '@diaspora/diaspora';
import _ = require( 'lodash' );

import { EHttpStatusCode } from '../types';
import { IDiasporaApiRequest, IDiasporaApiRequestDescriptorPreParse } from '../index';

export class ApiError extends Errors.ExtendableError {
	public constructor( message: string, ancestor?: Error ) {
		super( message, ancestor );
		if ( ancestor instanceof Errors.ValidationError ){
			this.logLevel = ELoggingLevel.Debug;
			this.statusCode = EHttpStatusCode.MalformedQuery;// TODO: StatusCodes
		} else {
			this.logLevel = ELoggingLevel.Error;
			this.statusCode = EHttpStatusCode.ServerError;
		}
		this.errorName = this.ancestor ? this.ancestor.name : this.name;
		this.validationErrors = this.ancestor instanceof Errors.SetValidationError ? _.map( this.ancestor.validationErrors, 'message' ) : undefined;
	}

	public readonly logLevel: ELoggingLevel;
	public readonly statusCode: EHttpStatusCode;
	public readonly errorName: string;
	public readonly validationErrors?: string[];


	public makeMessage<TModel>( req: IDiasporaApiRequest<TModel, IDiasporaApiRequestDescriptorPreParse<TModel>> ){
		const jsonMessage = JSON.stringify( this.message );
		const requestId = _.get( req, 'diasporaApi.id', 'UNKNOWN' );

		if ( this.ancestor instanceof Errors.ValidationError ){
			return `Request ${requestId} triggered a validation error: message is ${jsonMessage}`;
		} else {
			return `Request ${requestId} triggered an error: message is ${jsonMessage}`;
		}
	}

	public toJson<TModel>( req: IDiasporaApiRequest<TModel, IDiasporaApiRequestDescriptorPreParse<TModel>> ){
		return {
			message: this.makeMessage( req ),
			statusCode: this.statusCode,
			error: this.ancestor,
			name: this.ancestor ? this.ancestor.name : this.name,
			validationErrors: this.validationErrors,
		};
	}
}

