var express = require('express');
var multiparty = require('multiparty');

var tracks = require('../data/tracks');
var trees = require('../data/trees');

var router = express.Router();

router.post('/trees', function(req, res, next) {
  var data = {
    name: req.body.name,
    tempo: req.body.tempo
  };

  trees.Create(data, req.db, function(tree) {
    res.send(tree);
  }, next);
});

router.get('/trees', function(req, res, next) {
  var meta_data = req.param('meta_data') || false;
  trees.Read(req.db, meta_data, function(trees) {
    res.send(trees);
  }, next);
});

router.get('/trees/:id', function(req, res, next) {
  trees.ReadOne(req.params.id, req.db, function(tree) {
    res.send(tree);
  }, next);
});

router.put('/trees/:id', function(req, res, next) {
  var data = {
    name: req.body.name,
    tempo: req.body.tempo
  };

  trees.Update(req.params.id, data, req.db, function() {
    res.send();
  }, next);
});

router.delete('/trees/:id', function(req, res, next) {
  trees.Delete(req.params.id, req.db, function() {
    res.send();
  }, next);
});

router.post('/tracks', function(req, res, next) {
  var data = {
    previous: req.body.previous
  };

  if (!data.previous) {
    next('Each track needs to be forked from a previous track');
  }

  tracks.ReadOne(data.previous, {}, req.db, function(previous) {
    data.tree = previous.tree;
    tracks.Create(data, req.db, function(track) {
      res.send(track);
    }, next);
  });
});

router.get('/tracks', function(req, res, next) {
  tracks.Read(req.db, function(tracks) {
    res.send(tracks);
  }, next);
});

router.get('/tracks/:id', function(req, res, next) {
  var previous = req.param('previous') || false;
  var options = { previous: previous };
  tracks.ReadOne(req.params.id, options, req.db, function(track) {
    res.send(track);
  }, next);
});

router.put('/tracks/:id', function(req, res, next) {
  var data = {
    audio: req.body.audio,
  };

  tracks.Update(req.params.id, data, req.db, function() {
    res.send();
  }, next);
});

router.delete('/tracks/:id', function(req, res, next) {
  tracks.Delete(req.params.id, req.db, function() {
    res.send();
  }, next);
});

router.post('/tracks/:id/audio', function(req, res, next) {
  var data = {
    audio: req.body.audio
  };

  tracks.UpdateAudio(req.params.id, data, req.db, function() {
    res.send();
  }, next);
});

router.get('/tracks/:id/audio', function(req, res, next) {
  tracks.GetAudio(req.params.id, req.db, function(data) {
    res.send(data);
  }, next);
});

module.exports = router;

