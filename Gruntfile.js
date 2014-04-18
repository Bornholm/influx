/* jshint node: true */
var _ = require('lodash');
var path = require('path');

module.exports = function(grunt) {

  var NW_VERSION = '0.9.2';
  var BUILD_DIR = 'build';
  var BUILD_TARGETS = {
    linux_ia32: true,
    linux_x64: true,
    win: true,
    osx: false
  };
  var PKG = grunt.file.readJSON('package.json');
  var PKG_OVERWRITE = {
    window: {
      toolbar: false
    }
  };

  // Définition des options de build
  var buildOptions = _.merge({
    runtimeVersion: NW_VERSION
  }, BUILD_TARGETS);

  // Définition des fichiers à copier pour la build
  var appFiles = [];
  _(BUILD_TARGETS).forEach(function(isEnabled, target) {
    if(isEnabled) {
      var arch = 'ia32';
      var platform = target;
      if(platform.indexOf('linux') !== -1) {
        arch = platform.split('_')[1];
        platform = 'linux';
      }
      var dirName = PKG.name + '-' + PKG.version + '-' + platform + '-' + arch;
      var destPath = path.join(BUILD_DIR, dirName + '/');
      // Ajout des dépendances d'Influx
      var modules = _.keys(PKG.dependencies).map(function(moduleName) {
        return path.join('node_modules', moduleName, '**');
      });
      appFiles.push({src: modules, dest: destPath});
      // Ajout fichiers principaux
      appFiles.push({src: [
        'package.json', 'index.html',
        'templates/**', 'lib/**',
        'img/**', 'style/**',
        'bower_components/**',
        ], 
        dest: destPath
      });
    }
  });

  // Configure tasks
  grunt.initConfig({

    pkg: PKG,
    
    run: {
      options: {
        nwArgs: ['.'],
        runtimeVersion: NW_VERSION
      }
    },

    build: {
      options: buildOptions
    },

    clean: {
      build: [BUILD_DIR]
    },

    copy: {
      build: {
        files: appFiles,
        options: {
          noProcess: ['**','!package.json'],
          process: function(content, srcPath) {
            var pkg = _.merge(PKG, PKG_OVERWRITE);
            return JSON.stringify(pkg, null, 2);
          }
        }
      }
    }

  });

  grunt.registerTask('influx:run',  ['download', 'run']);
  grunt.registerTask('influx:build',  ['download', 'clean:build', 'build', 'copy:build']);
  grunt.registerTask('default', ['influx:run']);

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-nw');

};