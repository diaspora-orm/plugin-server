"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const diaspora_1 = require("@diaspora/diaspora");
const _ = require("lodash");
const types_1 = require("../types");
class ApiError extends diaspora_1.Errors.ExtendableError {
    constructor(message, ancestor) {
        super(message, ancestor);
        if (ancestor instanceof diaspora_1.Errors.ValidationError) {
            this.logLevel = diaspora_1.ELoggingLevel.Debug;
            this.statusCode = types_1.EHttpStatusCode.MalformedQuery; // TODO: StatusCodes
        }
        else {
            this.logLevel = diaspora_1.ELoggingLevel.Error;
            this.statusCode = types_1.EHttpStatusCode.ServerError;
        }
        this.errorName = this.ancestor ? this.ancestor.name : this.name;
        this.validationErrors = this.ancestor instanceof diaspora_1.Errors.SetValidationError ? _.map(this.ancestor.validationErrors, 'message') : undefined;
    }
    makeMessage(req) {
        const jsonMessage = JSON.stringify(this.message);
        const requestId = _.get(req, 'diasporaApi.id', 'UNKNOWN');
        if (this.ancestor instanceof diaspora_1.Errors.ValidationError) {
            return `Request ${requestId} triggered a validation error: message is ${jsonMessage}`;
        }
        else {
            return `Request ${requestId} triggered an error: message is ${jsonMessage}`;
        }
    }
    toJson(req) {
        return {
            message: this.makeMessage(req),
            statusCode: this.statusCode,
            error: this.ancestor,
            name: this.ancestor ? this.ancestor.name : this.name,
            validationErrors: this.validationErrors,
        };
    }
}
exports.ApiError = ApiError;
//# sourceMappingURL=apiError.js.map