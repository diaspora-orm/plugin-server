/// <reference types="node" />
import { InspectOptions } from 'util';
/**
 * Name of the Diaspora actions doable. Combined with {@link EQueryPlurality}, it defines the method to call on the model.
 */
export declare enum EQueryAction {
    FIND = "find",
    DELETE = "delete",
    UPDATE = "update",
    INSERT = "insert",
    REPLACE = "replace"
}
/**
 * Types of actions to do. Combined with {@link EQueryAction}, it defines the method to call on the model.
 */
export declare enum EQueryPlurality {
    SINGULAR = "singular",
    PLURAL = "plural"
}
export declare const configureList: <T extends object>(pickers: {
    [key: string]: boolean | T;
}, set: string[]) => Partial<{
    [key: string]: boolean | T | undefined;
}>;
export declare const prettylog: (object: any, config?: InspectOptions) => void;
export interface JsonError {
    message: string;
    name: string;
    validationErrors?: Array<string | undefined>;
}
