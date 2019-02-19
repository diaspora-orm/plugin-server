import express = require('express');
import { Model, Errors, Set, Entity } from '@diaspora/diaspora';
import { IConfigurationRaw, IDiasporaApiRequest, IDiasporaApiRequestDescriptor, IDiasporaApiRequestDescriptorPreParse, THookFunction, IModelConfiguration } from '../index';
import { EQueryAction, EQueryPlurality } from '../utils';
import { ApiGenerator } from '../apiGenerator';
import { ApiResponseError } from '../errors/apiResponseError';
import { EHttpStatusCode } from '../types';
/**
 * Lists all HTTP verbs used by this webserver
 *
 * @author Gerkin
 */
export declare enum HttpVerb {
    GET = "GET",
    DELETE = "DELETE",
    PATCH = "PATCH",
    POST = "POST",
    PUT = "PUT"
}
export declare const HttpVerbQuery: {
    [HttpVerb.GET]: EQueryAction;
    [HttpVerb.DELETE]: EQueryAction;
    [HttpVerb.PATCH]: EQueryAction;
    [HttpVerb.POST]: EQueryAction;
    [HttpVerb.PUT]: EQueryAction;
};
/**
 * Generates a new RESTful API using express.
 * This API responds to all verbs declared in {@link HttpVerb}.
 * > *Note:* the middleware router is already bound with bodyParser urlencoded & json.
 *
 * @author Gerkin
 */
