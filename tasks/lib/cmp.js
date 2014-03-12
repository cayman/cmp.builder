'use strict';

exports.init = function (grunt) {

    var dirsum = require('dirsum');
    var sh = require('shorthash');

    var cmpUtil = {};

    cmpUtil.isCmpName = function (name){
        var arr = name.split('.');
        if(arr.length === 2){
            switch(arr[0]){
                case 'mod':
                case 'app':
                case 'portal':
                case 'template': return arr;
            }
        }
        return false;
    };

    var _objectsList = {};

    cmpUtil.createObject = function (bower, cmpDir, done) {
        // console.log('cmpDir= ' + cmpDir);

        var key = 'dir' + cmpDir;
        if (_objectsList.hasOwnProperty(key)) {
            done(_objectsList[key]);
        }else{
            var isCmp = cmpUtil.isCmpName(bower.name);
            var cmp = {
                dir: cmpDir,
                type: isCmp ? isCmp[0] : 'lib',
                name: isCmp ? isCmp[1] : bower.name,
                fullName: bower.name,
                version: bower.version,
                main: bower.main,
                authors: bower.authors,
                dependencies: []
            };
            _objectsList[key] = cmp;

            if (bower.hashDir) {
                dirsum.digest(cmpDir + '/' + bower.hashDir, 'md5', function (err, dirHashes) {
                    if (err) {
                        grunt.fail.fatal(err);
                    }
                    cmp.version = sh.unique(dirHashes.hash);
                    cmp.id = cmp.type + '_' + cmp.name + '_' + cmp.version;
                    done(cmp);
                });

            } else {

                cmp.id = cmp.type + '_' + cmp.name + '_' + cmp.version.replace(/\./g,'$');
                done(cmp);
            }
        }

    };


    cmpUtil.getCmp = function (id){
        return grunt.config.get('components.'+id);
    };

    cmpUtil.setCmp = function (id,cmp){
        grunt.config.set('components.'+id, cmp);
    };

    cmpUtil.setCmpField = function (id, fieldName, fieldValue){
        grunt.config.set('components.'+id+'.'+fieldName, fieldValue);
    };

    return cmpUtil;

};
