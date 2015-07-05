var gulp = require('gulp');
var watch = require('gulp-watch');
var docker = require('gulp-docker-dest');
var child_process = require('child_process')

var boot2dockerWasRunning = false;

//////
// Get development environment up and running
//////
gulp.task('up', ['watch'], function() {
  // If on Mac, start boot2docker if needed
  if (process.platform === 'darwin') {
    var b2dstatus = child_process.spawnSync('boot2docker', ['status'], { stdio: 'pipe' })
    boot2dockerWasRunning = b2dstatus.stdout.toString().indexOf('running') === 0;
    if (! boot2dockerWasRunning) {
      console.log('Starting boot2docker (was not running)');
      child_process.spawnSync('boot2docker', ['up'], { stdio: 'inherit' });
    }
    child_process.spawnSync('eval', ['"$(boot2docker shellinit)"'], { stdio: 'pipe' });  
  }
  // Start docker-compose
  console.log('Starting docker-compose');
  child_process.spawnSync('docker-compose', ['start'], { stdio: 'inherit' });  
});

//////
// Catch Ctrl-C to clean up
//////
process.on('SIGINT', function() {
  // Stop docker-compose
  console.log('Stopping docker-compose');
  child_process.spawnSync('docker-compose', ['stop'], { stdio: 'pipe' });
  // Stop boot2docker if it wasn't running
  if (process.platform === 'darwin' && ! boot2dockerWasRunning) {
    console.log('Stopping boot2docker');
    child_process.spawnSync('boot2docker', ['down'], { stdio: 'pipe' });
  }
  // Quit
  process.exit();
});

////
// Build ember app
////
gulp.task('build', function(cb) {
  child_process.exec('ember build', cb);
})


//////
/// Watch for changes
//////
gulp.task('watch', function() {
  gulp
  .src('dist/**')
  .pipe(docker.dest({container:'helloember_node_1', remotePath: '/usr/share/nginx/html/'}));

  gulp.watch('app/**/*', ['build']);

  watch('dist/**', function(file) {
    if (file.event === 'unlink') {
      docker.exec('helloember_node_1', 'rm /usr/share/nginx/html/'+file.relative);
    }
    else {
      docker.cp('helloember_node_1', file.contents, '/usr/share/nginx/html/'+file.relative);
    }
  });
});
