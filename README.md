cmp.builder
===========

grunt plugin

# grunt-cmp-karma
Plugin for karma run multi-single page portal use grunt-cmp-builder

## Getting Started
This plugin requires Grunt `~0.4.2`

To use an cmp() object, you must use grunt-cmp-builder

## Tasks

### cmpKarma

load _bower.json, overrade dependencies from root _bower.json and generate bower.json
after load dependencies or update for bower.json

        cmpKarma: {
            options: {
                colors: true,
                port: 9876,
                runnerPort: 9999,
                browsers: ['Chrome'],
                frameworks: ['jasmine'],
                plugins: [
                    'karma-phantomjs-launcher',
                    'karma-chrome-launcher',
                    'karma-jasmine'
                ],
                basePath: '<%=params.build %>',
                autoWatch: false,
                //singleRun: true,
                logLevel: 'DEBUG'

            },
            unit: {
                options:{
                    files: [
                        '../bower_components/angular-mocks/angular-mocks.js',
                        '../bower_components/angular-scenario/angular-scenario.js',
                        '<%=cmp().getArrayScripts(\'\', \'path\', [\'main\', \'unit\']) %>'
                    ]
                }
            }
        }

run task

    cmpKarma:unit:{path}

For example

> grunt cmpKarma:unit

> grunt cmpKarma:unit:./app.index
