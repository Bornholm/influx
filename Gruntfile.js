
module.exports = function(grunt) {

  var NW_VERSION = '0.9.2';

  grunt.initConfig({

    run: {
      options: {
        nwArgs: ['.']
      }
    }

  });

  grunt.registerTask('influx:run', ['download', 'run']);

  grunt.loadNpmTasks('grunt-nw');

};