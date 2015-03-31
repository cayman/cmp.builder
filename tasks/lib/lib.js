'use strict';

exports.init = function (grunt) {


    var lib = {};

    lib.log = function(field, value, prefix){
        var assign = prefix ? ' ' + prefix + ' ' : ' = ';
        if (!value) {
            return prefix ? field + assign : field;
        } else if (typeof value === 'string') {
            return field + assign + value.cyan;
        } else if (value instanceof Array) {
//            if(value.length < 15 || value.length > 40 ){
                return field + assign + '[ ' + value.join(', ').cyan + ' ]';
//            }else{
//                return field + assign + '[\n\t\t' + value.join(',\n\t\t') + ' ]';
//            }

        } else {
            return field + assign + '{ ' + (typeof value) + ':' + value.toString().cyan + ' }';
        }
    };

    lib.iterate = function(object, callback) {
        if(object instanceof Array ){
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
        if (fields instanceof Array) {
            fields.forEach(function (field) {
                var values = object[field];
                if (values instanceof Array) {
                    values.forEach(function (value) {
                        callback(field,value);
                    });
                }else if(typeof values == 'string' || values instanceof String) {
                    callback(field,values);
                }
            });
        }else if(typeof fields == 'string' || fields instanceof String) {
            var values = object[fields];
            if (values instanceof Array) {
                values.forEach(function (value) {
                    callback(fields,value);
                });
            }else if(typeof values == 'string' || values instanceof String) {
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
            if(options.tasks instanceof Array ){
                options.tasks.forEach(function (task) {
                    tasks.push(task + ':' + param);
                });
            }else if(typeof options.tasks == 'string' || options.tasks instanceof String){
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
    lib.parseSource = function(file) {
        return (file.indexOf('./') === 0 ? file.substr(2) : file );
    };

    //normalize script
    lib.parseScript = function(file, minifyJs) {

        var minJsExt = '.min.js';
        var jsExt = '.js';

        if (minifyJs) {

            if (!lib.equalExt(file, minJsExt) && lib.equalExt(file, jsExt)) {
                file = file.replace(new RegExp('\.js$', 'i'), minJsExt);
            } else if (!lib.equalExt(file, minJsExt)) {
                grunt.fail.fatal('\n error cmp().main item = ' + file.red + ', must end with ' + jsExt);
            }

        } else {
            if (lib.equalExt(file, minJsExt)) {
                file = file.replace(new RegExp('\.min\.js$', 'i'), jsExt);
            } else if (!lib.equalExt(file, jsExt)) {
                grunt.fail.fatal('\n error cmp().main item = ' + file.red + ', must end with ' + jsExt);
            }
        }

        return file;

    };

    return lib;
};