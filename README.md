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

To use an cmpObject, you must load lib cmpUtil and use a function named 'getCmp'  in Gruntfile.js

    var cmpUtil = require('./temp/cmp.builder/tasks/lib/cmp.js').init(grunt);  

and add in taskConfig fields components as {} and cmp as cmpUtil.getCmp function name

    var taskConfig = {
        ..
        cmp: cmpUtil.getCmp,
        ...
    }

## Tasks

### cmpBower

load _bower.json, overrade dependencies from root _bower.json and generate bower.json
after load dependencies or update for bower.json

    var taskConfig = {
        ..
        cmpBower: {
            options: {
                sourceFile: '_bower.json'
            }
        },
        ...
    }

run task

    cmpBower:{path}

For example
> grunt cmpBower

> grunt cmpBower:./app.index

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

run task

    grunt cmpBuild:{path}:{parent cmpId}

For example
> grunt cmpBuild:.

> grunt cmpBuild:./app.index

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
                path: '/<%=cmp().type %>/<%=cmp().name %>/<%=cmp().version %>',
                dest: '<%=build %>/<%=cmp().type %>/<%=cmp().name %>/<%=cmp().version %>'
            },
            app: {
                options: {
                    config: '<%=cmp().dir %>/src/config.yml',
                    main: [
                        'scripts/app-config.js',
                        'scripts/app.js',
                        'scripts/app-views.js'
                    ]
                }
            },
            mod: {
                options: {
                    config: '<%=cmp().dir %>/src/config.yml',
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
                    config: '<%=cmp().dir %>/src/config.yml',
                    main: []
                }
            },
            portal: {
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
                    baseConfig: './config.yml',
                    configField: 'config',
                    pathField: 'path',
                    write: {
                        jsVariable: '_<%=cmp().name %>AppConfig', //global javascript variable for jsFile
                        jsFile: '<%=cmp().dest %>/scripts/app-config.js',
                        yamlFile: '<%=cmp().dest %>/scripts/app-config.yml'
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
                    scriptField: 'main', // after get cmp().main agregate dependencies cmp.main fields as array
                    pathField: 'path',
                    minify: false, // use min.js in scripts
                    version: true  // add ?ver={cmp().version} to scripts suffix
                }
            }
        },
        ...
    }

and for example use cmp fields in assemble.io

        assemble: {
            options: {
                layoutdir: '<%=cmp(cmp().template).src %>/_layouts',
                layout: 'default.hbs',
                partials: '<%=cmp(cmp().template).src %>/_includes/*.hbs',
                flatten: true,
                hbs:{
                    assets: '<%=cmp(cmp().template).path %>',
                    home: '/',
                    name: '<%=cmp().name %>App',
                    title: '<%=cmp().config.app.title %>',
                    scripts: function(){
                        return cmpUtil.getCmp().main;
                    }
                }
            },
            app: {
                src: ['<%=cmp().src %>/<%=cmp().name %>.hbs'],
                dest: '<%=build %>'
            }
        },
