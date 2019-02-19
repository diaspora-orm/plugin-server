import _ = require('lodash');
import { IModelConfiguration, IConfigurationRaw } from './index';
import { QueryLanguage, Entity } from '@diaspora/diaspora';
/**
 * Base class that generates a middleware, to interact with Diaspora models
 *
 * @author Gerkin
 */
export declare abstract class ApiGenerator<T> {
    /**
     * Instance of the middleware to be used by the application
     *
     * @se {@link ApiGenerator.middleware}
     * @author Gerkin
     */
    protected readonly _middleware: T;
    /**
     * Public getter to retrieve the middleware instance usable by application
     *
     * @se {@link ApiGenerator.middleware}
     * @author Gerkin
     */
    readonly middleware: T;
    /**
     * Dictionary containing each configured models settings.
     *
     * @author Gerkin
     */
    protected readonly _modelsConfiguration: _.Dictionary<IModelConfiguration<any>>;
    protected constructor(configHash: IConfigurationRaw, middleware: T);
    /**
     * Parse a query string to separate options from search clause.
     *
     * @param queryObj - Query string to parse
     * @returns A hash with options & search clause separated
     * @author Gerkin
     */
    static parseQuery(queryObj: object): {
        raw: object;
        options: QueryLanguage.IQueryOptions;
        where: QueryLanguage.SelectQueryOrCondition;
    };
    /**
     * Adds the ID of the entity to the JSON to send to the client. This property is usually not stored in the entity's attributes hash, so we manually add it here.
     *
     * @param entity - Entity to cast to JSON with ID
     * @returns The entity attributes, with the ID defined.
     * @author Gerkin
     */
    protected static setIdFromIdHash<TModel>(entity: Entity<TModel>): (TModel & import("@diaspora/diaspora/dist/types/types/entity").IEntityProperties) | null;
}
