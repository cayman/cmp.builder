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

    function isBowerDependency(depDetail){

        return depDetail.indexOf(":")>=0 || lib.equalName(depDetail,'~') ||
            lib.equalName(depDetail,'>') || lib.equalName(depDetail,'=') || lib.equalName(depDetail,'<') ||
            lib.equalName(depDetail,'git') || lib.equalName(depDetail,'http') || lib.equalName(depDetail,'svn') ||
            lib.equalName(depDetail,'file');
    }

    grunt.registerTask('cmpBower', 'cmp collect js scripts', function (dir) {
        var cmpDir = dir;
        if (!dir) {
            cmpDir = '.';
        }else if(!grunt.file.exists(cmpDir)){
            grunt.fail.fatal('\n dir ' + cmpDir + 'not exist');
        }

        var options = this.options({
            sourceFile: 'cmp.json',
            bowerFile: 'bower.json',
            bowerDir: 'bower_components',
            repository: null
        });

        var sourceFilePath = cmpDir + '/' + options.sourceFile;
        var bowerFilePath = cmpDir + '/' + options.bowerFile;
        var isSourceFileExist = grunt.file.exists(sourceFilePath);
        var tasks = [];
        var dependencies = {};
        var localDependencies = {};
        var parentDependencies;

        if (cmpDir !== '.') {
            if (grunt.file.exists('./' + options.sourceFile)) {
                parentDependencies = grunt.file.readJSON('./' + options.sourceFile).dependencies;
            } else if (grunt.file.exists('./' + options.bowerFile)) {
                parentDependencies = grunt.file.readJSON('./' + options.bowerFile).dependencies;
            }
        }

        if (isSourceFileExist) {

            var cmp = grunt.file.readJSON(sourceFilePath);

            lib.iterate(cmp.dependencies, function (depName, depDetail) {
                if (parentDependencies && parentDependencies[depName]) {
                    //override dependencies
                    depDetail = parentDependencies[depName];
                }

                if(isBowerDependency(depDetail)) {
                    //is git repository
                    if (cmpUtil.isCmpName(depName)) {
                        if (!options.repository) {
                            grunt.log.fatal('\n options.repository undefined');
                        }
                        dependencies[depName] = options.repository + depName + '.git#' + depDetail;
                        grunt.log.write('git cmp(' + depName + ') ' + dependencies[depName] + '\n');
                    } else {//is bower global lib
                        dependencies[depName] = depDetail;
                        grunt.log.write('bower cmp(' + depName + ') ' + dependencies[depName] + '\n');
                    }

                }else{
                    //is relative local dir
                    if (grunt.file.exists(depDetail)) {
                        //is local folder
                        localDependencies[depName] = depDetail;
                        grunt.log.write('relative cmp(' + depName + ') ' + localDependencies[depName] + '\n');
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
            grunt.log.ok('File "' + bowerFilePath + '" created.');

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


    var _bowerFiles= {};

    function readBowerFile(dir){
        var file = dir+ '/bower.json';
        var bower = _bowerFiles[file];
        if(!bower) {
            if (!grunt.file.exists(file)) {
                grunt.fail.fatal('\n file ' + file +' not found. Please start command "grunt cmpBower" ');
            }
            _bowerFiles[file] = bower = grunt.file.readJSON(file);
        }
        return bower;
    }



    var _componentDirs = {};

    function addDependency(cmp, depCmp, log) {
        cmp.dependencies.push(depCmp.id);
        if(log) {
            grunt.log.ok(cmp.log('dependencies[]', depCmp.id,'+='));
        }
        if (depCmp.type === 'template') {
            cmp.template = depCmp.id;
            grunt.log.ok(cmp.log('template',depCmp.id));
        }
    }

    function addDependencyOrTask(tasks,cmp,depDir) {
        if (_componentDirs.hasOwnProperty(depDir)) {
            addDependency(cmp, cmpUtil.getCmp(_componentDirs[depDir]));
        } else {
            var depId = cmpUtil.getSimpleId(readBowerFile(depDir));
            var depCmp;
            if(depId && (depCmp = cmpUtil.getComponents()[depId])){
                _componentDirs[depDir] = depId;
                addDependency(cmp, depCmp);
            }else{
                tasks.push('cmpBuild:' + depDir + ':' + cmp.id);
            }
        }
    }


    grunt.registerTask('cmpBuild', 'component init task', function (dir, parentId) {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            bowerDir: 'bower_components'
        });


        var done = this.async();

        function end(){
            grunt.log.write('>>'.cyan + ' build dirs count',lib.fieldsCount(_componentDirs).green);
            grunt.log.write(', bowers.json count',lib.fieldsCount(_bowerFiles).green);
            grunt.log.writeln(', components count',lib.fieldsCount(cmpUtil.getComponents()).green);
            done();
        }

        var cmpDir = dir;

        if (!dir) {  //default dir
            cmpDir = '.';
        }


        if (_componentDirs.hasOwnProperty(cmpDir)) {
            grunt.verbose.writeln('\t cmp(' + _componentDirs.hasOwnProperty(cmpDir) +') already exist');
            if (parentId) {
                addDependency(cmpUtil.getCmp(parentId), cmpUtil.getCmp(_componentDirs[cmpDir]), true);

            }
            end();

        } else {
            //load bower file
            var bower = readBowerFile(cmpDir);

            //is Cmp component object
            var id = cmpUtil.getSimpleId(bower);
            var cmp;

            if(id){

                if(!bower.version){
                    grunt.fail.fatal('Files ' + cmpDir + '/' + options.bowerFile + ' mast have version or hashDir field');
                }

                cmp = cmpUtil.getComponents()[id];

                if(!cmp) {
                    cmp = cmpUtil.createCmp(id, cmpDir, bower, options.bowerDir);

                    var tasks = [];

                    lib.iterate(bower.dependencies, function (depName, depDetail) {
                        addDependencyOrTask(tasks, cmp, cmp.dependenciesDir + '/' + depName)
                    });

                    lib.iterate(bower.localDependencies, function (depName, depDetail) {
                        addDependencyOrTask(tasks, cmp, depDetail);
                    });

                    lib.addTasks(tasks, options[cmp.type], cmp.id);

                    if (tasks.length > 0) {
                        grunt.log.ok(lib.log('subTasks[]',tasks));
                        grunt.task.run(tasks);
                    }

                    grunt.log.ok(cmp.log('dependencies',cmp.dependencies));

                }
                if (parentId) {
                    addDependency(cmpUtil.getCmp(parentId), cmp, true);
                }

                _componentDirs[cmpDir] = id;

                end();

            }else{
                dirsum.digest(cmpDir + '/' + bower.hashDir, 'md5', function (err, dirHashes) {
                    if (err) {
                        grunt.fail.fatal(err);
                    }
                    bower.version = sh.unique(dirHashes.hash);

                    var cmp = cmpUtil.createCmp(null, cmpDir, bower, options.bowerDir);

                    var tasks = [];

                    lib.iterate(bower.dependencies, function (depName, depDetail) {
                        addDependencyOrTask(tasks, cmp, cmp.dependenciesDir + '/' + depName)
                    });

                    lib.iterate(bower.localDependencies, function (depName, depDetail) {
                        addDependencyOrTask(tasks, cmp, depDetail);
                    });

                    lib.addTasks(tasks, options[cmp.type], cmp.id);

                    if (tasks.length > 0) {
                        grunt.log.ok(lib.log('subTasks[]',tasks));
                        grunt.task.run(tasks);
                    }

                    grunt.log.ok(cmp.log('dependencies',cmp.dependencies));

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
            grunt.log.ok(cmp.log(fieldName,fieldValue));
        });

    });


    var _configFiles = {};

    function readConfigFile(file,log){
        if ((typeof file) !== 'string') {
            grunt.fail.fatal('\n config file must be json or yml(yaml)');
        }
        var config = _configFiles[file];
        if(!config) {
            if (!grunt.file.exists(file)) {
                grunt.fail.fatal('\n file ' + file + 'not found');
            }
            if (file.slice(-5) === '.yaml' || file.slice(-4) === '.yml') {
                _configFiles[file] = config = grunt.file.readYAML(file);
                grunt.log.writeln('>> '.blue + log + ' <= load from file '+ file.cyan);
            } else if (file.slice(-5) === '.json') {
                grunt.log.writeln('>> '.blue + log + ' <= load from file '+ file.cyan);
                _configFiles[file] = config = grunt.file.readJSON(file);
            } else {
                grunt.fail.fatal('\n config file must be json or yml(yaml)');
            }
        }
        return config;
    }

    grunt.registerMultiTask('cmpConfig', 'cmp save confg', function () {

        var options = this.options({
            baseConfig: null,
            configField: 'config',
            pathField: 'path',
            write: {
                jsVariable: '_appConfig'
            }
        });
        var id = this.args[0];
        if (!id) {
            grunt.fail.fatal('\n this.args[0] mast be component Id');
        }
        var cmp = cmpUtil.getCmp(id);


        var baseConfig = options.baseConfig;
        if (!options.baseConfig) {
            grunt.fail.fatal('\n please set  ' + options.baseConfig + ' options ');
        }
        var baseConfig = readConfigFile(options.baseConfig, 'baseConfig');

        var logField = cmp.log(options.configField);
        if (!cmp[options.configField]) {
            grunt.fail.fatal('\n field ' + logField + ' is empty.\n Please set field'+ options.configField +' in cmpSet' );
        }
        var cmpConfig = readConfigFile(cmp[options.configField], logField);

        merge.appConfigs(baseConfig, cmpConfig, cmp.name);
        grunt.log.ok(cmp.log(options.configField, [logField,'baseConfig'],'<= merge' ));

        cmp.dependencies.forEach(function (depId) {
            var depObject = cmpUtil.getCmp(depId);
            if (depObject.type === 'mod' || depObject.type === 'template') {
//                console.log('depObject.src =' + depObject.src);

                var logDepCmp = depObject.log(options.configField);
                if (!cmp[options.configField]) {
                    grunt.fail.fatal('\n field ' + logDepCmp + ' is empty.\n Please set field'+ options.configField +' in cmpSet' );
                }
                var depConfig = readConfigFile(depObject[options.configField],logDepCmp);



                if (depObject.type === 'mod') {
                    merge.modConfigs(baseConfig, cmpConfig, depConfig, depObject.name, depObject.version);
                    grunt.log.ok(cmp.log(options.configField, [logField, logDepCmp],'<= merge'));

                    cmpConfig[depObject.type][depObject.name].path = depObject[options.pathField];
                    grunt.log.ok(cmp.log(options.configField + '.' +depObject.type  + '.' + depObject.name +'.path', depObject[options.pathField]));

                 } else {
                    merge.templateConfigs(baseConfig, cmpConfig, depConfig);
                    grunt.log.ok(cmp.log(options.configField, [logField, logDepCmp],'<= merge'));

                    cmpConfig[depObject.type].baseUrl = depObject[options.pathField];//@depricated
                    cmpConfig[depObject.type].path = depObject[options.pathField];
                    grunt.log.ok(cmp.log(options.configField + '.' +depObject.type + '.path', depObject[options.pathField]));
                }


            }
        });

        if (cmpConfig[cmp.type]) {
            cmpConfig[cmp.type].baseUrl = cmp[options.pathField];//@depricated
            cmpConfig[cmp.type].path = cmp[options.pathField];
        }
        cmp[options.configField] = cmpConfig;
        grunt.verbose.writeln('>> ' + cmp.log(options.configField,cmpConfig));

        if (options.write.jsFile) {
            var jsFile = 'var ' + options.write.jsVariable + ' = ' + JSON.stringify(cmpConfig) + ';';
            grunt.file.write(options.write.jsFile, jsFile);
            grunt.log.writeln('>> '.blue + logField + ' => saved to ' + options.write.jsFile.cyan + ' as ' + ('"var ' + options.write.jsVariable + ' = {..};"').green);

        } else {
            grunt.fail.fatal('\n options.write.jsFile not set ');

        }

        if (options.write.yamlFile) {
            var yamlFile = yaml.dump(cmpConfig);
            grunt.file.write(options.write.yamlFile, yamlFile);
            grunt.log.writeln('>> '.blue + logField + ' => saved to ' + options.write.yamlFile.cyan);
        }

        grunt.log.writeln('>>'.cyan + ' config file count',lib.fieldsCount(_configFiles).green);

    });



    grunt.registerMultiTask('cmpScripts', 'cmp collect js scripts', function () {

        var options = this.options({
            prefix: '',
            pathField: 'path',
            scriptField: 'main',
            minify: false,
            version: false
        });
        var id = this.args[0];
        if (!id) {
            grunt.fail.fatal('\n this.args[0] mast be component Id');
        }

        var cmp = cmpUtil.getCmp(id);
        var logField = cmp.log(options.scriptField);
        var dependencies = [];

        var sources = [];

        function parseScript(path, script, verParam) {
            var minJsExt = '.min.js';
            var jsExt = '.js';
            var pointIndex = script.indexOf('./');
            script = (pointIndex === 0 ? script.substr(2) : script );

            if (options.minify) {

                if (!lib.equalExt(script,minJsExt) && lib.equalExt(script,jsExt)) {
                    script = script.replace(new RegExp('\.js$', 'i'),minJsExt);
                } else if (!lib.equalExt(script,minJsExt)) {
                    grunt.fail.fatal('\n error ' + logField + ' item = ' + script.red + ', must end with ' + jsExt);
                }

            } else {
                if (lib.equalExt(script,minJsExt)) {
                    script = script.replace(new RegExp('\.min\.js$', 'i'), jsExt);
                } else if (!lib.equalExt(script,jsExt)) {
                    grunt.fail.fatal('\n  error ' + logField + ' item = ' + script.red + ', must end in ' + jsExt);
                }
            }
            script = options.prefix + path + '/' + script + verParam;

            return script;

        }

        function addCmpScripts(cmpObject) {

            var path = cmpObject[options.pathField];
            var scripts = cmpObject[options.scriptField];
            var verParam = options.version ? '?ver=' + cmpObject.version : '';

            if(scripts) {
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
        }

        function iterateCmpDependencies(cmpObject) {
            if(cmpObject.dependencies && cmpObject.dependencies.length > 0) {
                grunt.verbose.writeln('>>'.cyan + cmpObject.log('dependencies[]',cmpObject.dependencies));
            }

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


        iterateCmpDependencies(cmp);
        addCmpScripts(cmp);

        cmp[options.scriptField] = sources;
        grunt.log.ok(cmp.log(options.scriptField, sources));

//        grunt.verbose.writeln('>> '.cyan + cmp.log(options.scriptField ,sources));

    });


};

