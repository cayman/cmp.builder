cmp.builder
===========

grunt plugin

# grunt-cmp-builder
Plugin for build and run multi-single page portal

> Prepare several modules (mod.*) for build (bower component with "type":"mod")

> Prepare several application (app.*) for build (bower component with "type":"app")

> Prepare template (template.*) for build (bower component with "type":"template")

> Prepare portal (portal.*) for build (bower component with "type":"portal")

## Getting Started
This plugin requires Grunt `~0.4.2`

To use an cmp() object, you must load lib cmpUtil and use a function named 'getCmp'  in Gruntfile.js

    var cmpUtil = require('./temp/cmp.builder/lib/cmp').init(grunt);

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

_bower.json example:

	{
		"name": "portal.xx",
		"dependencies": {
			"jquery": "~2.0.3",
			"angular": "~1.2.1",
			"angular-ui-router": "~0.2.0",
			"angular-bootstrap": "~0.8.0",
			"template.new": "git+https://git.xxxxx.net:8443/git/template.new.git#~0.0.8",
			"app.index": "./app.index",
			"app.services": "./app.services",
			"app.catalogs": "./app.catalogs"
		}
	}

In _bower.json file	you can use local file dependencies ./app.index
After cmpBower task run created bower.json

	{
		"name": "portal.xx",
		"dependencies": {
			"jquery": "~2.0.3",
			"angular": "~1.2.1",
			"angular-ui-router": "~0.2.0",
			"angular-bootstrap": "~0.8.0",
			"template.new": "git+https://git.xxxxx.net:8443/git/template.new.git#~0.0.8"

		},
		"localDependencies": {
            "app.index": "./app.index",
            "app.services": "./app.services",
            "app.catalogs": "./app.catalogs"
		}
	}

### cmpBuild
This is grunt multitask, which create and build cmp() object and his dependencies
(fields bower.dependencies and bower.devDependencies if options.{type}.devDependencies = true)

The type of components may be a 'mod', 'app', 'template' or 'portal',
depending on the passed parameter: the directory path components.

run task

    grunt cmpBuild:{target}:{path}:{parent cmpId}

For example
> grunt cmpBuild:dev:.

> grunt cmpBuild:prod:./app.index

> grunt cmpBuild:test:app.index

> grunt cmpBuild:dev:template.base

> grunt cmpBuild:dev:mode.sidebar

cmpBuild task options:

- options.app.task - a list of grunt tasks to be performed for the component cmp() with the type = 'app'
- options.app.devDependencies (default false) - parsed bower.devDependencies for component cmp() with the type = 'app'

- options.mod.task - a list of grunt tasks to be performed for the component cmp() with the type = 'mod'
- options.mod.devDependencies (default false) - parsed bower.devDependencies for component cmp() with the type = 'mod'

- options.template.task - a list of grunt tasks to be performed for the component cmp() with the type = 'template'
- options.template.devDependencies (default false) - parsed bower.devDependencies for component cmp() with the type = 'template'

- options.portal.task - a list of grunt tasks to be performed for the component cmp() with the type = 'portal'
- options.portal.devDependencies (default false) - parsed bower.devDependencies for component cmp() with the type = 'template'


    var taskConfig = {
        ..
        cmpBuild: {
            options: {
                app: {
                    tasks: [
                        'cmpSet:app','jshint:cmp','jsonlint:app',
                        'clean:cmp', 'copy:cmp', 'concat:cmp', 'html2js:cmp',
                        'cmpConfig:app', 'assemble:app'
                    ]
                },
                mod: {
                    tasks: [
                        'cmpSet:mod', 'jshint:cmp',
                        'clean:cmp', 'copy:cmp', 'concat:cmp', 'html2js:cmp'
                    ]
                },
                lib: {
                    tasks: [
                        'cmpSet:lib', 'clean:cmp', 'copy:lib'
                    ]
                },
                template: {
                    tasks: [
                        'cmpSet:template', 'clean:cmp', 'copy:cmp','html2js:template'
                    ]
                },
                portal: {
                    tasks: [
                        'jshint:portal'
                    ]
                }
            },
            dev: {
            },
            unit: {
                options: {
                    app: {
                        devDependencies: true,
                        tasks: [
                            'cmpSet:app', 'jshint:cmp', 'jsonlint:app',
                            'clean:cmp', 'copy:cmp', 'concat:cmp', 'html2js:cmp',
                            'cmpConfig:app', 'cmpKarma:unit'
                        ]
                    }
                }
            },
            prod: {
                options: {
                    app: {
                        tasks: [
                            'cmpSet:app', 'jshint:cmp', 'jsonlint:app',
                            'clean:cmp', 'copy:cmp', 'concat:cmp', 'html2js:cmp',
                            'cmpConfig:appMin', 'ngAnnotate:cmp', 'uglify:cmp', 'assemble:appMin'
                        ]
                    },
                    mod: {
                        tasks: [
                            'cmpSet:mod', 'jshint:cmp',
                            'clean:cmp', 'copy:cmp', 'concat:cmp', 'html2js:cmp',
                            'ngAnnotate:cmp', 'uglify:cmp'
                        ]
                    },
                    template: {
                        tasks: [
                            'cmpSet:template', 'clean:cmp', 'copy:cmp', 'html2js:template', 'uglify:cmp'
                        ]
                    }
                }
            }
        },
        ...
    }


