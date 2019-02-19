"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const minimatch_1 = require("minimatch");
const util_1 = require("util");
/**
 * Name of the Diaspora actions doable. Combined with {@link EQueryPlurality}, it defines the method to call on the model.
 */
var EQueryAction;
(function (EQueryAction) {
    EQueryAction["FIND"] = "find";
    EQueryAction["DELETE"] = "delete";
    EQueryAction["UPDATE"] = "update";
    EQueryAction["INSERT"] = "insert";
    EQueryAction["REPLACE"] = "replace";
})(EQueryAction = exports.EQueryAction || (exports.EQueryAction = {}));
/**
 * Types of actions to do. Combined with {@link EQueryAction}, it defines the method to call on the model.
 */
var EQueryPlurality;
(function (EQueryPlurality) {
    EQueryPlurality["SINGULAR"] = "singular";
    EQueryPlurality["PLURAL"] = "plural";
})(EQueryPlurality = exports.EQueryPlurality || (exports.EQueryPlurality = {}));
const applySelector = (oldVal, newVal) => {
    if (lodash_1.isObject(newVal)) {
        if (lodash_1.isObject(oldVal)) {
            return lodash_1.assign({}, oldVal, newVal);
        }
        else {
            return lodash_1.clone(newVal);
        }
    }
    else {
        return newVal;
    }
};
exports.configureList = (pickers, set) => {
    const configurationObject = {};
    lodash_1.forEach(pickers, (picker, key) => {
        // If the key is a regex or a minimatch (check for `*`), this var will be set to a function
        let matcher = false;
        if (key.startsWith('/') && key.endsWith('/')) {
            const regex = new RegExp(key.slice(1).slice(0, -1));
            matcher = (name) => {
                return !lodash_1.isNil(name.match(regex));
            };
        }
        else if (key.includes('*')) {
            const mm = new minimatch_1.Minimatch(key, {});
            matcher = (name) => {
                return mm.match(name);
            };
        }
        if (!matcher) {
            // Matching is required
            if (-1 === set.indexOf(key)) {
                throw new ReferenceError(`Trying to match unexistent key ${key} in ${JSON.stringify(set)}.`);
            }
            configurationObject[key] = applySelector(configurationObject[key], picker);
        }
        else {
            const subMatcher = matcher;
            // Matching is optionnal
            lodash_1.forEach(set, (element) => {
                if (subMatcher(element)) {
                    configurationObject[element] = applySelector(configurationObject[element], picker);
                }
            });
        }
    });
    return lodash_1.pickBy(configurationObject);
};
exports.prettylog = (object, config = {}) => {
    config = lodash_1.defaults(config, {
        colors: true,
        depth: 8,
    });
    console.log(util_1.inspect(object, config));
};
//# sourceMappingURL=utils.js.map