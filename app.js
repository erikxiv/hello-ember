var express = require('express');
var app = express();

app.use(express.static(__dirname + '/dist'));

app.get('*', function(req, res) {
    res.sendfile('./dist/index.html'); // load our public/index.html file
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app2 listening at http://%s:%s', host, port);

});