var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  var id = req.param('id');
  var db = req.db;

  var collection = db.get('trees');
  collection.findOne({ _id: id }).on('success', function(doc) {
    if (doc) {
      if (!doc.track_ids) {
        doc.track_ids = [1];
      }
      res.render('editor', { 'title': 'Editor', 'id': 'editor', 'data': doc });
    } else {
      next();
    }
  }).on('error', function(err) {
    res.render('error', { 'message': 'MongoDB Error', 'error': err });
  });
});

module.exports = router;

