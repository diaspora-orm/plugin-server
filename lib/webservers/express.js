"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const chalk_1 = require("chalk");
const express = require("express");
const _ = require("lodash");
const diaspora_1 = require("@diaspora/diaspora");
const utils_1 = require("../utils");
const apiGenerator_1 = require("../apiGenerator");
const apiError_1 = require("../errors/apiError");
const apiResponseError_1 = require("../errors/apiResponseError");
const types_1 = require("../types");
const minimatch = require("minimatch");
const lodash_1 = require("lodash");
/**
 * Lists all HTTP verbs used by this webserver
 *
 * @author Gerkin
 */
var HttpVerb;
(function (HttpVerb) {
    HttpVerb["GET"] = "GET";
    HttpVerb["DELETE"] = "DELETE";
    HttpVerb["PATCH"] = "PATCH";
    HttpVerb["POST"] = "POST";
    HttpVerb["PUT"] = "PUT";
})(HttpVerb = exports.HttpVerb || (exports.HttpVerb = {}));
exports.HttpVerbQuery = {
    [HttpVerb.GET]: utils_1.EQueryAction.FIND,
    [HttpVerb.DELETE]: utils_1.EQueryAction.DELETE,
    [HttpVerb.PATCH]: utils_1.EQueryAction.UPDATE,
    [HttpVerb.POST]: utils_1.EQueryAction.INSERT,
    [HttpVerb.PUT]: utils_1.EQueryAction.REPLACE,
};
/**
 * Generates a new RESTful API using express.
 * This API responds to all verbs declared in {@link HttpVerb}.
 * > *Note:* the middleware router is already bound with bodyParser urlencoded & json.
 *
 * @author Gerkin
 */
