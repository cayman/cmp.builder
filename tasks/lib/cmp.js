'use strict';

exports.init = function (grunt) {

    var lib = require('./util').init(grunt);

    var cmpUtil = {};

    cmpUtil.isCmpName = function (name) {
        var arr = name.split('.');
        if (arr.length === 2) {
            switch (arr[0]) {
                case 'mod':
                case 'app':
                case 'portal':
                case 'template':
                    return arr;
            }
        }
        return false;
    };


    cmpUtil.getSimpleId = function (bower) {

        var isCmp = cmpUtil.isCmpName(bower.name);
        var type = isCmp ? isCmp[0] : 'lib';
        var name = isCmp ? isCmp[1] : bower.name;

        if (!bower.hashDir) {
            return type + '_' + name + '_' + bower.version.replace(/\./g, '$');
        }

        return false;
    };


    cmpUtil.getComponents = function () {
        return  grunt._tempCmpObjectMap || ( grunt._tempCmpObjectMap = {} );
    };

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

    cmpUtil.setCmp = function (id, cmp) {
        if (!id) {
            grunt.fail.fatal('\n component id is not specified');
        }
        cmpUtil.getComponents()[id] = cmp;
    };


    cmpUtil.createCmp = function (id, cmpDir, bower, bowerDir) {
        var isCmp = cmpUtil.isCmpName(bower.name);

        var cmp = {
            id: null,
            dir: cmpDir,
            type: (isCmp ? isCmp[0] : 'lib'),
            name: (isCmp ? isCmp[1] : bower.name),
            version: bower.version,
            fullName: bower.name,
            dependencies: [],
            main: bower.main,
            authors: bower.authors,
            log: function (field, value, prefix) {
                field = field ? 'cmp(' + this.id + ').' + field : 'cmp(' + this.id + ')';
                return lib.log(field, value, prefix);
            }
        };

        cmp.id = id ? id : cmp.type + '_' + cmp.name + '_' + cmp.version;
        cmp.dependenciesDir = lib.getDependenciesDir(cmp.dir, bowerDir);

        grunt.log.writeln('>> '.blue + cmp.log() + ' = { id: ' + cmp.id.cyan +' type: ' + cmp.type.cyan + ', name: ' + cmp.name.cyan +
            ', version: ' + cmp.version.cyan +  ', dir: ' + cmp.dir.cyan + ', fullName: ' + cmp.fullName.cyan + ', dependenciesDir: ' + cmp.dependenciesDir.cyan + " }");
        grunt.verbose.writeln('='.cyan, cmp);

        cmpUtil.setCmp(cmp.id, cmp);

        return cmp;
    };

    return cmpUtil;

};
