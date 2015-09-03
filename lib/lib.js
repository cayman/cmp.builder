'use strict';
var path = require('path');

exports.init = function (grunt) {

    var lib = {};

    lib.isString = function(value){
        return typeof value == 'string' || value instanceof String;
    };

    lib.isArray = function(value){
        return value instanceof Array || Array.isArray(value);
    };

    lib.isObject = function(value){
        return typeof value === "object" && !lib.isArray(value);
    };

    lib.log = function(field, value, prefix){
        var assign = prefix ? ' ' + prefix + ' ' : ' = ';
        if (!value) {
            return prefix ? field + assign : field;
        } else if (lib.isString(value)) {
            return field + assign + value.cyan;
        } else if (lib.isArray(value)) {
                return field + assign + '[ ' + value.join(', ').cyan + ' ]';
        } else {
            return field + assign + '{ ' + (typeof value) + ':' + value.toString().cyan + ' }';
        }
    };

    lib.iterate = function(object, callback) {
        if(lib.isArray(object)){
            object.forEach(function(subObject){
                lib.iterate(subObject,callback);
            });
        }
        else{
            for (var property in object) {
                if (object.hasOwnProperty(property)) {
                    callback(property, object[property]);
                }
            }
        }

    };

    lib.iterateDeep = function (object, fields, callback) {
        if (lib.isArray(fields)) {
            fields.forEach(function (field) {
                var values = object[field];
                if (lib.isArray(values)) {
                    values.forEach(function (value) {
                        callback(field,value);
                    });
                }else if(lib.isString(values)) {
                    callback(field,values);
                }
            });
        }else if(lib.isString(fields)) {
            var values = object[fields];
            if (lib.isArray(values)) {
                values.forEach(function (value) {
                    callback(fields,value);
                });
            }else if(lib.isString(values)) {
                callback(fields,values);
            }
        }
    };

    lib.equalName = function (file, name) {
        return  file.substr(0, name.length) === name;
    };

    lib.equalExt = function (file, ext) {
        return  file.substr(-ext.length) === ext;
    };

    lib.fieldsCount = function (object){
        var count = 0;
        for (var property in object) {
            count++;
        }
        return ''+count;
    };

    lib.addTasks = function(tasks,options,param){

        //option options.tasks is depricated
        if(options && options.tasks ){
            //add tasks
            grunt.verbose.writeln('>>'.cyan + ' tasks', options.tasks);
            if(lib.isArray(options.tasks)){
                options.tasks.forEach(function (task) {
                    tasks.push(task + ':' + param);
                });
            }else if(lib.isString(options.tasks)){
                tasks.push(options.tasks + ':' + param);
            }
        }
    };

    lib.getDependenciesDir = function(cmpDir, bowerDirName){
        var indexInBower = cmpDir.indexOf(bowerDirName);
        var dependenciesBaseDir = (indexInBower !== -1) ? cmpDir.substring(0, indexInBower) : cmpDir + '/';
        return dependenciesBaseDir + bowerDirName;
    };

    //normalize file
    lib.pathJoin = function(basePath, pathValue, file) {
        return path.join(basePath, pathValue, path.normalize(file)).replace(/\\/g, '/');
    };

    //normalize script
    lib.parseScript = function(file, minifyJs) {

        var minJsExt = '.min.js';
        var jsExt = '.js';

        if (minifyJs) {

            if (!lib.equalExt(file, minJsExt) && lib.equalExt(file, jsExt)) {
                file = file.replace(new RegExp('\.js$', 'i'), minJsExt);
            } else if (!lib.equalExt(file, minJsExt)) {
                grunt.fail.fatal('\n error parse Script file = ' + file.red + ', must end with ' + jsExt);
            }

        } else {
            if (lib.equalExt(file, minJsExt)) {
                file = file.replace(new RegExp('\.min\.js$', 'i'), jsExt);
            } else if (!lib.equalExt(file, jsExt)) {
                grunt.fail.fatal('\n error parse Script file = ' + file.red + ', must end with ' + jsExt);
            }
        }

        return file;

    };

    lib.isBowerDependency = function(depDetail){
        return /^[~^>=<]|[0-9]|git|http|svn|file/.test(depDetail)
    };

    lib._bowerFiles = {};

    lib.readBowerFile = function(dir) {
        var file = dir + '/bower.json';
        grunt.log.writeln('   read file', file);
        var bower = lib._bowerFiles[file];
        if (!bower) {
            var fileDot = dir + '/.bower.json';
            if (grunt.file.exists(fileDot)) {
                lib._bowerFiles[file] = bower = grunt.file.readJSON(fileDot);
            }else{
                if(grunt.file.exists(file)){
                    grunt.fail.fatal('\n file ' + file + ' not found. Please start command "grunt cmpBower" ');
                }else{
                    lib._bowerFiles[file] = bower = grunt.file.readJSON(file);
                }
            }
        }
        return bower;
    };

    lib._configFiles = {};

    lib.readConfigFile= function(file,loaded,error) {
        if(!file){
            error('Empty value!');
            return file;
        }
        if(lib.isObject(file)){
            return file;
        }
        if(!lib.isString(file)){
            error('Must be file url or javascript object!');
            return file;
        }
        var config = lib._configFiles[file];
        if (!config) {
            if (!grunt.file.exists(file)) {
                error('File ' + file + ' not found!');
            }
            if (file.slice(-5) === '.yaml' || file.slice(-4) === '.yml') {
                lib._configFiles[file] = config = grunt.file.readYAML(file);
                loaded('Load from file ' + file.cyan);
            } else if (file.slice(-5) === '.json') {
                lib._configFiles[file] = config = grunt.file.readJSON(file);
                loaded('Load from file ' + file.cyan);
             } else {
                error('File must be json or yaml!');
            }
        }
        return config;
    };

    return lib;
};