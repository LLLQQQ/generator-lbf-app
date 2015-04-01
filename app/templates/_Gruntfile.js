
/**
 * Created by amos on 14-4-9.
 */
var path = require('path'),
    fs = require('fs'),
    MD5 = require('MD5'),
    get16MD5 =  function(content) {
        return MD5(content).split('').slice(8, 24).join('');
    },
    spriteLessTemplate = require('./grunt/sprite/lessTemplate');

var HENGINE_HTTP_PORT = 8081,
    HENGINE_TCP_PORT = 10001,
    HENGINE_HOSTNAME = '<%= dm%>';

module.exports = function(grunt){

    // load all grunt module starts with "grunt-"
    require('load-grunt-tasks')(grunt, {pattern: 'grunt-*'});

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        watch: {
            configFile: {
                files: ['Gruntfile.js'],
                options: {
                    reload: true
                }
            },

            scripts: {
                files: ['src/**/*.js'],
                // tasks: ['_release'], // 如果想要自动生成dist目录，将这段注释去掉
                options: {
                    spawn: false
                }
            },

            css: {
                files: ['src/themes/**/*.css']
            },

            less: {
                files: ['src/less/**/*.less'],
                tasks: ['less']
            },

            sprites: {
                files: ['src/less/**/*.png', 'Gruntfile.js', 'grunt/sprite/**/*'],
                tasks: ['sprite']
            },

            views: {
                files: ['src/views/**/*.html']
            },

            protoype: {
                files: ['dev/mockup/**/*.html']
            },

            test: {
                files: ['dev/page/**/*.json']
            },

            options: {
                livereload: true
            }
        },

        less: {
            dev: {
                options: {
                    paths: ['./']
                },
                files: {
                    './src/themes/default/base/base.css': './src/less/default/base/base.less',
                    './src/themes/default/main/style.css': './src/less/default/main/style.less'
                }
            }
        },

        sprite: {
            'base-icons': {
                src: 'src/less/default/base/icons/**/*.png',
                destImg: 'src/themes/default/base/images/icons.png',
                destCSS: 'src/less/default/base/icons.less',
                padding: 10,
                cssFormat: 'less',
                engine: 'phantomjs',

                // More information can be found below
                cssTemplate: spriteLessTemplate('base-icons.tmpl'),

                // OPTIONAL: Manual override for imgPath specified in CSS
                imgPath: 'images/icons.png',

                // OPTIONAL: Map variable of each sprite
                cssVarMap: function (sprite) {
                    // `sprite` has `name`, `image` (full path), `x`, `y`
                    //   `width`, `height`, `total_width`, `total_height`
                    // EXAMPLE: Prefix all sprite names with 'sprite-'
                    sprite.name = 'icon-' + sprite.name;
                }
            }           
        },

        localServer: {
            options: {
                server: {
                    port: 80
                },

                routes: [
                    ['/page', 'page', {
                        root: __dirname + '/dev/page/',
                        host: '127.0.0.1',
                        hostname: HENGINE_HOSTNAME,
                        port: HENGINE_HTTP_PORT
                    }],

                    ['/template', 'template', {
                        host: '127.0.0.1',
                        hostname: HENGINE_HOSTNAME,
                        port: HENGINE_HTTP_PORT
                    }],

                    ['/mockup', 'static', {
                        root: 'dev/mockup'
                    }],


                    ['/static_proxy', 'static', {
                        root: 'src'
                    }],

                    // 预先移除js文件当中的版本号，
                    // 即如果是a-253124basdfasg20141105.js -> a.js
                    ['/static_proxy', 'removeVersion', {
                        root: 'src'
                    }],


                    ['/', 'cgi', {
                        env: 'local',
                        root: __dirname + '/dev/cgi/'
                    }]
                ]
            }
        },

        'hengine-http': {
            // override hengine options in config file
            options: {
                // override hengine options in config file
                port: HENGINE_HTTP_PORT,
                // setup env
                env: 'local',
                // use debug mode
                debug: true,

                // setup dir
                root: __dirname + '/src',
                errorDirectory: 'errors',

                // use port instead path
                // for compatibility of window
                sock: HENGINE_TCP_PORT,

                // setup vhosts
                vhosts: function(){
                    var vhosts = {};

                    vhosts[HENGINE_HOSTNAME] = {
                        root: '/views'
                    };

                    return vhosts;
                }()
            }
        },

        'hengine-tcache': {
            // override hengine options in config file
            options: {
                // use port instead path
                // for compatibility of window
                sock: HENGINE_TCP_PORT,

                root: __dirname + '/src'
            }
        },

        concurrent: {
            dev: {
                tasks: ['hengine-tcache', 'hengine-http', 'localServer', 'watch'],
                options: {
                    limit: 10,
                    logConcurrentOutput: true
                }
            }
        },

        copy: {

            // copy src的文件至release处
            no304_copy_srcToRelease: {
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: '**',
                    dest: 'dist/',
                    filter: function (src) {
                        // 忽略views和less文件
                        if (src.indexOf('src/views') === 0 || src.indexOf('src/less') === 0 || src.indexOf('src\\views') === 0 || src.indexOf('src\\less') === 0) {
                            return false;
                        }

                        // 如果是以.md结尾，是介绍文件，不需要上线
                        if (path.extname(src) === '.md') {
                            return false;
                        }

                        return true;
                    }
                }]
            },

            // copy src的文件并以md5码结尾 至release处
            no304_copy_releaseDir: {
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: '**',
                    dest: 'dist/',
                    filter: function (src) {
                        // 忽略views和less文件
                        if (src.indexOf('src/views') === 0 || src.indexOf('src/less') === 0 || src.indexOf('src\\views') === 0 || src.indexOf('src\\less') === 0) {
                            return false;
                        }

                        // 如果是以.md结尾，是介绍文件，不需要上线
                        if (path.extname(src) === '.md') {
                            return false;
                        }

                        return true;
                    },
                    rename: function (dest, src) {

                        var srcDir = 'src/';

                        // is folder
                        if (fs.statSync(srcDir + src).isDirectory()) {
                            return dest + src;
                        }

                        // 对于js
                        if (path.extname(src) === '.js') {
                            // a.js => a.r{$hash}.js
                            return dest + path.dirname(src) + '/' + path.basename(src).split('.')[0] +
                                '-' + get16MD5(fs.readFileSync(srcDir + src)) + '.js';
                        }

                        return dest + src;
                    }
                }]
            }
        },

        clean: {

            // 清空dist里的所有文件和文件夹
            no304_clean_release: {
                src: ['dist/*']
            },

            // 删除部分文件
            no304_clean_deleteReleaseFiles: {
                src: 'dist'
            }
        },

        no304_release: {
            options: {

                // 生成deps 至 exportFilePath处
                no304_generateDeps: {
                    options: {
                        'src': __dirname + '/src',
                        'exportFilePath': __dirname + '/globalDeps.json'
                    }
                },

                // 根据exportFilePath处的globalDeps.jsony文件，生成alias
                // 并将alias和上一步生成的deps输出至localsJson处
                no304_outputAliasDeps: {
                    options: {
                        'root':  __dirname,

                        // 代码的根目录
                        'src': __dirname + '/src',

                        // deps file
                        'depsFilePath': '<%%= no304_release.options.no304_generateDeps.options.exportFilePath %>',

                        // 模板框架在本地的根目录
                        'hengineRoot': __dirname + '/src/views',

                        // lbf.config的模块化文件的前缀, staticPrefix为前缀的才认为是本项目资源，
                        // 否则认为是lbf自己的资源
                        'staticPrefix': ['<%= appname%>'],

                        // 生成的locasJson的地址
                        'localsJson': __dirname + '/src/views/locals.json'
                    }
                }
            },

            release: {

            }
        }
    });


    grunt.registerTask('dev', 'launch web server and watch tasks', ['concurrent:dev']);
    grunt.registerTask('release', 'release src to release dir', ['no304_release']);

    // don't call it by yourself, it will be called with watch event
    grunt.registerTask('_release', 'release src to release dir', ['_no304_release']);

};
