See http://blog.erikxiv.com/home-project-workflow/

# Time to start cracking

##### Install
```
# Install ember command-line interface
npm install -g ember-cli
# Create new ember app
ember new hello-ember
cd hello-ember
```

Note: Installation of ember is not part of the [Friendly requirements](/home-project-workflow), but I'm thinking it will not be required to run/develop the app later.

##### Try it out
```
# Start app
ember server
```
Opening a web browser to `http://localhost:4200` shows a tawdry *Welcome to Ember.js* text. Not so exhilirating, but it works.

A nicer surprise is that editing the code, well, changing the hello text, and saving automatically updates my browser view. Live reload seems to be built in.

##### Gulp it
Since live reload seems built in, all we need to at this stage is have gulp run the `ember start` command, right?
```
# Register gulp as a development dependency
npm install gulp --save-dev
npm install gulp-shell --save-dev
```
Type up a complicated `gulpfile.js`:
```
var gulp = require('gulp');
var shell = require('gulp-shell')

gulp.task('up', shell.task(['ember server']));
```
Success! Typing `gulp up` starts the ember app and refreshing my browser still displays a not-so-impressive site.

### Going the docker mile
Why? Primarily for later benefits, being able to use the same workflow for non-node-based applications. I also want to keep dependencies of locally installed tools/versions to a minimum and be able to use off-the-shelf dockerized services.

Not only do I want to use docker, I want to be able to start multiple docker images, such as both a web server and a database. In comes [Docker Compose](https://docs.docker.com/compose) (formerly known as Fig). Docker allows you to start containers, Docker Compose allows you to start multiple containers with a single command as well as connect these (e.g. web container can easily access database container without reverting to DNS, fixed IP-addresses and the like).

In this case it ought to be sufficient to use a single node container to run our ember example, but for the sake of completeness I will (1) use an existing [ember container](https://registry.hub.docker.com/u/geoffreyd/ember-cli/) (simplify our life, remember?) and use docker compose to create a standard for later projects.

##### Attempt #1
docker-compose.yml:
```
ember:
  image: geoffreyd/ember-cli
  volumes:
   - .:/usr/src/app
  ports:
   - "4200:4200"
   - "35729:35729"
  command: server --watcher polling
```
Starting with `docker-compose up`. It works, but... my CPU is running haywire. Not at all my docker experience so far (being impressed by how resource efficient it seems to be). Not OK. Google seems to indicate file watching through VM (boot2docker) might not be the best choice.

Changed `command: server --watcher polling` to `command: server`. Much better. Still slow in starting, and cpu-hungry initially, but quickly settles down into non-noticeable CPU usage digit. Unfortunately, now Sublime is running away. Trying [this](https://github.com/ember-cli/ember-cli/issues/722)...no good - still unacceptable slowness in the Sublime awesomeness. Not only that - live reload of ember has stopped working, together with manual reload. 

##### Attempt #2
Instead of hurling myself into figuring out why file watching for [Ember](emberjs.org) and [Sublime Text](sublimetext.com) has issues with [Docker](docker.com) (or boot2docker), let's try another approach.

This time I'll use [nodemon](https://github.com/remy/nodemon), a tool that will restart my node server whenever files change. Not as sexy as live reload, but it will do the job. It also has the benefit of working for both server and client updates. Fine tuning can come later, if warranted.

docker-compose.yml:
```
node:
  image: fluciotto/nodemon
  volumes:
   - .:/usr/src/myapp
  ports:
   - "80:3000"
  working_dir: /usr/src/myapp
  command: nodemon app.js
```

Note the addition of a new server script. `app.js` is in this case the simplest of [express.js](expressjs.com) server scripts (web server that serves the static ember files):

```
var express = require('express');
var app = express();

app.use(express.static(__dirname + '/dist'));

app.get('*', function(req, res) {
    res.sendfile('./dist/index.html'); // load our public/index.html file
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
```

Trying again, `docker-compose up`. OK, pointing my browser to boot2docker shows the now familiar greeting, using Sublime to change the greeting...and nothing happens. Hmm, looking at console output from nodemon suggests that it doesn't monitor recursively into folders. Changing a file in the current directory confirms this, with a nice reload. Thinking one step further, I realize that I've pointed nodemon to the ember dist directory, if I make changes I need to trigger an ember build from my source files to the dist directory if I'm using this method. I also note that boot2docker (the virtual machine running Docker on my Mac) is pushing 70% cpu. As a comparison, replacing nodemon with standard node, boot2docker runs at a low 2% with the same example. We're not there just yet.

##### Attempt #3

New tack. Using the volume feature of Docker together with monitoring file changes is likely workable, but seems to have a few pitfalls that I will leave as-is for now. Instead of sharing a file directory between the main Docker container and the host, I'll *deploy* changed files to the container. My first idea is to perform a deployment as one would tend to perform to production environments, but since that would (1) require me to modify the Docker container to support some deployment mechanism, (2) would likely be slightly slower than one would want in a development workflow and (3) might work very differently for different technologies and produce different result. A simpler, I think, version would be to simply copy modified files to the container using Docker infrastructure. This is not so neat as I would like, but has the benefit of potentially using the various features of development tooling for different technologies (such as ember-cli above).

Unfortunately, Docker does not provide a copy-file-to-running-container feature out of the box. I could setup ssh on the container, but again, that would require modifying the container which I don't like. Instead I'll try a method suggested by some nice people on the Internet where the `docker exec` feature can be hacked to pipe a stream from the host to a command being executed on the container, e.g. such as writing to a file. In essence `cat file | docker exec -i containername sh -c 'cat > file'`.

This sadly took longer than expected (a smell), but I've now created a gulp module that can consume file changes and store these on a Docker container (disclaimer: will not work on Windows) and modified my `gulpfile.js` to (1) start by copying the dist-directory (compiled ember-app) to the container and (2) monitor for file changes to the app, when found `ember build` will be executed, producing modified files in the dist-directory (3) which are monitored and copied to the container.

Not as pretty as I wanted, but can surely be improved over time. Testing the setup, I can now modify files on my host, which after a few seconds (due to the build step put in between) will show in the browsed app. CPU is purring along on a sleepy level. Success, albeit way to many hours later.

See [GitHub](https://github.com/erikxiv/hello-ember) for the final solution.

###### Benefits
* I can use `gulp up`, and `Ctrl-C` as I wanted
* I almost kept my *Friendly* requirements (currently using ember build on the host, but should be easily remedied)
* Potential to use technology-specific features in the Docker containers
* No modification of the Docker images necessary
* Docker-compose in play for future additions of services

###### Drawbacks
* More complicated, and slower than wanted
* OS-dependent code (Docker-compose only seems to have a cli, requiring use of host executed commands)
* Going outside somewhat of both Docker and gulp paradigms

### Add project to GitHub
Following the [guide](https://help.github.com/articles/adding-an-existing-project-to-github-using-the-command-line/):
```
git init
git add .
git commit -m 'First commit'
git remote add origin git@github.com:erikxiv/hello-ember.git
git remote -v
git push origin master
```

### Deploy to UAT with Travis

OK, next step. I've been promised a fully-automated deploy to a production-like testing environment. Chosen tooling is [Heroku](heroku.com) and [Travis](travis-ci.org), the first due to familiarity, the second due to hip-factor, both due to being free and cloud-based for this particular project.

##### Get Travis talking
* Sign-up with GitHub...check
* Enable the helloember-project...check
* `.travis.yml`...hmm, google? Wait a minute. I already have a travis-file in my directory, likely created when generating the ember skeleton. Oh, well...check
* Push to GitHub