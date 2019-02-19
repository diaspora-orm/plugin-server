import { Errors, ELoggingLevel } from '@diaspora/diaspora';
import { EHttpStatusCode } from '../types';
import { IDiasporaApiRequest, IDiasporaApiRequestDescriptorPreParse } from '../index';
export declare class ApiError extends Errors.ExtendableError {
    constructor(message: string, ancestor?: Error);
    readonly logLevel: ELoggingLevel;
    readonly statusCode: EHttpStatusCode;
    readonly errorName: string;
    readonly validationErrors?: string[];
    makeMessage<TModel>(req: IDiasporaApiRequest<TModel, IDiasporaApiRequestDescriptorPreParse<TModel>>): string;
    toJson<TModel>(req: IDiasporaApiRequest<TModel, IDiasporaApiRequestDescriptorPreParse<TModel>>): {
        message: string;
        statusCode: EHttpStatusCode;
        error: Error | undefined;
        name: string;
        validationErrors: string[] | undefined;
    };
}