class ExpressApiGenerator extends apiGenerator_1.ApiGenerator {
    constructor(configHash) {
        // Init with the subrouter
        super(configHash, express.Router());
        this._middleware
            .use((req, res, next) => {
            const accept = req.headers['accept'];
            if (!accept || !minimatch('application/json', accept.toLowerCase())) {
                const error = new Error(`Unsupported Accept MIME "${accept}". This API only supports "application/json".`);
                return ExpressApiGenerator.respondNativeError(req, res, apiResponseError_1.ApiResponseError.UnsupportedMediaType(error));
            }
            return next();
        })
            // parse application/json
            .use(bodyParser.json());
        // Configure router
        _.forEach(this._modelsConfiguration, (apiDesc, modelName) => {
            this.bind(utils_1.EQueryPlurality.SINGULAR, `/${apiDesc.singular}(/*)?`, modelName);
            this.bind(utils_1.EQueryPlurality.PLURAL, `/${apiDesc.plural}`, modelName);
        });
        this._middleware.options('', this.optionsHandler.bind(this));
    }
    /**
     * Responds to the request with either an empty array or the set
     *
     * @param res          - The express response to respond to.
     * @param set          - The set to send to the client.
     * @param responseCode - The HTTP status code to send.
     * @author Gerkin
     */
    static respondMaybeEmptySet(res, set, responseCode = types_1.EHttpStatusCode.Ok) {
        res.status(0 === set.length ? types_1.EHttpStatusCode.NoContent : responseCode);
        return res.json(set.entities.map(ExpressApiGenerator.setIdFromIdHash));
    }
    /**
     * Responds to the request with either undefined or the entity
     *
     * @param res          - The express response to respond to.
     * @param entity       - The entity to send to the client.
     * @param responseCode - The HTTP status code to send.
     * @author Gerkin
     */
    static respondMaybeNoEntity(res, entity, responseCode = types_1.EHttpStatusCode.Ok) {
        if (_.isNil(entity)) {
            return res.status(types_1.EHttpStatusCode.NoContent).send();
        }
        else {
            return res.status(responseCode).json(ExpressApiGenerator.setIdFromIdHash(entity));
        }
    }
    /**
     * Retrieves data handled by Diaspora and add them to the request.
     *
     * @param request     - Request to parse.
     * @param diasporaApi - Diaspora API description targeted by the request.
     * @returns The express request transformed.
     * @author Gerkin
     */
    static castToDiasporaApiRequest(request, diasporaApi) {
        return __awaiter(this, void 0, void 0, function* () {
            const diasporaApiWithParsedQuery = _.assign(diasporaApi, ExpressApiGenerator.parseQuery(request.query));
            // Check the type of the input
            if (utils_1.EQueryAction.INSERT === diasporaApiWithParsedQuery.action) {
                if (utils_1.EQueryPlurality.SINGULAR === diasporaApiWithParsedQuery.number && !_.isObject(diasporaApiWithParsedQuery.body)) {
                    throw apiResponseError_1.ApiResponseError.MalformedQuery(new apiError_1.ApiError('Expected a single object'));
                }
                else if (utils_1.EQueryPlurality.PLURAL === diasporaApiWithParsedQuery.number &&
                    (!_.isArray(diasporaApiWithParsedQuery.body) || !_.every(diasporaApiWithParsedQuery.body, _.isObject))) {
                    throw apiResponseError_1.ApiResponseError.MalformedQuery(new apiError_1.ApiError('Expected an array of objects'));
                }
            }
            // Populate data with targetted entity
            if (utils_1.EQueryPlurality.SINGULAR === diasporaApiWithParsedQuery.number) {
                const id = _.get(request, 'params[1]');
                if (!_.isNil(id)) {
                    if (utils_1.EQueryAction.INSERT === diasporaApiWithParsedQuery.action) {
                        throw apiResponseError_1.ApiResponseError.MethodNotAllowed(new apiError_1.ApiError('POST (insert) to explicit ID is forbidden'));
                    }
                    else {
                        const target = yield diasporaApi.model.find(id);
                        if (_.isNil(target)) {
                            throw apiResponseError_1.ApiResponseError.NotFound();
                        }
                        return _.assign(diasporaApiWithParsedQuery, {
                            urlId: id,
                            where: { id },
                            target,
                        });
                    }
                }
            }
            return diasporaApiWithParsedQuery;
        });
    }
    static wrapApiErrors(error) {
        if (error instanceof diaspora_1.Errors.ValidationError) {
            return apiResponseError_1.ApiResponseError.Forbidden(error);
        }
        else if (error instanceof apiResponseError_1.ApiResponseError) {
            return error;
        }
        else {
            return apiResponseError_1.ApiResponseError.ServerError(error);
        }
    }
    /**
     * Respond to the request with an error code
     *
     * @param req    - Parsed request to answer to
     * @param res    - express response object related to the request
     * @param error  - Error to return to the client.
     * @param status - Status code to answer with. If not provided, it is guessed depending on the error.
     * @author Gerkin
     */
    static respondError(req, res, error) {
        if (error instanceof diaspora_1.Errors.ExtendableError) {
            const wrappedError = (error instanceof apiError_1.ApiError ? error : this.wrapApiErrors(error));
            const message = wrappedError.makeMessage(req);
            switch (wrappedError.logLevel) {
                case diaspora_1.ELoggingLevel.Error:
                    diaspora_1.Diaspora.logger.error(message);
                    break;
                case diaspora_1.ELoggingLevel.Debug:
                    diaspora_1.Diaspora.logger.debug(message);
                    break;
            }
            return res.status(wrappedError.statusCode).send(wrappedError.toJson(req));
        }
        else {
            return this.respondNativeError(req, res, error);
        }
    }
    static respondNativeError(req, res, error) {
        // TODO: Check for environment: if prod, respond a simple non-descriptive error
        diaspora_1.Diaspora.logger.error(`Request ${_.get(res, 'req.diasporaApi.id', 'UNKNOWN')} triggered a native error: message is ${JSON.stringify(error.message)}
			Stack trace:
			`, error.stack, error);
        return res.status(500).send(error.message);
    }
    /**
     * Gets the loggable version of the request.
     *
     * @param diasporaApi - Request descriptor to log.
     * @returns Object containing a description of the Diaspora request.
     * @author Gerkin
     */
    static getLoggableDiasporaApi(diasporaApi) {
        return _.assign({}, _.omit(diasporaApi, ['id', 'target']), {
            model: diasporaApi.model.name,
            targetFound: diasporaApi.urlId ? !_.isNil(diasporaApi.target) : undefined,
        });
    }
    /**
     * Parse the query and triggers the Diaspora call. This is the main middleware function of this server
     *
     * @param apiNumber - Indicates the type of the query, saying if we are targetting a single or several entitie(s)
     * @returns The Hook function to add to the router.
     * @author Gerkin
     */
    prepareQueryHandling(apiNumber) {
        return (req, res, next, model) => __awaiter(this, void 0, void 0, function* () {
            const queryId = diaspora_1.Utils.generateUUID();
            diaspora_1.Diaspora.logger.verbose(`Received ${chalk_1.default.bold.red(req.method)} request ${chalk_1.default.bold.yellow(queryId)} on model ${chalk_1.default.bold.blue(model.name)}: `, {
                absPath: _.get(req, '_parsedOriginalUrl.path', _.get(req, '_parsedUrl.path')),
                path: req.path,
                apiNumber,
                body: req.body,
                query: req.query,
            });
            const preParseParams = {
                id: queryId,
                number: apiNumber,
                action: exports.HttpVerbQuery[req.method],
                model,
                body: req.body,
            };
            try {
                const diasporaApi = yield ExpressApiGenerator.castToDiasporaApiRequest(req, preParseParams);
                req = _.assign(req, { diasporaApi });
                diaspora_1.Diaspora.logger.debug(`DiasporaAPI params for request ${chalk_1.default.bold.yellow(queryId)}: `, ExpressApiGenerator.getLoggableDiasporaApi(diasporaApi));
                return next();
            }
            catch (error) {
                const catchReq = _.assign(req, { diasporaApi: preParseParams });
                return ExpressApiGenerator.respondError(catchReq, res, error);
            }
        });
    }
    /**
     * Generic `delete` handler that can be called by middlewares.
     *
     * @author Gerkin
     */
    static deleteHandler(queryNumber, req, res, model) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(req.diasporaApi.where)) {
                return res.status(types_1.EHttpStatusCode.MalformedQuery).send({
                    message: `${req.method} requires a "where" clause`,
                });
            }
            else {
                const { where, options } = req.diasporaApi;
                try {
                    if (queryNumber === utils_1.EQueryPlurality.SINGULAR) {
                        yield model.delete(where, options);
                    }
                    else {
                        yield model.deleteMany(where, options);
                    }
                    return res.status(types_1.EHttpStatusCode.NoContent).json();
                }
                catch (error) {
                    return ExpressApiGenerator.respondError(req, res, error);
                }
            }
        });
    }
    /**
     * Generic `find` handler that can be called by middlewares.
     *
     * @author Gerkin
     */
    static findHandler(queryNumber, req, res, model) {
        return __awaiter(this, void 0, void 0, function* () {
            const { where, options } = req.diasporaApi;
            try {
                if (queryNumber === utils_1.EQueryPlurality.SINGULAR) {
                    return ExpressApiGenerator.respondMaybeNoEntity(res, yield model.find(where, options));
                }
                else {
                    return ExpressApiGenerator.respondMaybeEmptySet(res, yield model.findMany(where, options));
                }
            }
            catch (error) {
                console.error(error);
                return ExpressApiGenerator.respondError(req, res, error);
            }
        });
    }
    /**
     * Generic `insert` handler that can be called by middlewares.
     *
     * @author Gerkin
     */
    static insertHandler(queryNumber, req, res, model) {
        return __awaiter(this, void 0, void 0, function* () {
            const { body } = req.diasporaApi;
            try {
                if (queryNumber === utils_1.EQueryPlurality.SINGULAR) {
                    return ExpressApiGenerator.respondMaybeNoEntity(res, yield (model.spawn(body).persist()), types_1.EHttpStatusCode.Created);
                }
                else {
                    return ExpressApiGenerator.respondMaybeEmptySet(res, yield (model.spawnMany(body).persist()), types_1.EHttpStatusCode.Created);
                }
            }
            catch (error) {
                return ExpressApiGenerator.respondError(req, res, error);
            }
        });
    }
    /**
     * Generic `update` handler that can be called by middlewares.
     *
     * @author Gerkin
     */
    static updateHandler(queryNumber, req, res, model) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(req.diasporaApi.where)) {
                return res.status(types_1.EHttpStatusCode.MalformedQuery).send({
                    message: `${req.method} requires a "where" clause`,
                });
            }
            else {
                const { where, body, options } = req.diasporaApi;
                try {
                    if (queryNumber === utils_1.EQueryPlurality.SINGULAR) {
                        return ExpressApiGenerator.respondMaybeNoEntity(res, yield model.update(where, body, options));
                    }
                    else {
                        return ExpressApiGenerator.respondMaybeEmptySet(res, yield model.updateMany(where, body, options));
                    }
                }
                catch (error) {
                    return ExpressApiGenerator.respondError(req, res, error);
                }
            }
        });
    }
    /**
     * Generic `update` handler that can be called by middlewares. it has the particularity of fully replacing entities attributes, keeping only IDs.
     *
     * @author Gerkin
     */
    static replaceHandler(queryNumber, req, res, model) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(req.diasporaApi.where)) {
                return res.status(types_1.EHttpStatusCode.MalformedQuery).send({
                    message: `${req.method} requires a "where" clause`,
                });
            }
            else {
                const { where, options } = req.diasporaApi;
                const replaceEntity = (entity) => {
                    entity.attributes = _.clone(req.diasporaApi.body);
                    return entity;
                };
                try {
                    if (queryNumber === utils_1.EQueryPlurality.SINGULAR) {
                        const foundEntity = yield model.find(where, options);
                        if (foundEntity) {
                            const updatedEntity = replaceEntity(foundEntity);
                            const persistedEntity = yield updatedEntity.persist();
                            return ExpressApiGenerator.respondMaybeNoEntity(res, persistedEntity);
                        }
                        else {
                            return ExpressApiGenerator.respondMaybeNoEntity(res, null);
                        }
                    }
                    else {
                        const foundSet = yield model.findMany(where, options);
                        const updatedSet = new diaspora_1.Set(model, foundSet.entities.map(replaceEntity));
                        const persistedSet = yield updatedSet.persist();
                        return ExpressApiGenerator.respondMaybeEmptySet(res, persistedSet);
                    }
                }
                catch (error) {
                    return ExpressApiGenerator.respondError(req, res, error);
                }
            }
        });
    }
    /**
     * Binds the instance router with each route verbs.
     *
     * @param apiNumber - Number of entities that this router will bind.
     * @param route     - Path to the API endpoint
     * @param modelName - Name of the model that is targetted.
     * @author Gerkin
     */
    bind(apiNumber, route, modelName) {
        const modelApi = this._modelsConfiguration[modelName];
        const partialize = (methods) => _.chain(methods)
            .map((func) => _.ary(func, 4))
            .map((func) => _.partialRight(func, modelApi.model))
            .value();
        this._middleware
            .route(route)
            .options((req, res) => this.optionsHandler(req, res, modelApi, apiNumber))
            .all(partialize([
            this.prepareQueryHandling(apiNumber),
        ]))
            .delete(partialize(this.getRelevantHandlers(modelApi, apiNumber, utils_1.EQueryAction.DELETE, HttpVerb.DELETE)))
            .get(partialize(this.getRelevantHandlers(modelApi, apiNumber, utils_1.EQueryAction.FIND, HttpVerb.GET)))
            .patch(partialize(this.getRelevantHandlers(modelApi, apiNumber, utils_1.EQueryAction.UPDATE, HttpVerb.PATCH)))
            .post(partialize(this.getRelevantHandlers(modelApi, apiNumber, utils_1.EQueryAction.INSERT, HttpVerb.POST)))
            .put(partialize(this.getRelevantHandlers(modelApi, apiNumber, utils_1.EQueryAction.REPLACE, HttpVerb.PUT)));
    }
    getOptions(baseUrl, apiDesc, plurality) {
        if (!apiDesc) {
            return { routes: _.mapValues(this._modelsConfiguration, apiDesc => this.getOptions(baseUrl, apiDesc).routes) };
        }
        if (plurality) {
            if (plurality === utils_1.EQueryPlurality.SINGULAR) {
                return this.generateApiMap(apiDesc, utils_1.EQueryPlurality.SINGULAR, baseUrl);
            }
            else if (plurality === utils_1.EQueryPlurality.PLURAL) {
                return this.generateApiMap(apiDesc, utils_1.EQueryPlurality.PLURAL, baseUrl);
            }
            else {
                throw new Error();
            }
        }
        else {
            return { routes: {
                    [`/${apiDesc.singular}/$ID`]: this.getOptions(baseUrl, apiDesc, utils_1.EQueryPlurality.SINGULAR),
                    [`/${apiDesc.plural}`]: this.getOptions(baseUrl, apiDesc, utils_1.EQueryPlurality.PLURAL),
                } };
        }
    }
    /**
     * Respond to the request with a map of the API.
     *
     * @param req - express request to answer to with API map.
     * @param res - express response which we are responding to.
     * @returns Returns the answered response.
     * @author Gerkin
     */
    optionsHandler(req, res, apiDesc, plurality) {
        return res.json(lodash_1.assign({
            apiType: require('../../package.json').name,
            version: require('../../package.json').version,
            currentUrl: req.baseUrl,
        }, this.getOptions(req.baseUrl, apiDesc, plurality)));
    }
    /**
     * Generates the API map of the specified endpoint. This is usually used with the `options` verb.
     *
     * @param modelApi    - Model api configuration to answer to
     * @param queryNumber - The action number to get map for.
     * @param baseUrl     - Base URL of the endpoint (usually taken from the express request).
     * @returns Object containing the API map.
     */
    generateApiMap(modelApi, queryNumber, baseUrl) {
        const singularRouteName = `/${modelApi.plural}`;
        const pluralRouteName = `/${modelApi.singular}/$ID`;
        return queryNumber === utils_1.EQueryPlurality.PLURAL ? {
            path: singularRouteName,
            description: `Base API to query on SEVERAL items of ${modelApi.model.name}`,
            canonicalUrl: `${baseUrl}${singularRouteName}`,
        } : {
            path: pluralRouteName,
            description: `Base API to query on a SINGLE item of ${modelApi.model.name}`,
            parameters: {
                $ID: {
                    optional: true,
                    description: 'Id of the item to match',
                },
            },
            canonicalUrl: `${baseUrl}${pluralRouteName}`,
        };
    }
    /**
     * Gets the handler to use with the provided query configuration. This is used at initialization for short binding.
     *
     * @param modelApi   - Description of the API to bind
     * @param apiNumber  - Numbering of the API.
     * @param action - Action done by the handlers to get.
     * @param verb - HTTP verb that matches the handlers to get.
     */
    getRelevantHandlers(modelApi, apiNumber, action, verb) {
        const actionLowered = action.toLowerCase();
        const verbLowered = verb.toLowerCase();
        const middlewares = modelApi.middlewares;
        // Get all handlers that apply to this verb
        const relevantSpecificMiddlewares = _.uniq(_.reject([
            middlewares[verbLowered],
            middlewares[actionLowered],
            middlewares[actionLowered + (utils_1.EQueryPlurality.SINGULAR === apiNumber ? 'One' : 'Many')],
        ], _.isNil));
        if ((middlewares.all === false && relevantSpecificMiddlewares.length > 0) ||
            _.some(relevantSpecificMiddlewares, item => item === false)) {
            return [ExpressApiGenerator.handlers.forbidden];
        }
        const allFunctions = _.chain(relevantSpecificMiddlewares)
            .flattenDeep()
            .reject(handler => handler === true)
            .value();
        const actionHandler = ExpressApiGenerator.handlers[(utils_1.EQueryPlurality.SINGULAR === apiNumber ? '_' : '') + verbLowered];
        allFunctions.push(actionHandler);
        return allFunctions;
    }
}
/**
 * Hash of express middlewares to bind to router.
 *
 * @author Gerkin
 */
