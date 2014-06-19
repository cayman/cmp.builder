cmp.builder
===========

grunt plugin

# grunt-cmp-builder
Plugin for build and run multi-single page portal

> Prepare several modules (mod.*) for build

> Prepare several application (app.*) for build

> Prepare template (template.*) for build

## Getting Started
This plugin requires Grunt `~0.4.2`

To use an cmpObject, you must create a function named 'getCmp'  in Gruntfile.js

    function getCmp(id){
        return  grunt.config.get('components.' + (id === undefined ? grunt.task.current.args[0] : id));
    }

and add in taskConfig fields components as {} and cmp as getCmp function name

    var taskConfig = {
        ..
        components: {},
        cmp: getCmp,
        ...
    }

## Tasks

### cmpBower
load cmp dependencies or update

    var taskConfig = {
        ..
        cmpBase: grunt.file.readJSON('cmp.json'),
        cmpBower: {
            options: {
                baseDependencies: '<%= cmpBase.dependencies %>',
                sourceFile: 'cmp.json',
                repository: 'git+https://git.***.net:8443/git/portal/'
            }
        },
        ...
    }

cmp.json example:

	{
		"name": "portal.xx",
		"dependencies": {
			"jquery": "~2.0.3",
			"angular": "~1.2.1",
			"angular-ui-router": "~0.2.0",
			"angular-bootstrap": "~0.8.0",
			"template.new": "~0.1.1",
			"app.index": "./app.index",
			"app.services": "./app.services",
			"app.catalogs": "./app.catalogs"
		}
	}
	

### cmpBuild:
create cmp object and his dependencies.

The root component may be a mod, app, template or portal,
depending on the passed parameter: the directory path components.

For example
> grunt cmpBuild:.

> grunt cmpBuild:app.index

> grunt cmpBuild:template.base

> grunt cmpBuild:mode.sidebar


    var taskConfig = {
        ..
        cmpBuild: {
            options: {
                app: {
                    tasks: [
                        'cmpSet:app',
                        'jshint:cmp',
                        'clean:app',
                        'copy:app',
                        'concat:app',
                        'html2js:app',
                        'ngmin:cmp',
                        'cmpConfig:app',
                        'cmpScripts:app',
                        'cmpTemplate:app',
                        'assemble:app'
                    ]
                },
                mod: {
                    tasks: [
                        'cmpSet:mod',
                        'jshint:cmp',
                        'clean:mod',
                        'copy:mod',
                        'concat:mod',
                        'html2js:mod',
                        'ngmin:cmp'
                    ]
                },
                lib: {
                    tasks: [
                        'cmpSet:lib',
                        'clean:lib',
                        'copy:lib'
                    ]

                },
                template: {
                    tasks: [
                        'cmpSet:template',
                        'jshint:cmp',
                        'clean:template',
                        'copy:template',
                        'html2js:template',
                        'ngmin:cmp'
                    ]
                },
                portal: {
                }
            }
        },
        ...
    }

Task cmpBuild creates objects cmpObject which contains the following fields:

	cmp().id: unique component id
	cmp().dir: component dir
	cmp().type: type (lib,mod,app,template) - taken in the name of the prefix components (mod | app | template) else 'lib'
	cmp().name: component name (from {bower.json}.name without prefix mod,app,template)
	cmp().fullName: full component name (from {bower.json}.name),
	cmp().version: component version (from {bower.json}.version),
	cmp().main: scripts (from {bower.json}.main),
	cmp().authors: автор (from {bower.json}.authors),
	cmp().dependencies: array identifiers dependent component
	cmp().dependenciesDir: root directory (generally {dir}/bower_components) which contain dependent components
	cmp().template: identifier template component (If the pattern is specified in dependencies)

###  cmpSet:
dynamically set additional fields to cmpObject

    var taskConfig = {
        ..
        cmpSet: {
            options: {
                src: '<%=cmp().dir %>/src',
                path: '<%=cmp().type %>/<%=cmp().name %>/<%=cmp().version %>',
                dest: '<%=build %>/<%=cmp().type %>/<%=cmp().name %>/<%=cmp().version %>'
            },
            app: {
                options: {
                    main: [
                        'scripts/app-config.js',
                        'scripts/app.js',
                        'scripts/app-views.js'
                    ]
                }
            },
            mod: {
                options: {
                    main: [
                        'scripts/mod.js',
                        'scripts/mod-views.js'
                    ]
                }
            },
            lib:{
                options:{
                    src: '<%=cmp().dir %>'
                }
            },
            template: {
                options: {
                    main: 'scripts/templates.js'
                }
            }
        },
        ...
    }

###  cmpConfig:
dynamically generate config object,
stored in the field specified in the 'options.set'. (For example cmp().config )
and save as js file.

    var taskConfig = {
        ..
        cmpConfig: {
            app: {
                options: {
                    sourceFile: 'config.yml',
                    set: 'config',
                    yaml: {
                        path: '<%=cmp().dest %>/config.yml'
                    },
                    js: {
                        path: '<%=cmp().dest %>/scripts/app-config.js',
                        prefix: 'var _<%=cmp().name %>AppConfig = ',
                        suffix: ';'
                    }
                }
            }
        },
        ...
    }

###  cmpScripts:
dynamically collect scripts link from current and dependency cmpObjects
and stored in the field specified in the 'options.set'. (For example cmp().scripts )

    var taskConfig = {
        ..
        cmpScripts: {
            app: {
                options: {
                    get: 'main',
                    prefix: '/',					
                    set: 'scripts'
                }
            }
        },
        ...
    }
