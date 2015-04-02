'use strict';
var path = require('path');
var url = require('url');

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

    //Base class for cmp object
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

    //Base class for cmp link object
    var CmpLink = {
        _constructor: function (type, file, version) {
            this.type =type;
            this.src = file + '?ver=' + version;
            this.path = file;
            this.version = version;
            return this;
        },
        constructorJs: function (file, version) {
            return this._constructor('text/javascript',file,version);
        },
        constructorHtml: function (file, version) {
            return this._constructor('text/html',file,version);
        },
        constructorCss: function (file, version) {
            return this._constructor('text/css',file,version).rel('stylesheet');
        },
        constructorIcon: function (file, version) {
            return this._constructor('text/css',file,version);
        },
        rel: function(rel){
            this.rel = rel;
            return this;
        },
        params: function(params){
            if(params){
                for (var name in params) {
                    if (params.hasOwnProperty(name)) {
                        this[name] = params[name];
                    }
                }
            }
            return this;
        }
    };


    CmpProto._parseMain = function (pathField, fileFields, callback , withDependencies) {
        if (!fileFields) {
            fileFields = 'main';
        }
        var dependencies = [];

        function iterateCmpMain(cmpObject) {
            if (!cmpObject[pathField]) {
                grunt.fail.fatal('\n ' + cmpObject.log(pathField) + ' is empty.\n Please set field' + pathField + ' in cmpSet task');
            }

            if (withDependencies && cmpObject.dependencies && cmpObject.dependencies.length > 0) {
                grunt.verbose.writeln('>>'.cyan + cmpObject.log('dependencies[]', cmpObject.dependencies));

                cmpObject.dependencies.forEach(function (depId) {

                    var depObject = cmpUtil.getCmp(depId);
                    var key = depObject.type + '_' + depObject.name;
                    if (!dependencies[key]) {
                        //In the script can be only one version of the library
                        dependencies[key] = depObject.version;

                        iterateCmpMain(depObject);
                    } else if (dependencies[key] !== depObject.version) {
                        grunt.log.warn('conflict ' + key + ' versions:',
                            dependencies[key], '<> ' + depObject.version);
                    }
                });
            }

            lib.iterateDeep(cmpObject,fileFields,function(field, file){
                callback(cmpObject,path.normalize(cmpObject[pathField]),file);
            });
        }

        iterateCmpMain(this);

    };

    CmpProto.getScripts = function (basePath, pathField, fileFields, minJs) {
        var scripts = [];
        grunt.log.writeln('>>'.red + ' getScripts(\'' + basePath + '\',\'' + pathField + '\',\'' + fileFields + '\',' + minJs + ')');
        this._parseMain(pathField, fileFields, function(cmpObject, pathValue, fileValue){
            if(path.extname(fileValue) === '.js'){
                var  pathname = lib.pathJoin(basePath, pathValue, fileValue);
                grunt.verbose.writeln('script  pathname=', pathname);
                if (cmpObject.name === 'jquery') {
                    scripts.unshift(Object.create(CmpLink).constructorJs(lib.parseScript(pathname, minJs), cmpObject.version));
                } else {
                    scripts.push(Object.create(CmpLink).constructorJs(lib.parseScript(pathname, minJs), cmpObject.version));
                }

            }
        },true);
        //grunt.log.writeln('>>'.cyan + 'scripts = ', scripts);
        grunt.verbose.writeln('>>'.cyan + 'scripts = ', scripts);
        return scripts;
    };

    CmpProto.getArrayScripts = function (basePath, pathField, fileFields, minJs) {
       var scripts = this.getScripts(basePath, pathField, fileFields, minJs);
       var arr = [];
       for(var key in scripts) {
           arr.push(scripts[key].path);
       }
       return arr;
    };

    CmpProto.getLinks = function (basePath, pathField, fileFields) {
        var links = [];
        grunt.log.writeln('>>'.red + ' getLinks(\'' + basePath  + '\',\'' +  pathField  + '\',\'' +  fileFields + '\')');
        this._parseMain(pathField, fileFields,function(cmpObject, pathValue, fileValue){
            var parsed = url.parse(fileValue,true);
            var pathname = lib.pathJoin(basePath, pathValue, parsed.pathname);
            grunt.verbose.writeln('link  pathname=',pathname);
            switch (path.extname(pathname)){
                case '.html':
                case '.htm':
                    links.push(Object.create(CmpLink).constructorHtml(pathname,cmpObject.version).rel('import'));
                    break;
                case '.css':
                    links.push(Object.create(CmpLink).constructorCss(pathname,cmpObject.version).params(parsed.query));
                    break;
                case '.ico':
                case '.icon':
                    links.unshift(Object.create(CmpLink).constructorIcon(pathname,cmpObject.version).rel('icon'));
                    links.unshift(Object.create(CmpLink).constructorIcon(pathname,cmpObject.version).rel('shortcut icon'));
                    break;
            }
        },true);
        //grunt.log.writeln('>>'.cyan + 'links = ', links);
        grunt.verbose.writeln('>>'.cyan + 'links = ', links);
        return links;
    };

    CmpProto.getHtml = function (basePath, pathField, fileFields) {
        var html = [];
        this._parseMain(pathField, fileFields, function(cmpObject, pathValue, fileValue){
            var ext = path.extname(fileValue);
            if(ext === '.html' || ext === '.htm'){
                var  pathname = lib.pathJoin(basePath, pathValue, fileValue);
                grunt.verbose.writeln('html  pathname=', pathname);
                html.push(Object.create(CmpLink).constructorHtml(pathname,cmpObject.version));
            }
        },false);
        grunt.verbose.writeln('>>'.cyan + 'html = ', html);
        return html;
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
