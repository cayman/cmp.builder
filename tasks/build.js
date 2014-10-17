module.exports = function (grunt) {
    console.log('Grunt cmp builder lib is loaded!');

    var lib = require('./lib/util').init(grunt);
    var cmpUtil = require('./lib/cmp').init(grunt);
    var merge = require('./lib/merge').init(grunt);
    var yaml = require('js-yaml');
    var bower = require('bower');
    var cli = require('bower/lib/util/cli');
    var dirsum = require('dirsum');
    var sh = require('shorthash');
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

                if (depDetail.indexOf('.') === 0) {
                    if (grunt.file.exists(depDetail)) {
                        //is local folder
                        localDependencies[depName] = depDetail;
                        grunt.log.write('local cmp(' + depName + ') ' + localDependencies[depName] + '\n');
                        tasks.push('cmpBower:' + depDetail);
                    } else {
                        grunt.fail.fatal('\n dependency dir ' + depDetail + 'not found');
                    }
                } else {
                    //is git repository
                    if (cmpUtil.isCmpName(depName)) {
                        dependencies[depName] = options.repository + depName + '.git#' + depDetail;
                        grunt.log.write('git cmp(' + depName + ') ' + dependencies[depName] + '\n');
                    } else {//is bower global lib
                        dependencies[depName] = depDetail;
                        grunt.log.write('bower cmp(' + depName + ') ' + dependencies[depName] + '\n');

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
            grunt.log.ok('File "' + bowerFilePath + '" created.');

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
    var _bowersList = {};


    function addDependency(cmp, depCmp) {
        grunt.log.ok('cmp(' + cmp.id + ').dependencies[] = '+depCmp.id.cyan);
        cmp.dependencies.push(depCmp.id);
        if (depCmp.type === 'template') {
            grunt.log.ok('cmp(' + cmp.id + ').template = '+depCmp.id.cyan);
            cmp.template = depCmp.id;
        }
    }

    function addDependencyOrTask(tasks, cmp, depDir) {
        if (_componentDirs.hasOwnProperty(depDir)) {
            addDependency(cmp, cmpUtil.getCmp(_componentDirs[depDir]));
        } else {
            var bower = readBower(depDir);
            var depId = getSimpleId(bower);
            var depCmp;
            if(depId && (depCmp = cmpUtil.getComponents()[depId])){
                _componentDirs[depDir] = depId;
                addDependency(cmp, depCmp);
            }else{
                tasks.push('cmpBuild:' + depDir + ':' + cmp.id);
            }
        }
    }

    function readBower(dir){
        var bower = _bowersList[dir];
        if(!bower) {
            if (!grunt.file.exists(dir + '/bower.json')) {
                grunt.fail.fatal('\n file ' + dir + '/bower.json not found. Please start command "grunt cmpBower" ');
            }
            _bowersList[dir] = bower = grunt.file.readJSON(dir + '/bower.json');
        }
        return bower;
    }

    function getSimpleId(bower) {

        var isCmp = cmpUtil.isCmpName(bower.name);
        var type = isCmp ? isCmp[0] : 'lib';
        var name = isCmp ? isCmp[1] : bower.name;

        if (!bower.hashDir) {
            return type + '_' + name + '_' + bower.version.replace(/\./g, '$');
        }

        return false;
    }

    function createCmp(id, cmpDir, bower, options){
        var isCmp = cmpUtil.isCmpName(bower.name);
        var cmp = {};
        cmp.dir = cmpDir;
        cmp.type = isCmp ? isCmp[0] : 'lib';
        cmp.name = isCmp ? isCmp[1] : bower.name;
        cmp.version = bower.version;
        cmp.id = id ? id : cmp.type + '_' + cmp.name + '_' + bower.version;
        cmp.fullName = bower.name;
        cmp.dependencies =  [];
        cmp.main = bower.main;
        cmp.authors = bower.authors;
        cmp.dependenciesDir = lib.getDependenciesDir(cmp.dir, options.bowerDir);

        grunt.log.ok('Created cmp(' + cmp.id + ') from ' + cmp.dir.cyan);
        grunt.verbose.writeln('='.cyan, cmp);

        var tasks = [];

        lib.iterate(bower.dependencies, function (depName, depDetail) {

            addDependencyOrTask(tasks, cmp, cmp.dependenciesDir + '/' + depName)

        });

        lib.iterate(bower.localDependencies, function (depName, depDetail) {

            addDependencyOrTask(tasks, cmp, depDetail);

        });

        lib.addTasks(tasks, options[cmp.type], cmp.id);


        //first performs the task for dependencies
        if (tasks.length > 0) {
            grunt.verbose.writeln('>>'.cyan +' tasks +=', tasks);
            grunt.task.run(tasks);

        }

        cmpUtil.setCmp(cmp.id, cmp);

        return cmp;
    }

    function splitFields(object){
        var count = 0;
        for (var property in object) {
                count++;
        }
        return ''+count;
    }


    grunt.registerTask('cmpBuild', 'component init task', function (dir, parentId) {
        // Merge task-specific and/or target-specific options with these defaults.
        var done = this.async();
        var cmpDir = dir;

        grunt.log.writeln('>>  component dirs =',splitFields(_componentDirs).green);
        grunt.log.writeln('>>  bower files =',splitFields(_bowersList).green);
        grunt.log.writeln('>>  components =',splitFields(cmpUtil.getComponents()).green);

        if (!dir) {  //default dir
            cmpDir = '.';
        }

        var options = this.options({
            bowerDir: 'bower_components'
        });

        if (_componentDirs.hasOwnProperty(cmpDir)) {
            grunt.verbose.writeln('\t cmp(' + _componentDirs.hasOwnProperty(cmpDir) +') already exist');
            if (parentId) {
                addDependency(cmpUtil.getCmp(parentId), cmpUtil.getCmp(_componentDirs[cmpDir]));
            }
            done();

        } else {
            //load bower file
            var bower = readBower(cmpDir);

            //is Cmp component object
            var id = getSimpleId(bower);
            var cmp = null;

            if(id){

                if(!bower.version){
                    grunt.fail.fatal('Files ' + cmpDir + '/' + options.bowerFile + ' mast have version or hashDir field');
                }

                cmp = cmpUtil.getComponents()[id];
                if(!cmp) {
                    cmp = createCmp(id, cmpDir, bower, options);
                }
                if (parentId) {
                    addDependency(cmpUtil.getCmp(parentId), cmp);
                }

                _componentDirs[cmpDir] = id;

                done();

            }else{
                dirsum.digest(cmpDir + '/' + bower.hashDir, 'md5', function (err, dirHashes) {
                    if (err) {
                        grunt.fail.fatal(err);
                    }
                    bower.version = sh.unique(dirHashes.hash);

                    cmp = createCmp(null, cmpDir, bower, options);

                    if (parentId) {
                        addDependency(cmpUtil.getCmp(parentId), cmp);
                    }

                    _componentDirs[cmpDir] = cmp.id;

                    done();
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
            grunt.log.ok('cmp(' + id + ').' + fieldName + " = " + fieldValue.toString().cyan);
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

        if (!cmp[options.srcField]) {
            grunt.fail.fatal('\n field ' + options.srcField + 'in cmp(' + id + ') is empty ');
        }

        if (!cmp[options.pathField]) {
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

                if (!depObject[options.srcField]) {
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

        cmp[options.set] = cmpConfig;
        grunt.log.ok('cmp(' + id + ').' + options.set + ' = {merged config object}');

        if (options.write.jsFile) {
            var jsFile = 'var ' + options.write.jsVariable + ' = ' + JSON.stringify(cmpConfig) + ';';
            grunt.file.write(options.write.jsFile, jsFile);
            grunt.log.ok('File ' + options.write.jsFile.cyan + ' = ' + ('"var ' + options.write.jsVariable + ' = {..};"').green + ' created.');

        } else {
            grunt.fail.fatal('\n options.write.jsFile not set ');

        }

        if (options.write.yamlFile) {
            var yamlFile = yaml.dump(cmpConfig);
            grunt.file.write(options.write.yamlFile, yamlFile);
            grunt.log.ok('File ' + options.write.yamlFile.cyan + ' created.');
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
            verParam: false,
            set: 'scripts'
        });
        var id = this.args[0];
        if (!id) {
            grunt.fail.fatal('\n this.args[0] mast be component Id');
        }

        var cmp = cmpUtil.getCmp(id);
        var dependencies = [];

        var sources = [];

        function parseScript(path, script, verParam) {
            var pointIndex = script.indexOf('./');
            var normalScript = (pointIndex === 0 ? script.substr(2) : script );

            if (options.minScript) {

                if (normalScript.substr(-7) !== minJsExt && normalScript.substr(-3) === jsExt) {
                    normalScript = normalScript.replace(new RegExp("\.js$", 'i'), minJsExt);
                } else if (normalScript.substr(-7) !== minJsExt) {
                    grunt.fail.fatal('\n error cmp[' + options.scriptField + '] value:' + script + ' must end in ' + jsExt);
                }

            } else {
                if (normalScript.substr(-7) === minJsExt) {
                    normalScript = normalScript.replace(new RegExp("\.min\.js$", 'i'), jsExt);
                } else if (normalScript.substr(-3) !== jsExt) {
                    grunt.fail.fatal('\n error cmp[' + options.scriptField + '] value:' + script + ' must end in ' + jsExt);
                }
            }


            return options.prefix + path + '/' + normalScript + (verParam?'?ver='+verParam:'');

        }

        function addCmpScripts(cmpObject) {

            var path = cmpObject[options.pathField];
            var scripts = cmpObject[options.scriptField];
            var verParam = options.verParam ? cmpObject.version : null;

            if (scripts instanceof Array) {
                scripts.forEach(function (script) {
                    sources.push(parseScript(path, script, verParam));
                });
            } else {
                if (cmpObject.fullName === 'jquery') {
                    sources.unshift(parseScript(path, scripts, verParam));
                } else {
                    sources.push(parseScript(path, scripts, verParam));
                }

            }
        }

        function iterateCmpDependencies(cmpObject) {
            cmpObject.dependencies.forEach(function (depId) {
                var depObject = cmpUtil.getCmp(depId);
                if (!dependencies[depObject.fullName]) {
                    //In the script can be only one version of the library
                    dependencies[depObject.fullName] = depObject.version;

                    iterateCmpDependencies(depObject);
                    addCmpScripts(depObject);
                }else if(dependencies[depObject.fullName] !== depObject.version){
                    grunt.log.warn('conflict ' + depObject.fullName + ' versions:',dependencies[depObject.fullName],depObject.version);
                }
            });
        }

        grunt.verbose.writeln('>>'.cyan + ' cmp(' + id + ').dependencies =', cmp.dependencies.toString().cyan);

        iterateCmpDependencies(cmp);
        addCmpScripts(cmp);

        cmp[options.set] = sources;
        grunt.log.ok('cmp(' + id + ').' + options.set + ' = ['+ sources.join(',').cyan + ' ]');

    });


};

