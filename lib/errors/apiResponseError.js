"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const apiError_1 = require("./apiError");
const types_1 = require("../types");
const messagesHash = {
    [types_1.EHttpStatusCode.NotFound]: 'The requested resource does not exist',
    [types_1.EHttpStatusCode.MalformedQuery]: 'The query contains syntax error(s)',
    [types_1.EHttpStatusCode.MethodNotAllowed]: 'The method used on this resource is not allowed',
};
class ApiResponseError extends apiError_1.ApiError {
    constructor(statusCode, ancestor) {
        const message = _.get(messagesHash, statusCode, 'API Error') + (ancestor ? '\nOriginal message: ' + ancestor.message : '');
        super(message, ancestor);
        this.statusCode = statusCode;
    }
}
ApiResponseError.Forbidden = (ancestor) => new ApiResponseError(types_1.EHttpStatusCode.Forbidden, ancestor);
ApiResponseError.NotFound = (ancestor) => new ApiResponseError(types_1.EHttpStatusCode.NotFound, ancestor);
ApiResponseError.MethodNotAllowed = (ancestor) => new ApiResponseError(types_1.EHttpStatusCode.MethodNotAllowed, ancestor);
ApiResponseError.MalformedQuery = (ancestor) => new ApiResponseError(types_1.EHttpStatusCode.MalformedQuery, ancestor);
ApiResponseError.ServerError = (ancestor) => new ApiResponseError(types_1.EHttpStatusCode.ServerError, ancestor);
ApiResponseError.UnsupportedMediaType = (ancestor) => new ApiResponseError(types_1.EHttpStatusCode.UnsupportedMediaType, ancestor);
exports.ApiResponseError = ApiResponseError;
//# sourceMappingURL=apiResponseError.js.map