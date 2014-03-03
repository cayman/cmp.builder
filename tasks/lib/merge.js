'use strict';

exports.init = function (grunt) {

    var extend = require('node.extend');
    var merge = {};


    merge.modConfigs = function (baseConfig, appConfig, modConfig, modName, modVersion) {
        //merge with base configuration
        if (baseConfig.hasOwnProperty('mod')) {
            if (baseConfig.mod.hasOwnProperty(modName)) {
                extend(true, modConfig, baseConfig.mod[modName]);
                if (modConfig[modVersion]) {
                    extend(true, modConfig, modConfig[modVersion]);
                    delete modConfig[modVersion];
                }
            }
        }
        //merge with application configuration
        if (appConfig.hasOwnProperty('mod')) {
            if (appConfig.mod.hasOwnProperty(modName)) {
                extend(true, modConfig, appConfig.mod[modName]);
            }
        } else {
            appConfig.mod = {};
        }
        appConfig.mod[modName] = modConfig;
    };

    merge.templateConfigs = function (baseConfig, appConfig, templateConfig) {
        //merge with base configuration
        if (baseConfig.hasOwnProperty('template')) {
            extend(true, templateConfig, baseConfig.template);
        }
        //template with base configuration
        if (appConfig.hasOwnProperty('template')) {
            extend(true, templateConfig, appConfig.template);
        }
        appConfig.template = templateConfig;

    };


    merge.appConfigs = function(baseConfig, appConfig, appName) {
        //application configuration
        if (baseConfig.hasOwnProperty('app')) {
            if (baseConfig.app.hasOwnProperty(appName)) {
                extend(true, appConfig.app, baseConfig.app[appName], appConfig.app);
            }
        }
    };

    return merge;

};
