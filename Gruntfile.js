module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: {
            output: [
                '<%= output %>/*'
            ]
        },
        copy: {
            background: {
                cwd: 'src/js/',
                expand: true,
                src: [
                    'bg.js'
                ],
                dest: '<%= output %><%= vendor %><%= libFolder %>'
            },

            dataJs: {
                cwd: 'src/js/',
                expand: true,
                src: [
                    'popup.js'
                ],
                dest: '<%= output %><%= vendor %><%= dataJsFolder %>'
            },

            locales: {
                cwd: 'src/',
                expand: true,
                src: '_locales/**',
                dest: '<%= output %><%= vendor %><%= dataFolder %>'
            },

            baseData: {
                cwd: 'src/',
                expand: true,
                src: [
                    'css/**',
                    'img/**',
                    'popup.html'
                ],
                dest: '<%= output %><%= vendor %><%= dataFolder %>'
            }
        },
        output: '<%= pkg.outputDir %>'
    });

    grunt.registerTask('monoPrepare', function() {
        "use strict";
        var config = grunt.config('monoParams') || {};
        var monoPath = './src/vendor/mono/' + config.browser + '/mono.js';

        var content = grunt.file.read(monoPath);
        var utils = grunt.file.read('./src/js/monoUtils.js');

        content = content.replace(/\/\/@insert/, utils);

        var path = grunt.template.process('<%= output %><%= vendor %><%= dataJsFolder %>');
        var fileName = 'mono.js';
        grunt.file.write(path + fileName, content);
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');

    grunt.registerTask('extensionBase', ['copy:background', 'copy:dataJs', 'copy:baseData', 'copy:locales']);
    grunt.registerTask('buildJs', ['monoPrepare']);

    require('./grunt/chrome.js').run(grunt);

    grunt.registerTask('default', [
        'clean:output',
        'chrome'
    ]);
};