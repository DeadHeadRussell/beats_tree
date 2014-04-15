var express = require('express');
var app = express();

app.get('/', function(req, res) {
  // send main page.
});

app.get('/record/new', function(req, res) {
  // create new tree
});

app.get('/record/random', function(req, res) {
});

app.get('/record/branch/:id', function(req, res) {
  var id = req.params.id;
});