Task cmpBuild creates objects cmp() object which contains the following fields:

	cmp().dir: component dir
	cmp().type: type (lib,mod,app,template) - taken from "type" param from bower.json (mod | app | template) else 'lib'
	cmp().name: component name (from {bower.json}.name without prefix mod,app,template if exist)
	cmp().version: component version (from {bower.json}.version),
	cmp().id: unique component id (for example {cmp().type}_{cmp().name}_{cmp().version} )
	cmp().main: scripts (from {bower.json}.main),
	cmp().authors: автор (from {bower.json}.authors),
	cmp().dependencies: array identifiers dependent component (with depDependencies, if option.depDependencies = true)
	cmp().dependenciesDir: root directory (generally {dir}/bower_components) which contain dependent components
	cmp().template: identifier template component (If the pattern is specified in dependencies)

###  cmpSet:
dynamically set additional fields to cmp() object

    var taskConfig = {
        ..
        cmpSet: {
            options: {
                src: '<%=cmp().dir %>/src',
                path: '<%=cmp().type %>/<%=cmp().name %>/<%=cmp().version %>',
                dest: '<%=params.build %>/<%=cmp().type %>/<%=cmp().name %>/<%=cmp().version %>'
            },
            app: {
                options: {
                    config: '<%=cmp().dir %>/src/config.yml',
                    script: 'scripts/app.js',
                    unit: 'tests/app-unit.spec.js',
                    e2e: 'tests/app-e2e.spec.js'
                }
            },
            mod: {
                options: {
                    config: '<%=cmp().dir %>/src/config.yml',
                    script: 'scripts/mod.js',
                    unit: 'tests/mod-unit.spec.js',
                    e2e: 'tests/mod-e2e.spec.js'
                }
            },
            lib:{
                options:{
                    src: '<%=cmp().dir %>'
                }
            },
            template: {
                options: {
                    config: '<%=cmp().dir %>/src/config.yml'
                }
            }
        },
        ...
    }

###  cmpConfig:
dynamically generate config object with merging baseConfig and app cmp() configField and configField mod cmp() dependencies,
stored created config as Javascript in jsFile (set jsVariable = ... } ,
and as YAML in yamlFile


    var taskConfig = {
        ..
        cmpConfig: {
            options: {
                baseConfig: './config.yml',
                configField: 'config',
                pathField: 'path',
                writeJsVariable: '_<%=cmp().name %>AppConfig',
                writeJs: '<%=cmp().dest %>/scripts/app-config.js'
            },
            app: {
                options: {
                    writeYaml: '<%=cmp().dest %>/scripts/app-config.yml',
                    writeJson: '<%=cmp().dest %>/scripts/app-config.json'
                }
            },
            appMin: {
            }
        },
        ...
    }

###  cmp().getScripts(), cmp().getLinks() methods
dynamically collect html scripts or html link from current and dependency cmp() objects


getScripts(root,pathField,fileFields,minJs);

- root - root path to script
- pathField -  path field for cmp() ( for example 'path'  cmp().path )
- fileFields - file field for cmp() ( for example 'main'  cmp().main ),
- minJs - use min.js or js for script extension


return array of object where
- type - html script type attribute  ( 'text/javascript' );
- src -  script src attribute as ( root + cmp().path + cmp().main ) ;
- version - script version as ( cmp().version )

example:

        cmpUtil.getCmp().getScripts('/','path','main',true);
