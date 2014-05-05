var express = require('express');

var router = express.Router();

router.get('/tracks', function(req, res) {
  var db = req.db;
  var trees = db.get('trees');
  trees.find({}).on('success', function(results) {
    res.send({ tracks: results });
  }).on('error', function(err) {
    res.send({ error: err });
  });
});

router.get('/tracks/:id', function(req, res) {
  var db = req.db;
  var id = req.params.id;
  var trees = db.get('trees');
  trees.findOne({ _id: id }).on('success', function(result) {
    res.send({ track: result });
  }).on('error', function(err) {
    res.send({ error: err });
  });
});

router.post('/tracks', function(req, res) {
  var db = req.db;
  var tempo = req.param('tempo');

  if (tempo < 60 || tempo > 180) {
    return res.send({ error: 'Invalid tempo: ' + tempo });
  }

  var grid = createGrid();
  var previous = [];

  var collection = db.get('trees');
  collection.insert({ tempo: tempo, grid: grid, previous: previous }).on('success', function(result) {
    res.send({ track: result });
  }).on('error', function(err) {
    res.send({ error: err });
  });
});

router.post('/tracks/:id', function(req, res) {
  var db = req.db;
  var previous_id = req.params.id;

  var grid = createGrid();

  var trees = db.get('trees');
  trees.findOne({ _id: previous_id }).on('success', function(track) {
    if (track) {
      var tempo = track.tempo;
      var previous = track.previous || [];
      previous.push(previous_id);
      while (previous.length > 4) {
        previous.shift();
      }
      trees.insert({ tempo: tempo, grid: grid, previous: previous }).on('success', function(result) {
        res.send({ track: result });
      }).on('error', function(err) {
        res.send({ error: err });
      });
    } else {
      res.send({ error: 'Track id (' + previous_id + ') does not exist' });
    }
  }).on('error', function(err) {
    res.send({ error: err });
  });
});

router.put('/tracks/:id', function(req, res) {
  var db = req.db;
  var id = req.params.id;

  var x = req.body.x;
  var y = req.body.y;
  var value = req.body.value;

  var trees = db.get('trees');
  var update = {};
  update['grid.' + x + '.' + y] = value;
  trees.update({ _id: id }, { $set: update }).on('success', function() {
    res.send({ status: 'success' });
  }).on('error', function(error) {
    res.send({ error: err });
  });
});

function createGrid() {
  var grid = [];
  var number_rows = 8;
  var number_cols = 8 * 4;
  for (var i = 0; i < number_rows; i++) {
    var row = [];
    for (var j = 0; j < number_cols; j++) {
      row.push(0);
    }
    grid.push(row);
  }
  return grid;
}

module.exports = router;

