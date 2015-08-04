'use strict';
var yaml = require('js-yaml');
var bower = require('bower');
var cli = require('bower/lib/util/cli');
var dirsum = require('dirsum');
var sh = require('shorthash');
require('events').EventEmitter.prototype._maxListeners = 200;

module.exports = function (grunt) {
    console.log('Grunt cmp builder lib is loaded!');

    var lib = require('../lib/lib').init(grunt);
    var cmpUtil = require('../lib/cmp').init(grunt);
    var merge = require('../lib/merge').init(grunt);

    grunt.registerTask('cmpBower', 'cmp collect js scripts', function (dir) {
        var cmpDir = dir;
        if (!dir) {
            cmpDir = '.';
        } else if (!grunt.file.exists(cmpDir)) {
            grunt.fail.fatal('\n dir \'' + cmpDir + '\' not exist');
        }

        var options = this.options({
            sourceFile: '_bower.json',
            bowerFile: 'bower.json',
            bowerDir: 'bower_components'
        });

        var sourceFilePath = cmpDir + '/' + options.sourceFile;
        var bowerFilePath = cmpDir + '/' + options.bowerFile;
        var isSourceFileExist = grunt.file.exists(sourceFilePath);
        var tasks = [];
        var dependencies = {};
        var localDependencies = {};
        var parentDependencies;

        if (cmpDir !== '.') {
            grunt.log.write('Read base bower file "' + './' + options.sourceFile + '"\n');
            if (grunt.file.exists('./' + options.sourceFile)) {
                parentDependencies = grunt.file.readJSON('./' + options.sourceFile).dependencies;
            } else if (grunt.file.exists('./' + options.bowerFile)) {
                parentDependencies = grunt.file.readJSON('./' + options.bowerFile).dependencies;
            }
        }

        if (isSourceFileExist) {

            var cmp = grunt.file.readJSON(sourceFilePath);
            grunt.log.write((parentDependencies? 'Override': 'Read' ) + ' preliminary bower file "' + sourceFilePath + '"\n');

            lib.iterate(cmp.dependencies, function (depName, depDetail) {
                if (parentDependencies && parentDependencies[depName]) {
                    //override dependencies
                    depDetail = parentDependencies[depName];
                }
                grunt.log.write('   dependency'.cyan + ' "' + depName + '": ' + '"'.cyan + depDetail.cyan + '"'.cyan + '\n');

                if (lib.isBowerDependency(depDetail)) {
                    //is classic bower component
                    dependencies[depName] = depDetail;
                    grunt.log.write('>> '.blue + 'is bower cmp(' + depName + '): ' + dependencies[depName] + '\n');

                } else {
                    //is relative local dir (non classic bower)
                    if (grunt.file.exists(depDetail)) {
                        //is local folder
                        localDependencies[depName] = depDetail;
                        grunt.log.write('>> '.blue + 'is relative cmp(' + depName + '): ' + localDependencies[depName] + '\n');
                        tasks.push('cmpBower:' + depDetail);
                    } else {
                        grunt.fail.fatal('\n dependency dir ' + depDetail + 'not found');
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
            grunt.log.ok('File "' + bowerFilePath + '" generated.');
            grunt.log.write('\n');

        } else {
            grunt.log.warn('File ' + sourceFilePath + ' not found');

        }

        if (grunt.file.exists(bowerFilePath)) {

            var done = this.async();
            var renderer;
            var logger;
            var command;
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

            if (grunt.file.exists(cmpDir + '/' + options.bowerDir)) {
                //update
                command = 'update';
                grunt.log.write('Started "bower update" command from ' + cmpDir + '/\n');
                logger = bower.commands.update([], {}, bowerConfig);

            } else {
                //install
                command = 'install';
                grunt.log.write('Started "bower install" command from ' + cmpDir + '/\n');
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
            if (isSourceFileExist) {
                grunt.fail.fatal('File ' + bowerFilePath + ' not found ');
            } else {
                grunt.fail.fatal('Files ' + bowerFilePath + ' or ' + sourceFilePath + ' not found ');
            }
        }

    });


    var _componentDirs = {};

    function addDependency(cmp, depCmp, log) {
        cmp.dependencies.push(depCmp.id);
        if (log) {
            grunt.log.ok(cmp.log('dependencies[]', depCmp.id, '+='));
        }
        if (depCmp.type === 'template') {
            cmp.template = depCmp.id;
            grunt.log.ok(cmp.log('template', depCmp.id));
        }
    }

    function addDependencyOrTask(currentTask, tasks, cmp, depDir) {
        if (_componentDirs.hasOwnProperty(depDir)) {
            addDependency(cmp, cmpUtil.getCmp(_componentDirs[depDir]));
        } else {
            var depId = cmpUtil.getSimpleId(lib.readBowerFile(depDir));
            var depCmp;
            if (depId && (depCmp = cmpUtil.getComponents()[depId])) {
                _componentDirs[depDir] = depId;
                addDependency(cmp, depCmp);
            } else {
                tasks.push(currentTask + ':' + depDir + ':' + cmp.id);
            }
        }
    }


    grunt.registerMultiTask('cmpBuild', 'component init task', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var done = this.async();

        var options = this.options({
            bowerDir: 'bower_components'
        });
        var currentTask = this.name +':' + this.target;
        var currentTarget = this.target;
        grunt.verbose.writeln('>>'.red + 'task', currentTask);

        var cmpDir = this.args[0] || '.', parentId = this.args[1];
        grunt.verbose.writeln('>>'.red + 'cmpDir', cmpDir);
        grunt.verbose.writeln('>>'.red + 'parentId', parentId);

        //grunt.log.write('>>'.red + 'this.data', this.data);

        function end() {
            grunt.log.write('>>'.cyan + ' build dirs count', lib.fieldsCount(_componentDirs).green);
            grunt.log.write(', bowers.json count', lib.fieldsCount(lib._bowerFiles).green);
            grunt.log.writeln(', components count', lib.fieldsCount(cmpUtil.getComponents()).green);
            done();
        }


        if (_componentDirs.hasOwnProperty(cmpDir)) {
            grunt.verbose.writeln('\t cmp(' + _componentDirs.hasOwnProperty(cmpDir) + ') already exist');
            if (parentId) {
                addDependency(cmpUtil.getCmp(parentId), cmpUtil.getCmp(_componentDirs[cmpDir]), true);

            }
            end();

        } else {
            //load bower file
            var bower = lib.readBowerFile(cmpDir);

            //is Cmp component object
            var id = cmpUtil.getSimpleId(bower);
            var cmp;

            if (id) {

                if (!bower.version) {
                    grunt.fail.fatal('Files ' + cmpDir + '/' + options.bowerFile + ' mast have version or hashDir field');
                }

                cmp = cmpUtil.getComponents()[id];

                if (!cmp) {
                    cmp = cmpUtil.createCmp(id, cmpDir, bower, options.bowerDir);

                    var tasks = [];

                    lib.iterate(bower.dependencies, function (depName, depDetail) {
                        addDependencyOrTask(currentTask, tasks, cmp, cmp.dependenciesDir + '/' + depName)
                    });


                    if (options[cmp.type] && options[cmp.type].devDependencies){
                        lib.iterate(bower.devDependencies, function (depName, depDetail) {
                            addDependencyOrTask(currentTask, tasks, cmp, cmp.dependenciesDir + '/' + depName)
                        });
                    }

                    lib.iterate(bower.localDependencies, function (depName, depDetail) {
                        addDependencyOrTask(currentTask, tasks, cmp, depDetail);
                    });


                    lib.addTasks(tasks, options[cmp.type], cmp.id);

                    if (tasks.length > 0) {
                        grunt.log.ok(lib.log('subTasks[]', tasks));
                        grunt.task.run(tasks);
                    }

                    grunt.log.ok(cmp.log('dependencies', cmp.dependencies));

                }
                if (parentId) {
                    addDependency(cmpUtil.getCmp(parentId), cmp, true);
                }

                _componentDirs[cmpDir] = id;

                end();

            } else {
                dirsum.digest(cmpDir + '/' + bower.hashDir, 'md5', function (err, dirHashes) {
                    if (err) {
                        grunt.fail.fatal(err);
                    }
                    bower.version = sh.unique(dirHashes.hash);

                    var cmp = cmpUtil.createCmp(null, cmpDir, bower, options.bowerDir);

                    var tasks = [];

                    lib.iterate(bower.dependencies, function (depName, depDetail) {
                        addDependencyOrTask(currentTask, tasks, cmp, cmp.dependenciesDir + '/' + depName)
                    });

                    if (options[cmp.type] && options[cmp.type].devDependencies){
                        lib.iterate(bower.devDependencies, function (depName, depDetail) {
                            addDependencyOrTask(currentTask, tasks, cmp, cmp.dependenciesDir + '/' + depName)
                        });
                    }

                    lib.iterate(bower.localDependencies, function (depName, depDetail) {
                        addDependencyOrTask(currentTask, tasks, cmp, depDetail);
                    });



                    lib.addTasks(tasks, options[cmp.type], cmp.id);

                    if (tasks.length > 0) {
                        grunt.log.ok(lib.log('subTasks[]', tasks));
                        grunt.task.run(tasks);
                    }

                    grunt.log.ok(cmp.log('dependencies', cmp.dependencies));

                    if (parentId) {
                        addDependency(cmpUtil.getCmp(parentId), cmp, true);
                    }

                    _componentDirs[cmpDir] = cmp.id;

                    end();

                });

            }

        }

    });


    grunt.registerMultiTask('cmpSet', 'cmp save fields', function () {


        var options = this.options();
        var id = this.args[0];
        if (!id) {
            grunt.fail.fatal('\n this.args[0] mast be component Id');
        }
        var cmp = cmpUtil.getCmp(id);

        lib.iterate(options, function (fieldName, fieldValue) {
            cmp[fieldName] = fieldValue;
            grunt.log.ok(cmp.log(fieldName, fieldValue));
        });

    });



    grunt.registerMultiTask('cmpConfig', 'cmp save confg', function () {

        var options = this.options({
            baseConfig: null,
            configField: null,
            pathField: null,
            writeYaml: null, //yaml file path
            writeJson: null, //json file path
            writeJs: null, //javascript file path
            writeJsVariable: '_appConfig' //javascript variable in file path
        });
        var id = this.args[0];
        if (!id) {
            grunt.fail.fatal('\n this.args[0] mast be component Id');
        }
        var cmp = cmpUtil.getCmp(id);

        //read base (or portal) config object
        var baseConfig = lib.readConfigFile(options.baseConfig, function loaded(message){
                grunt.log.writeln('>> '.blue + 'baseConfig <= '+ message);
            },function error(message){
                grunt.fail.fatal('\n Error options "baseConfig" - '+message);
            });

        //read config object
        var logField = cmp.log(options.configField);
        var cmpConfig = lib.readConfigFile(cmp[options.configField],function loaded(message){
                grunt.log.writeln('>> '.blue + logField + ' <= ' + message);
            },function error(message){
                grunt.fail.fatal('\n Error field ' + logField + ' - ' + message);
            });

        //merge base config object and current component config object
        merge.appConfigs(baseConfig, cmpConfig, cmp.name);
        grunt.log.ok(cmp.log(options.configField, [logField, 'baseConfig'], '<= merge'));

        function mergeWithDependency(depId,isRoot){
            var depObject = cmpUtil.getCmp(depId);
            if(depObject.type === 'mod' || depObject.type === 'template') {

                var logDepCmp = depObject.log(options.configField);
                var depConfig = lib.readConfigFile(depObject[options.configField], function loaded(message) {
                    grunt.log.writeln('>> '.blue + logDepCmp + ' <= ' + message);
                }, function error(message) {
                    grunt.fail.fatal('\n Error field ' + logDepCmp + ' - ' + message);
                });

                if (depObject.type === 'mod') {
                    merge.modConfigs(baseConfig, cmpConfig, depConfig, depObject.name, depObject.version);
                    grunt.log.ok(cmp.log(options.configField, [logField, logDepCmp], '<= merge'));

                    cmpConfig[depObject.type][depObject.name].path = depObject[options.pathField];
                    grunt.log.ok(cmp.log(options.configField + '.' + depObject.type + '.' + depObject.name + '.path', depObject[options.pathField]));
                    //iterate inner dependencies
                    depObject.dependencies.forEach(function (depId) {
                        mergeWithDependency(depId);
                    });

                } else if (isRoot) {//type === 'template'
                    merge.templateConfigs(baseConfig, cmpConfig, depConfig);
                    grunt.log.ok(cmp.log(options.configField, [logField, logDepCmp], '<= merge'));

                    cmpConfig[depObject.type].path = depObject[options.pathField];
                    grunt.log.ok(cmp.log(options.configField + '.' + depObject.type + '.path', depObject[options.pathField]));

                    //iterate inner dependencies
                    depObject.dependencies.forEach(function (depId) {
                        mergeWithDependency(depId);
                    });
                }
            }

        }

        cmp.dependencies.forEach(function(depId){
            mergeWithDependency(depId,true);
        });

        if (cmpConfig[cmp.type]) {
           // cmpConfig[cmp.type].baseUrl = cmp[options.pathField];//@depricated
            cmpConfig[cmp.type].path = cmp[options.pathField];
        }
        cmp[options.configField] = cmpConfig;
        grunt.verbose.writeln('>> ' + cmp.log(options.configField, cmpConfig));

        if (options.writeJs) {
            var jsFile = 'var ' + options.writeJsVariable + ' = ' + JSON.stringify(cmpConfig) + ';';
            grunt.file.write(options.writeJs, jsFile);
            grunt.log.writeln('>> '.blue + logField + ' => saved to ' + options.writeJs.cyan + ' as ' + ('"var ' + options.writeJsVariable + ' = {..};"').green);

        } else {
            grunt.fail.fatal('\n options.writeJs not set ');

        }

        if (options.writeJson) {
            var jsonFile = JSON.stringify(cmpConfig,null, 2);
            grunt.file.write(options.writeJson, jsonFile);
            grunt.log.writeln('>> '.blue + logField + ' => saved to ' + options.writeJson.cyan);
        }

        if (options.writeYaml) {
            var yamlFile = yaml.dump(cmpConfig);
            grunt.file.write(options.writeYaml, yamlFile);
            grunt.log.writeln('>> '.blue + logField + ' => saved to ' + options.writeYaml.cyan);
        }

        grunt.log.writeln('>>'.cyan + ' config file count', lib.fieldsCount(lib._configFiles).green);

    });


};

