module.exports = function(grunt) {
    grunt.initConfig({
        bower: {
            install: {
                options: {
                    targetDir: 'static/components'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-npm-install');
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.registerTask('schema', 'regenerate the schema', function() {
        var exec = require('child_process').exec;
        var cb = this.async();
        exec('mysql test -e "source sql/schema.mysql"',
             function(err, stdout, stderr) {
                console.log(stdout);
                if (err) { throw err; }
                cb();
             });
    });
    grunt.registerTask('populate', 'populate test data', function() {
        var exec = require('child_process').exec;
        var cb = this.async();
        exec('python test/sql/populate_test_data.py',
             function(err, stdout, stderr) {
                console.log(stdout);
                if (err) { throw err; }
                cb();
             });
    });

    grunt.registerTask('default', ['npm-install', 'bower:install', 'schema',
                                   'populate']);
};