ExpressApiGenerator.handlers = {
    // Singular
    _delete(req, res, next, model) {
        return ExpressApiGenerator.deleteHandler(utils_1.EQueryPlurality.SINGULAR, req, res, model);
    },
    _get(req, res, next, model) {
        return ExpressApiGenerator.findHandler(utils_1.EQueryPlurality.SINGULAR, req, res, model);
    },
    _patch(req, res, next, model) {
        return ExpressApiGenerator.updateHandler(utils_1.EQueryPlurality.SINGULAR, req, res, model);
    },
    _post(req, res, next, model) {
        return ExpressApiGenerator.insertHandler(utils_1.EQueryPlurality.SINGULAR, req, res, model);
    },
    _put(req, res, next, model) {
        return ExpressApiGenerator.replaceHandler(utils_1.EQueryPlurality.SINGULAR, req, res, model);
    },
    // Plurals
    delete(req, res, next, model) {
        return ExpressApiGenerator.deleteHandler(utils_1.EQueryPlurality.PLURAL, req, res, model);
    },
    get(req, res, next, model) {
        return ExpressApiGenerator.findHandler(utils_1.EQueryPlurality.PLURAL, req, res, model);
    },
    patch(req, res, next, model) {
        return ExpressApiGenerator.updateHandler(utils_1.EQueryPlurality.PLURAL, req, res, model);
    },
    post(req, res, next, model) {
        return ExpressApiGenerator.insertHandler(utils_1.EQueryPlurality.PLURAL, req, res, model);
    },
    put(req, res, next, model) {
        return ExpressApiGenerator.replaceHandler(utils_1.EQueryPlurality.PLURAL, req, res, model);
    },
    forbidden(req, res, next, model) {
        return res.status(403).send('Forbidden');
    },
};
exports.ExpressApiGenerator = ExpressApiGenerator;
//# sourceMappingURL=express.js.map