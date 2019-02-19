import { ApiError } from './apiError';
import { EHttpStatusCode } from '../types';
export declare class ApiResponseError extends ApiError {
    readonly statusCode: EHttpStatusCode;
    constructor(statusCode: EHttpStatusCode, ancestor?: Error);
    static Forbidden: (ancestor?: Error | undefined) => ApiResponseError;
    static NotFound: (ancestor?: Error | undefined) => ApiResponseError;
    static MethodNotAllowed: (ancestor?: Error | undefined) => ApiResponseError;
    static MalformedQuery: (ancestor?: Error | undefined) => ApiResponseError;
    static ServerError: (ancestor?: Error | undefined) => ApiResponseError;
    static UnsupportedMediaType: (ancestor?: Error | undefined) => ApiResponseError;
}
