var gulp = require('gulp');
var shell = require('gulp-shell')

gulp.task('up', shell.task([
  'eval "$(boot2docker shellinit)"', // Init boot2docker if on mac
  'ember server']));