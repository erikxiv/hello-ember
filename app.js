var express = require('express');
var app = express();

app.use(express.static(__dirname + '/dist'));
console.log('web path: ' + __dirname + '/dist');

app.get('/', function(req, res) {
    console.log('hello there');
    res.sendFile('./dist/index.html'); // load our public/index.html file
});

var port = process.env.PORT || 3000;
var server = app.listen(port, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});