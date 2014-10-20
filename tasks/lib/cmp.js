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

        if(!id){
            if(!grunt.task.current.args[0]) {
                grunt.fail.fatal('\n component id is not specified');
            }else{
                id = grunt.task.current.args[0];
            }
        }

        var cmp = components()[id];
        if(!cmp) {
            grunt.fail.fatal('\n component Id =' + id + 'not exist');
        }
        return cmp;

    };

    cmpUtil.setCmp = function (id, cmp) {
        if(!id){
             grunt.fail.fatal('\n component id is not specified');
        }
        components()[id] = cmp;
    };

    return cmpUtil;

};
