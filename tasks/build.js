module.exports = function (grunt) {
    console.log('Grunt cmp builder lib is loaded!');

    var lib = require('./lib/util').init(grunt);
    var cmpUtil = require('./lib/cmp').init(grunt);
    var merge = require('./lib/merge').init(grunt);
    var yaml = require('js-yaml');
    var bower = require('bower');
    var cli = require('bower/lib/util/cli');
    var baseConfig = null;

    grunt.registerTask('cmpBower', 'cmp collect js scripts', function (dir) {
        var cmpDir = dir;
        if (!dir) {
            cmpDir = '.';
        }

        var options = this.options({
            baseDependencies: { },
            sourceFile: 'cmp.json',
            bowerFile: 'bower.json',
            bowerDir: 'bower_components',
            repository: null
        });
        if (!options.repository) {
            grunt.log.warn('\n options.repository undefined');
        }

        var bowerConfig = {
            cwd: cmpDir,
            directory: options.bowerDir,
            strictSsl: false,
            interactive: true,
            install: true,
            verbose: true
//            cleanTargetDir: false,
//            cleanBowerDir: false,
//            targetDir: './lib',
//            layout: 'byType',
//            copy: true,
//            bowerOptions: {}
        };

        var tasks = [];
        var dependencies = {};
        var localDependencies = {};
        var sourceFilePath = cmpDir + '/' + options.sourceFile;
        var bowerFilePath = cmpDir + '/' + options.bowerFile;
        var isSourceFileExist = grunt.file.exists(sourceFilePath);

        if (isSourceFileExist) {

            var cmp = grunt.file.readJSON(sourceFilePath);

            lib.iterate(cmp.dependencies, function (depName, depDetail) {
                if (options.baseDependencies[depName]) {
                    //override dependencies
                    depDetail = options.baseDependencies[depName];
                }

                if (depDetail.indexOf('.') === 0){
                    if (grunt.file.exists(depDetail)){
                        //is local folder
                        localDependencies[depName] = depDetail;
                        grunt.log.write( 'local cmp(' + depName + ') ' + localDependencies[depName]+'\n');
                        tasks.push('cmpBower:' + depDetail);
                    }else{
                        grunt.fail.fatal('\n dependency dir ' + depDetail + 'not found');
                    }
                }else{
                    //is git repository
                    if (cmpUtil.isCmpName(depName)) {
                        dependencies[depName] = options.repository + depName + '.git#' + depDetail;
                        grunt.log.write( 'git cmp(' + depName + ') ' + dependencies[depName]+'\n');
                    } else {//is bower global lib
                        dependencies[depName] = depDetail;
                        grunt.log.write( 'bower cmp(' + depName + ') ' + dependencies[depName]+'\n');

                    }

                }

            });
            if (!cmp.version) {
                cmp.version = '0.0.0';
            }
            cmp.dependencies = dependencies;
            cmp.localDependencies = localDependencies;
            cmp.private = true;
            cmp.license = "private";

            grunt.task.run(tasks);

            var bowerFile = JSON.stringify(cmp);
            grunt.file.write(bowerFilePath, bowerFile);
            grunt.log.ok('File "'+bowerFilePath + '" created.');

        } else {
            grunt.log.warn('File ' + sourceFilePath + ' not found');

        }

        if (grunt.file.exists(bowerFilePath)) {

            var done = this.async();
            var renderer;
            var logger;
            var command;

            if (grunt.file.exists(cmpDir + '/' + options.bowerDir)) {
                //update
                command = 'update';
                grunt.log.write( 'Started "bower update" command from ' + cmpDir + '/\n');
                logger = bower.commands.update([], {}, bowerConfig);

            }else{
                //install
                command = 'install';
                grunt.log.write( 'Started "bower install" command from ' + cmpDir + '/\n');
                logger = bower.commands.install([], {}, bowerConfig);
            }

            renderer = cli.getRenderer(command, logger.json, bowerConfig);

            logger
                .on('log', function (log) {
                    renderer.log(log);
                })
                .on('prompt', function (prompt, callback) {
                    renderer.prompt(prompt)
                        .then(function (answer) {
                            callback(answer);
                        });
                })
                .on('error', function (error) {
                    renderer.error(error);
                    done(false);
                })
                .on('end', function (result) {
                    renderer.end(result);
                    done();
                });


        } else {
            if(isSourceFileExist) {
                grunt.fail.fatal('File ' + bowerFilePath + ' not found ');
            }else{
                grunt.fail.fatal('Files ' + bowerFilePath + ' or '+ sourceFilePath +' not found ');
            }
        }

    });

    grunt.registerTask('cmpBuild', 'component init task', function (dir, parentId) {
        // Merge task-specific and/or target-specific options with these defaults.
        var done = this.async();
        var cmpDir = dir;

        if (!dir) {  //default dir
            cmpDir = '.';
        }

        var options = this.options({
            bowerFile: 'bower.json',
            bowerDir: 'bower_components'
        });

        if (!grunt.file.exists(cmpDir + '/' + options.bowerFile)) {
            grunt.fail.fatal('\n file ' + cmpDir + '/' + options.bowerFile + ' not found. Please start command "grunt cmpBower" ');
        }
        var bower = grunt.file.readJSON(cmpDir + '/' + options.bowerFile);



        cmpUtil.createObject(bower, cmpDir, function (cmp) {
            if (!cmpUtil.getCmp(cmp.id)) {
                var tasks = [];
                //console.log(cmp);

                //set dependencies dir
                cmp.dependenciesDir = lib.getDependenciesDir(cmpDir,options.bowerDir);

                lib.iterate(bower.dependencies, function (depName, depDetail) {
                    var depDir = cmp.dependenciesDir + '/' + depName;
                    //console.log('depDir=' + depDir);
                    tasks.push('cmpBuild:' + depDir + ':' + cmp.id);
                });
                lib.iterate(bower.localDependencies, function (depName, depDetail) {
                    var depDir = depDetail;
                    //console.log('depDir=' + depDir);
                    tasks.push('cmpBuild:' + depDir + ':' + cmp.id);
                });

                lib.addTasks(tasks, options[cmp.type], cmp.id);

                cmpUtil.setCmp(cmp.id, cmp );

                //first performs the task for dependencies
                if (tasks.length > 0) {
                    //console.log('run ' + tasks);
                    grunt.task.run(tasks);
                }
                grunt.log.ok('cmp id = ' + cmp.id + ' was created');
            }

            if (parentId) {
                var dependencies = cmpUtil.getCmp(parentId).dependencies;
                dependencies.push(cmp.id);
                cmpUtil.setCmpField(parentId,'dependencies',dependencies);
                if(cmp.type === 'template'){
                    cmpUtil.setCmpField(parentId,'template',cmp.id);
                }
            }
            done();

        });

    });


    grunt.registerMultiTask('cmpSet', 'cmp save fields', function () {


        var options = this.options();
        var id = this.args[0];
        if (!id) {
            grunt.fail.fatal('\n this.args[0] mast be component Id');
        }
        lib.iterate(options, function (fieldName, fieldValue) {
            cmpUtil.setCmpField(id, fieldName, fieldValue);
            grunt.log.ok('cmp(' + id + ').'+fieldName + " = " + fieldValue);
        });

    });

    grunt.registerTask('cmpTest', 'cmp save fields', function () {

        var options = this.options();
//        lib.iterate(options, function (fieldName, fieldValue){
//            console.log(fieldName +" = ");
//            console.log(fieldValue);
//        })

        console.log('cmp:');
        console.log(cmpUtil.getCmp(this.args[0]));

    });

    grunt.registerMultiTask('cmpConfig', 'cmp save confg', function () {

        var options = this.options({
            sourceFile: 'config.yml',
            srcField: 'src',
            pathField: 'path',
            set: 'config',
            write: {
                jsVariable: '_appConfig'
            }
        });
        var id = this.args[0];
        if (!id) {
            grunt.fail.fatal('\n this.args[0] mast be component Id');
        }
        var cmp = cmpUtil.getCmp(id);

        if (!baseConfig) {
            if (!grunt.file.exists(options.sourceFile)) {
                grunt.fail.fatal('\n base ' + options.sourceFile + ' not found');
            }
            baseConfig = grunt.file.readYAML(options.sourceFile);
        }

        if(!cmp[options.srcField]){
            grunt.fail.fatal('\n field ' + options.srcField + 'in cmp(' + id + ') is empty ');
        }

        if(!cmp[options.pathField]){
            grunt.fail.fatal('\n field ' + options.pathField + 'in cmp(' + id + ') is empty ');
        }

        if (!grunt.file.exists(cmp[options.srcField] + '/' + options.sourceFile)) {
            grunt.fail.fatal('\n ' + cmp[options.srcField] + '/' + options.sourceFile + ' not found');
        }

        var cmpConfig = grunt.file.readYAML(cmp[options.srcField] + '/' + options.sourceFile);
        merge.appConfigs(baseConfig, cmpConfig, cmp.name);

        cmp.dependencies.forEach(function (depId) {
            var depObject = cmpUtil.getCmp(depId);
            if (depObject.type === 'mod' || depObject.type === 'template') {
//                console.log('depObject.src =' + depObject.src);

                if(!depObject[options.srcField]){
                    grunt.fail.fatal('\n field ' + options.srcField + 'in cmp(' + depId + ') is empty ');
                }

                if (!grunt.file.exists(depObject[options.srcField] + '/' + options.sourceFile)) {
                    grunt.fail.fatal('\n config file ' + depObject[options.srcField] + '/' + options.sourceFile + ' not found');
                }
                var depConfig = grunt.file.readYAML(depObject[options.srcField] + '/' + options.sourceFile);
                if (depObject.type === 'mod') {
                    merge.modConfigs(baseConfig, cmpConfig, depConfig, depObject.name, depObject.version);
                } else {
                    merge.templateConfigs(baseConfig, cmpConfig, depConfig);
                    cmpConfig[depObject.type].baseUrl = depObject[options.pathField];
                }

            }
        });

        if (cmpConfig[cmp.type]) {
            cmpConfig[cmp.type].baseUrl = cmp[options.pathField];
         }

        cmpUtil.setCmpField(id, options.set, cmpConfig);
        grunt.log.ok('cmp(' + id + ').'+options.set + ' = {config object}');

        if(options.write.jsFile) {
            var jsFile = 'var ' + options.write.jsVariable + ' = ' + JSON.stringify(cmpConfig) + ';';
            grunt.file.write(options.write.jsFile, jsFile);
            grunt.log.ok('File "' + options.write.jsFile + '" ( var '+options.write.jsVariable +' ) created.');

        }else{
            grunt.fail.fatal('\n options.write.jsFile not set ');

        }

        if(options.write.yamlFile) {
            var yamlFile = yaml.dump(cmpConfig);
            grunt.file.write(options.write.yamlFile, yamlFile);
            grunt.log.ok('File "' + options.write.yamlFile + '" created.');
        }

    });

    grunt.registerMultiTask('cmpScripts', 'cmp collect js scripts', function () {

        var minJsExt = '.min.js';
        var jsExt = '.js';

        var options = this.options({
            prefix: '',
            pathField: 'path',
            scriptField: 'main',
            minScript: false,
            set: 'scripts'
        });
        var id = this.args[0];
        if (!id) {
            grunt.fail.fatal('\n this.args[0] mast be component Id');
        }

        var cmp = cmpUtil.getCmp(id);
        var dependencies = [];

        var sources = [];

        function addScript(path, script, setFirst) {
            var pointIndex = script.indexOf('./');
            var normalScript = (pointIndex === 0 ? script.substr(2) : script );

            if(options.minScript){

                if(normalScript.substr(-7) !== minJsExt && normalScript.substr(-3) === jsExt ) {
                    normalScript = normalScript.replace(new RegExp("\.js$", 'i'), minJsExt);
                }else if(normalScript.substr(-7) !== minJsExt){
                    grunt.fail.fatal('\n error cmp['+options.scriptField+'] value:'+ script + ' must end in ' + jsExt );
                }

            } else {
                if(normalScript.substr(-7)=== minJsExt ) {
                    normalScript = normalScript.replace(new RegExp("\.min\.js$", 'i'), jsExt);
                }else if(normalScript.substr(-3) !== jsExt){
                    grunt.fail.fatal('\n error cmp['+options.scriptField+'] value:' + script + ' must end in ' + jsExt );
                }
            }

            if(setFirst){
                sources.unshift(options.prefix + path + '/' + normalScript);
            }else{
                sources.push(options.prefix + path + '/' + normalScript);
            }

        }

        function addCmpScripts(fullName, path, scripts) {
            if (scripts instanceof Array) {
                scripts.forEach(function (script) {
                    addScript(path, script);
                });
            } else {
                addScript(path, scripts, (fullName === 'jquery'));
            }
        }

        function iterateCmpDependencies(cmpObject) {
            cmpObject.dependencies.forEach(function (depId) {
                var depObject = cmpUtil.getCmp(depId);
                if (!dependencies[depObject.fullName]) {
                    //In the script can be only one version of the library
                    dependencies[depObject.fullName] = depObject.version;

                    iterateCmpDependencies(depObject);
                    addCmpScripts(depObject.fullName, depObject[options.pathField], depObject[options.scriptField]);
                }
            });
        }

        iterateCmpDependencies(cmp);
        addCmpScripts(cmp.fullName, cmp[options.pathField], cmp[options.scriptField]);

        cmpUtil.setCmpField(id, options.set, sources);
        grunt.log.ok('cmp(' + id + ').'+options.set + ' = [');
        grunt.log.writeln("\t"+sources.join("\n\t")+' ]');

    });


};

