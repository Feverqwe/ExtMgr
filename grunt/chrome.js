/**
 * Created by Anton on 07.08.2016.
 */
exports.run = function (grunt) {
    var monoParams = {
        browser: 'chrome'
    };

    grunt.config.merge({
        compress: {
            chrome: {
                options: {
                    mode: 'zip',
                    archive: '<%= output %><%= vendor %>../<%= buildName %>.zip'
                },
                files: [{
                    cwd: '<%= output %><%= vendor %>',
                    expand: true,
                    filter: 'isFile',
                    src: '**',
                    dest: ''
                }]
            }
        }
    });

    grunt.registerTask('chromeManifest', function() {
        var manifestPath = grunt.template.process('<%= output %><%= vendor %>manifest.json');
        var content = grunt.file.readJSON('src/manifest.json');
        content.version = grunt.config('pkg.extVersion');
        grunt.file.write(manifestPath, JSON.stringify(content, null, 4));
    });

    grunt.registerTask('chrome', function () {
        grunt.config('monoParams', monoParams);

        grunt.config.merge({
            browser: 'chrome',
            vendor: 'chrome/src/',
            libFolder: 'js/',
            dataJsFolder: 'js/',
            includesFolder: 'includes/',
            dataFolder: '',
            buildName: 'extMgr_<%= pkg.extVersion %>'
        });

        grunt.task.run([
            'extensionBase',
            'buildJs',
            'chromeManifest',
            'compress:chrome'
        ]);
    });
};