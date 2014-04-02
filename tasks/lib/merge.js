'use strict';

exports.init = function (grunt) {

    var merge = {};

    function isObject(val) {
        return (typeof val === 'object') && !Array.isArray(val);
    }

    function extend() {
        var target = arguments[0] || {};
        var length = arguments.length;
        var options, name, src, copy, clone;

        for (var i = 1; i < length; i++) {
            // Only deal with non-null/undefined values
            options = arguments[i];
            if (options != null) {

                if (typeof options === 'string') {
                    options = options.split('');
                }
                // Extend the base object
                for (name in options) {
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if (target === copy) {
                        continue;
                    }


                    if (copy && isObject(copy)) {
                        // Recurse if we're merging plain objects (not array)
                        clone = src && isObject(src) ? src : {};
                        // Never move original objects, clone them
                        target[name] = extend(clone, copy);
                        // Don't bring in undefined values

                    } else if (typeof copy !== 'undefined') {
                        // Copy for simple type and array
                        target[name] = copy;
                    }


                }
            }
        }

        // Return the modified object
        return target;
    }


    merge.modConfigs = function (baseConfig, appConfig, modConfig, modName, modVersion) {

        //merge with base configuration
        if (baseConfig.hasOwnProperty('mod') && baseConfig.mod.hasOwnProperty(modName)) {
            extend(modConfig, baseConfig.mod[modName]);
            if (modConfig[modVersion]) {
                extend(modConfig, modConfig[modVersion]);
                delete modConfig[modVersion];
            }
        }

        //merge with application configuration
        if (appConfig.hasOwnProperty('mod')) {
            if (appConfig.mod.hasOwnProperty(modName)) {
                extend(modConfig, appConfig.mod[modName]);
            }
        }else{
            appConfig.mod = {};
        }

        appConfig.mod[modName] = modConfig;

    };

    merge.templateConfigs = function (baseConfig, appConfig, templateConfig) {
        //merge with base configuration
        if (baseConfig.hasOwnProperty('template')) {
            extend(templateConfig, baseConfig.template);
        }
        //template with base configuration
        if (appConfig.hasOwnProperty('template')) {
            extend(templateConfig, appConfig.template);
        }

        appConfig.template = templateConfig;

    };


    merge.appConfigs = function (baseConfig, appConfig, appName) {
        //application configuration
        if (baseConfig.hasOwnProperty('app') && baseConfig.app.hasOwnProperty(appName)) {
            extend(appConfig.app, baseConfig.app[appName], appConfig.app);
        }

    };

    return merge;

};
