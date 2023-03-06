var express = require('express');

var tracks = require('../data/tracks');
var trees = require('../data/trees');

var router = express.Router();

router.post('/trees', function(req, res, next) {
  var data = {
    name: req.body.name
  };

  trees.Create(data, req.db)
    .then(tree => res.send(tree))
    .catch(next);
});

router.get('/trees', function(req, res, next) {
  trees.Read(req.db)
    .then(trees => res.send(trees))
    .catch(next);
});

router.get('/trees/:id', function(req, res, next) {
  trees.ReadOne(parseInt(req.params.id), req.db)
    .then(tree => res.send(tree))
    .catch(next);
});

router.get('/trees/:id/tracks', function(req, res, next) {
  tracks.ReadForTree(parseInt(req.params.id), req.db)
    .then(tracks => res.send(tracks))
    .catch(next);
});

router.post('/trees/:id/tracks', function(req, res, next) {
  const data = {
    name: req.body.name,
    previous_track_id: req.body.previous_track_id || null,
    tree_id: req.params.id
  };
  const audio_data = Buffer.from(req.body.audio, 'base64');
  tracks.Create(data, req.db)
    .then(track =>
      tracks.UpdateAudio(track.id, audio_data, req.body.mimetype, req.db)
        .then(() => res.send(track))
    )
    .catch(next);
});

router.put('/trees/:id', function(req, res, next) {
  var data = {
    name: req.body.name,
    tempo: req.body.tempo
  };

  trees.Update(parseInt(req.params.id), data, req.db)
    .then(tree => res.send(tree))
    .catch(next);
});

router.delete('/trees/:id', function(req, res, next) {
  trees.Delete(parseInt(req.params.id), req.db)
    .then(() => res.send())
    .catch(next);
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
  tracks.ReadOne(req.params.id, req.db, function(track) {
    res.send(track);
  }, next);
});

router.get('/tracks/:id/audio', function(req, res, next) {
  tracks.GetAudio(req.params.id, req.db)
    .then(data => res.send({audio: data.content.toString('base64')}))
    .catch(next);
});

router.put('/tracks/:id', function(req, res, next) {
  var data = {
    name: req.body.name
  };

  tracks.Update(req.params.id, data, req.db, function(track) {
    res.send(track);
  }, next);
});

router.put('/tracks/:id/audio', function(req, res, next) {
  var audio_content = Buffer.from(req.body.audio, 'base64');
  tracks.UpdateAudio(req.params.id, audio_content, '', req.db)
    .then(() => res.send())
    .catch(next);
});

router.delete('/tracks/:id', function(req, res, next) {
  tracks.Delete(req.params.id, req.db, function() {
    res.send();
  }, next);
});

module.exports = router;

