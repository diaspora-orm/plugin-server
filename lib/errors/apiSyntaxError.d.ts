import { ApiError } from './apiError';
export declare class ApiSyntaxError extends ApiError {
    constructor(message: string, ancestor?: Error);
}
