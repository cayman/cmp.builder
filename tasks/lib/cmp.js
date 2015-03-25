'use strict';

exports.init = function (grunt) {

    var lib = require('./lib').init(grunt);


    var cmpUtil = {};

    //return type, name from bower.json
    // for external components type = 'lib'
    cmpUtil.parseName = function (bower) {

        var arr = bower.name.split('.');
        var type = bower.type || 'lib';

        return {
            type: type,
            name: ( arr.length > 1 && arr[0] === type ) ? arr.slice(1).join('.') :  arr.join('.')
        };
    };


    cmpUtil.getSimpleId = function (bower) {

        var parsed = cmpUtil.parseName(bower);

        if (!bower.hashDir) {
            return parsed.type + '_' + parsed.name + '_' + bower.version.replace(/\./g, '$');
        }else{
            return false;
        }

    };

    var CmpProto = {
        constructor: function (id,cmpDir,bower,bowerDir) {

            var parsed = cmpUtil.parseName(bower);

            this.dir = cmpDir;
            this.type = parsed.type;
            this.name = parsed.name;
            this.version = bower.version;
            this.main = bower.main;
            this.authors = bower.authors;
            this.id = id ? id : this.type + '_' + this.name + '_' + this.version;
            this.dependencies = [];
            this.dependenciesDir = lib.getDependenciesDir(cmpDir, bowerDir);
            return this;

        },
        log: function (field, value, prefix) {
            field = field ? 'cmp(' + this.id + ').' + field : 'cmp(' + this.id + ')';
            return lib.log(field, value, prefix);
        }
    };


    CmpProto.getScripts = function (prefix, pathField, mainField, minifyJs, addVersionParam) {

        if (!prefix) {
            prefix = '';
        }
        if (!pathField) {
            pathField = 'path';
        }
        if (!mainField) {
            mainField = 'main';
        }
        var dependencies = [];
        var sources = [];

        function addCmpScripts(cmpObject) {

            if (!cmpObject[pathField]) {
                grunt.fail.fatal('\n ' + cmpObject.log(pathField) + ' is empty.\n Please set field' + pathField + ' in cmpSet task');
            }

            var path = cmpObject[pathField];
            var verParam = addVersionParam ? '?ver=' + cmpObject.version : '';

            if (cmpObject[mainField]) {
                var scripts = cmpObject[mainField];
                if (scripts instanceof Array) {
                    scripts.forEach(function (script) {
                        sources.push(prefix + path + '/' + lib.parseScript(script, minifyJs) +  verParam);
                    });
                } else {
                    if (cmpObject.name === 'jquery') {
                        sources.unshift(prefix + path + '/' + lib.parseScript(scripts, minifyJs) +  verParam);
                    } else {
                        sources.push(prefix + path + '/' + lib.parseScript(scripts, minifyJs) +  verParam);
                    }

                }
            }
        }

        function iterateCmpDependencies(cmpObject) {
            if (cmpObject.dependencies && cmpObject.dependencies.length > 0) {
                grunt.verbose.writeln('>>'.cyan + cmpObject.log('dependencies[]', cmpObject.dependencies));
            }

            cmpObject.dependencies.forEach(function (depId) {

                var depObject = cmpUtil.getCmp(depId);
                var key = depObject.type + '_' + depObject.name;
                if (!dependencies[key]) {
                    //In the script can be only one version of the library
                    dependencies[key] = depObject.version;

                    iterateCmpDependencies(depObject);
                    addCmpScripts(depObject);
                } else if (dependencies[key] !== depObject.version) {
                    grunt.log.warn('conflict ' + key + ' versions:',
                        dependencies[key], '<> ' + depObject.version);
                }
            });
        }


        iterateCmpDependencies(this);
        addCmpScripts(this);

        return sources;

    };



    cmpUtil.getComponents = function () {
        return  grunt._tempCmpObjectMap || ( grunt._tempCmpObjectMap = {} );
    };

    //get component from common map
    cmpUtil.getCmp = function (id) {

        if (!id) {
            if (!grunt.task.current.args[0]) {
                grunt.fail.fatal('\n component id is not specified');
            } else {
                id = grunt.task.current.args[0];
            }
        }

        var cmp = cmpUtil.getComponents()[id];
        if (!cmp) {
            grunt.fail.fatal('\n component Id =' + id + 'not exist');
        }
        return cmp;

    };

    //set component to common map
    cmpUtil.setCmp = function (id, cmp) {
        if (!id) {
            grunt.fail.fatal('\n component id is not specified');
        }
        cmpUtil.getComponents()[id] = cmp;
    };


    cmpUtil.createCmp = function (id, cmpDir, bower, bowerDir) {

        var cmp = Object.create(CmpProto).constructor(id, cmpDir, bower, bowerDir);

        grunt.log.writeln('>> '.blue + cmp.log() + ' = { id: ' + cmp.id.cyan +' type: ' + cmp.type.cyan + ', name: ' + cmp.name.cyan +
            ', version: ' + cmp.version.cyan +  ', dir: ' + cmp.dir.cyan + ', dependenciesDir: ' + cmp.dependenciesDir.cyan + " }");
        grunt.verbose.writeln('='.cyan, cmp);

        cmpUtil.setCmp(cmp.id, cmp);

        return cmp;
    };

    return cmpUtil;

};
