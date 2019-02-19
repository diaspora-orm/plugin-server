"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Lists all HTTP status codes used by this webserver
 *
 * @author Gerkin
 */
var EHttpStatusCode;
(function (EHttpStatusCode) {
    EHttpStatusCode[EHttpStatusCode["Ok"] = 200] = "Ok";
    EHttpStatusCode[EHttpStatusCode["Created"] = 201] = "Created";
    EHttpStatusCode[EHttpStatusCode["NoContent"] = 204] = "NoContent";
    EHttpStatusCode[EHttpStatusCode["MalformedQuery"] = 400] = "MalformedQuery";
    EHttpStatusCode[EHttpStatusCode["Forbidden"] = 403] = "Forbidden";
    EHttpStatusCode[EHttpStatusCode["NotFound"] = 404] = "NotFound";
    EHttpStatusCode[EHttpStatusCode["MethodNotAllowed"] = 405] = "MethodNotAllowed";
    EHttpStatusCode[EHttpStatusCode["UnsupportedMediaType"] = 415] = "UnsupportedMediaType";
    EHttpStatusCode[EHttpStatusCode["ServerError"] = 500] = "ServerError";
})(EHttpStatusCode = exports.EHttpStatusCode || (exports.EHttpStatusCode = {}));
//# sourceMappingURL=types.js.map