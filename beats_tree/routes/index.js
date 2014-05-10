var express = require('express');
var path = require('path');

var router = express.Router();

router.get('/', function(req, res) {
  res.render('index', {});
});

router.get('/partials/:name', function(req, res) {
  res.render(path.join('partials', req.params.name), {});
});

module.exports = router;
