"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const utils_1 = require("./utils");
const apiSyntaxError_1 = require("./errors/apiSyntaxError");
const apiResponseError_1 = require("./errors/apiResponseError");
const diaspora_1 = require("@diaspora/diaspora");
const QUERY_OPTS = ['skip', 'limit', 'sort', 'page'];
/**
 * Base class that generates a middleware, to interact with Diaspora models
 *
 * @author Gerkin
 */
class ApiGenerator {
    constructor(configHash, middleware) {
        // Get only models authorized
        const allModels = _.keys(diaspora_1.Diaspora.models);
        const configuredModels = (() => {
            try {
                return utils_1.configureList(configHash.models, allModels) || {};
            }
            catch (error) {
                if (error instanceof ReferenceError) {
                    throw new ReferenceError(`Tried to configure Diaspora Server with unknown model. Original message: ${error.message}.${allModels.length === 0 ? '\nSee https://goo.gl/Auj3DB for more infos.' : ''}`);
                }
                else {
                    throw error;
                }
            }
        })();
        // Configure router
        this._modelsConfiguration = _.mapValues(configuredModels, (apiDesc, modelName) => {
            const defaultedApiDesc = apiDesc === true ? {} : apiDesc;
            const defaulted = _.defaults(defaultedApiDesc, {
                singular: modelName.toLowerCase(),
                plural: `${modelName.toLowerCase()}s`,
                middlewares: {},
            });
            diaspora_1.Diaspora.logger.verbose(`Exposing ${modelName} (endpoints "/${defaulted.singular}" & "/${defaulted.plural}")`);
            const model = diaspora_1.Diaspora.models[modelName];
            const modelConfiguration = _.assign(defaulted, { model });
            return modelConfiguration;
        });
        this._middleware = middleware;
    }
    /**
     * Public getter to retrieve the middleware instance usable by application
     *
     * @se {@link ApiGenerator.middleware}
     * @author Gerkin
     */
    get middleware() {
        return this._middleware;
    }
    /**
     * Parse a query string to separate options from search clause.
     *
     * @param queryObj - Query string to parse
     * @returns A hash with options & search clause separated
     * @author Gerkin
     */
    static parseQuery(queryObj) {
        const raw = _.mapValues(queryObj, (val, key) => {
            if (['query', 'options'].includes(key)) {
                try {
                    return JSON.parse(val);
                }
                catch (error) {
                    throw apiResponseError_1.ApiResponseError.MalformedQuery(new apiSyntaxError_1.ApiSyntaxError('Invalid syntax parsing query', error));
                }
            }
            else {
                return val;
            }
        });
        return {
            raw,
            options: _.pick(raw, QUERY_OPTS),
            where: _.get(raw, 'where', _.omit(raw, QUERY_OPTS)),
        };
    }
    /**
     * Adds the ID of the entity to the JSON to send to the client. This property is usually not stored in the entity's attributes hash, so we manually add it here.
     *
     * @param entity - Entity to cast to JSON with ID
     * @returns The entity attributes, with the ID defined.
     * @author Gerkin
     */
    static setIdFromIdHash(entity) {
        const retVal = entity.getProperties(entity.model.getDataSource());
        if (retVal) {
            delete retVal.idHash;
        }
        return retVal;
    }
}
exports.ApiGenerator = ApiGenerator;
//# sourceMappingURL=apiGenerator.js.map