or

        <%= cmp().getScripts('/','path',''main',true) %>;


getLinks(root,pathField,fileFields,minJs)
- root - root path to script;
- pathField -  path field for cmp() ( for example 'path'  cmp().path );
- fileFields - file field for cmp() ( for example 'main'  cmp().main );


return array of object where
- type - html link type attribute  ( 'text/css' or 'text/x-icon' or 'text/html' );
- rel - html link rel attribute as ('stylesheet' or 'icon' or 'shortcut icon' or 'import' );
- href -  link href as root + cmp().path + cmp().main;
- version -  link version as cmp().version;

example:

        cmpUtil.getCmp().getLinks('/','path','main');
or

       <%= cmp().getLinks('/','path',''main',true) %>;


and for example use cmp fields in assemble.io

        assemble: {
            options: {
                layoutdir: '<%=cmp(cmp().template).src %>/_layouts',
                layout: 'default.hbs',
                partials: '<%=cmp(cmp().template).src %>/_includes/*.hbs',
                flatten: true,
                var:{
                    assets: '/<%=cmp(cmp().template).path %>',
                    name: '<%=cmp().name %>App',
                    home: '/',
                    path: '/<%=cmp().name %>.html',
                    title: '<%=cmp().config.app.title %>',
                    counter: false
                },
                javascripts: function(){
                    return cmpUtil.getCmp().getScripts('/','path','main');
                },
                links: function(){
                    return cmpUtil.getCmp().getLinks('/','path','main');
                }
            },
            app: {
                src: ['<%=cmp().src %>/<%=cmp().name %>.hbs'],
                dest: '<%=params.build %>'
            },
            appMin: {
                options: {
                    javascripts: function () {
                        return cmpUtil.getCmp().getScripts('/', 'path', 'main', true);
                    },
                    counter: '<%=params.counter %>'
                },
                src: ['<%=cmp().src %>/<%=cmp().name %>.hbs'],
                dest: '<%=params.build %>'
            }
        },

head.hbs (include for assemble)

        {{# links }}<link type="{{ type }}" href="{{ src }}" rel="{{ rel }}" media="{{ media }}"/>
        {{/ links }}

scripts.hbs (include for assemble)

        {{# javascripts }}<script type="{{ type }}" src="{{ src }}"></script>
        {{/ javascripts }}

if template cmp() field values

     cmp().path : '
     cmp().main = [
         "img/favicon.ico",
         "css/magic-bootstrap.css?media=screen",
         "./css/style.css?media=screen",
         "./css/print.css?media=print"
     ],

then result code in html

    <link type="image/x-icon" href="/template/inner/0.1.0/img/favicon.ico?ver=0.1.0" rel="shortcut icon" media=""/>
    <link type="image/x-icon" href="/template/inner/0.1.0/img/favicon.ico?ver=0.1.0" rel="icon" media=""/>
    <link type="text/css" href="/template/inner/0.1.0/css/magic-bootstrap.css?ver=0.1.0" rel="stylesheet" media="screen"/>
    <link type="text/css" href="/template/inner/0.1.0/css/style.css?ver=0.1.0" rel="stylesheet" media="screen"/>
    <link type="text/css" href="/template/inner/0.1.0/css/print.css?ver=0.1.0" rel="stylesheet" media="print"/>

    ...

    <script type="text/javascript" src="/lib/jquery/2.0.3/jquery.js?ver=2.0.3"></script>
    <script type="text/javascript" src="/lib/angular/1.2.28/angular.js?ver=1.2.28"></script>
    <script type="text/javascript" src="/lib/angular-bootstrap/0.8.0/ui-bootstrap-tpls.js?ver=0.8.0"></script>
    <script type="text/javascript" src="/lib/angular-resource/1.2.28/angular-resource.js?ver=1.2.28"></script>
    <script type="text/javascript" src="/lib/angular-cookies/1.2.28/angular-cookies.js?ver=1.2.28"></script>
    <script type="text/javascript" src="/lib/angular-sanitize/1.2.28/angular-sanitize.js?ver=1.2.28"></script>
    <script type="text/javascript" src="/lib/angular-ui-router/0.2.13/release/angular-ui-router.js?ver=0.2.13"></script>
    <script type="text/javascript" src="/mod/core/0.1.8/scripts/mod.js?ver=0.1.8"></script>
    <script type="text/javascript" src="/mod/message/0.1.6/scripts/mod.js?ver=0.1.6"></script>
    <script type="text/javascript" src="/mod/message/0.1.6/scripts/mod-views.js?ver=0.1.6"></script>
    <script type="text/javascript" src="/mod/tooltip/0.1.3/scripts/mod.js?ver=0.1.3"></script>
    <script type="text/javascript" src="/mod/footer/0.2.1/scripts/mod.js?ver=0.2.1"></script>
    <script type="text/javascript" src="/mod/footer/0.2.1/scripts/mod-views.js?ver=0.2.1"></script>
    <script type="text/javascript" src="/app/usecases/EPU1m/scripts/app-config.js?ver=EPU1m"></script>
    <script type="text/javascript" src="/app/usecases/EPU1m/scripts/app.js?ver=EPU1m"></script>
    <script type="text/javascript" src="/app/usecases/EPU1m/scripts/app-views.js?ver=EPU1m"></script>
    <script type="text/javascript" src="/app/online/AYGT6/scripts/app-config.js?ver=AYGT6"></script>
    <script type="text/javascript" src="/app/online/AYGT6/scripts/app.js?ver=AYGT6"></script>
    <script type="text/javascript" src="/app/online/AYGT6/scripts/app-views.js?ver=AYGT6"></script>