export declare class ExpressApiGenerator extends ApiGenerator<express.Router> {
    constructor(configHash: IConfigurationRaw);
    /**
     * Responds to the request with either an empty array or the set
     *
     * @param res          - The express response to respond to.
     * @param set          - The set to send to the client.
     * @param responseCode - The HTTP status code to send.
     * @author Gerkin
     */
    protected static respondMaybeEmptySet<TModel>(res: express.Response, set: Set<TModel>, responseCode?: EHttpStatusCode): import("express-serve-static-core").Response;
    /**
     * Responds to the request with either undefined or the entity
     *
     * @param res          - The express response to respond to.
     * @param entity       - The entity to send to the client.
     * @param responseCode - The HTTP status code to send.
     * @author Gerkin
     */
    protected static respondMaybeNoEntity<TModel>(res: express.Response, entity: Entity<TModel> | null, responseCode?: EHttpStatusCode): import("express-serve-static-core").Response;
    /**
     * Retrieves data handled by Diaspora and add them to the request.
     *
     * @param request     - Request to parse.
     * @param diasporaApi - Diaspora API description targeted by the request.
     * @returns The express request transformed.
     * @author Gerkin
     */
    protected static castToDiasporaApiRequest<TModel>(request: express.Request, diasporaApi: IDiasporaApiRequestDescriptorPreParse<TModel>): Promise<IDiasporaApiRequestDescriptor<TModel>>;
    protected static wrapApiErrors(error: Errors.ExtendableError): ApiResponseError;
    /**
     * Respond to the request with an error code
     *
     * @param req    - Parsed request to answer to
     * @param res    - express response object related to the request
     * @param error  - Error to return to the client.
     * @param status - Status code to answer with. If not provided, it is guessed depending on the error.
     * @author Gerkin
     */
    protected static respondError<TModel>(req: IDiasporaApiRequest<TModel, IDiasporaApiRequestDescriptorPreParse<TModel>>, res: express.Response, error: Error): import("express-serve-static-core").Response;
    protected static respondNativeError<TModel>(req: IDiasporaApiRequest<TModel, IDiasporaApiRequestDescriptorPreParse<TModel>>, res: express.Response, error: Error): import("express-serve-static-core").Response;
    /**
     * Gets the loggable version of the request.
     *
     * @param diasporaApi - Request descriptor to log.
     * @returns Object containing a description of the Diaspora request.
     * @author Gerkin
     */
    protected static getLoggableDiasporaApi<TModel>(diasporaApi: IDiasporaApiRequestDescriptor<TModel>): Pick<IDiasporaApiRequestDescriptor<TModel>, "number" | "body" | "raw" | "where" | "options" | "urlId" | "action" | "model" | undefined> & {
        model: string;
        targetFound: boolean | undefined;
    };
    /**
     * Parse the query and triggers the Diaspora call. This is the main middleware function of this server
     *
     * @param apiNumber - Indicates the type of the query, saying if we are targetting a single or several entitie(s)
     * @returns The Hook function to add to the router.
     * @author Gerkin
     */
    protected prepareQueryHandling<TModel>(apiNumber: EQueryPlurality): THookFunction<TModel, express.Request>;
    /**
     * Generic `delete` handler that can be called by middlewares.
     *
     * @author Gerkin
     */
    protected static deleteHandler<TModel>(queryNumber: EQueryPlurality, req: IDiasporaApiRequest<TModel>, res: express.Response, model: Model<TModel>): Promise<import("express-serve-static-core").Response>;
    /**
     * Generic `find` handler that can be called by middlewares.
     *
     * @author Gerkin
     */
    protected static findHandler<TModel>(queryNumber: EQueryPlurality, req: IDiasporaApiRequest<TModel>, res: express.Response, model: Model<TModel>): Promise<import("express-serve-static-core").Response>;
    /**
     * Generic `insert` handler that can be called by middlewares.
     *
     * @author Gerkin
     */
    protected static insertHandler<TModel>(queryNumber: EQueryPlurality, req: IDiasporaApiRequest<TModel>, res: express.Response, model: Model<TModel>): Promise<import("express-serve-static-core").Response>;
    /**
     * Generic `update` handler that can be called by middlewares.
     *
     * @author Gerkin
     */
    protected static updateHandler<TModel>(queryNumber: EQueryPlurality, req: IDiasporaApiRequest<TModel>, res: express.Response, model: Model<TModel>): Promise<import("express-serve-static-core").Response>;
    /**
     * Generic `update` handler that can be called by middlewares. it has the particularity of fully replacing entities attributes, keeping only IDs.
     *
     * @author Gerkin
     */
    protected static replaceHandler<TModel>(queryNumber: EQueryPlurality, req: IDiasporaApiRequest<TModel>, res: express.Response, model: Model<TModel>): Promise<import("express-serve-static-core").Response>;
    /**
     * Hash of express middlewares to bind to router.
     *
     * @author Gerkin
     */
    protected static handlers: {
        [key: string]: THookFunction<any, IDiasporaApiRequest<any>>;
    };
    /**
     * Binds the instance router with each route verbs.
     *
     * @param apiNumber - Number of entities that this router will bind.
     * @param route     - Path to the API endpoint
     * @param modelName - Name of the model that is targetted.
     * @author Gerkin
     */
    protected bind(apiNumber: EQueryPlurality, route: string, modelName: string): void;
    /**
     * Respond to the request with a map of the API.
     *
     * @param req - express request to answer to with API map.
     * @param res - express response which we are responding to.
     * @returns Returns the answered response.
     * @author Gerkin
     */
    protected optionsHandler(req: express.Request, res: express.Response): import("express-serve-static-core").Response;
    /**
     * Generates the API map of the specified endpoint. This is usually used with the `options` verb.
     *
     * @param modelApi    - Model api configuration to answer to
     * @param queryNumber - The action number to get map for.
     * @param baseUrl     - Base URL of the endpoint (usually taken from the express request).
     * @returns Object containing the API map.
     */
    protected generateApiMap<TModel>(modelApi: IModelConfiguration<TModel>, queryNumber: EQueryPlurality, baseUrl: string): {
        path: string;
        description: string;
        canonicalUrl: string;
        parameters?: undefined;
    } | {
        path: string;
        description: string;
        parameters: {
            $ID: {
                optional: boolean;
                description: string;
            };
        };
        canonicalUrl: string;
    };
    /**
     * Gets the handler to use with the provided query configuration. This is used at initialization for short binding.
     *
     * @param modelApi   - Description of the API to bind
     * @param apiNumber  - Numbering of the API.
     * @param action - Action done by the handlers to get.
     * @param verb - HTTP verb that matches the handlers to get.
     */
    protected getRelevantHandlers<TModel>(modelApi: IModelConfiguration<TModel>, apiNumber: EQueryPlurality, action: EQueryAction, verb: HttpVerb): Array<THookFunction<TModel, IDiasporaApiRequest<TModel>>>;
}
