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


## Tasks

### cmpBuild:
create cmp object and his dependencies.

The root component may be a mod, app, template or portal,
depending on the passed parameter: the directory path components.
For example
grunt cmpBuild:.
grunt cmpBuild:app.index
grunt cmpBuild:template.base
grunt cmpBuild:mode.sidebar


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
                        'less:template',
                        'sass:template',
                        'html2js:template',
                        'ngmin:cmp'
                    ]
                },
                portal: {
                }
            }
        },

###  cmpSet:
dynamically set additional fields to cmp object

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

###  cmpConfig:{
dynamically generate config js object

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

###  cmpScripts:
dynamically collect scripts link from current and dependency cmp objects

        cmpScripts: {
            app: {
                options: {
                    get: 'main',
                    set: 'scripts'
                }
            }
        },

###  cmpTemplate:
find template object from dependencies and set his field from 'get',
to set field in current object

        cmpTemplate: {
            app: {
                options: {
                    get: 'dest',
                    set: 'assets'
                }
            }
        },
