'use strict';

exports.init = function (grunt) {

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


    function components(){
        var components = grunt._tempCmpObjectMap || ( grunt._tempCmpObjectMap = {} );
        //console.log('components',Object.keys(components));
        return components;
    }


    cmpUtil.getComponents = components;

    cmpUtil.getCmp = function (id) {
        var cmpId = ( id === undefined ? grunt.task.current.args[0] : id );
        var cmp = components()[cmpId];
        if(!cmp) {
            grunt.fail.fatal('\n component Id =' + cmpId + 'not exist');
        }
       // console.log('get cmp ('+ cmpId +')',cmp);
        return cmp;

    };

    cmpUtil.setCmp = function (id, cmp) {
        //console.log('set cmp '+ id);
        components()[id] = cmp;
    };

    return cmpUtil;

};
