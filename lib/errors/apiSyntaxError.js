"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apiError_1 = require("./apiError");
class ApiSyntaxError extends apiError_1.ApiError {
    constructor(message, ancestor) {
        super(message, ancestor);
    }
}
exports.ApiSyntaxError = ApiSyntaxError;
//# sourceMappingURL=apiSyntaxError.js.map