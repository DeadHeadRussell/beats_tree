var async = require('async');
var fs = require('fs');

var trees = null;

function Create(data, db, success, error) {
  data = validateData(data);
  if (typeof data == 'string') {
    return error(data);
  }

  var tracks_collection = db.get('tracks');
  tracks_collection.insert(data).success(function(track) {
    addNext(track.previous, track._id, db, function(previous_track) {
      success(track);
    }, function(err) {
      Delete(track._id, db, function() {}, function(err) {
        console.error('ERROR: Could not delete track (' + track._id + ')', err);
      });
      error(err);
    });
  }).error(error);
}

function Read(db, success, error) {
  var tracks_collection = db.get('tracks');
  tracks_collection.find({}).success(function(tracks) {
    if (!tracks) {
      return success([]);
    }

    async.map(tracks, getMetaData(db), function(err, tracks) {
      if (err) {
        return error(err);
      }
      success(tracks);
    });
  }).error(error);
}

function ReadOne(id, options, db, success, error) {
  options.previous_count = options.previous_count || 1;
  var tracks_collection = db.get('tracks');
  tracks_collection.findOne({ _id: id }).success(function(track) {
    if (!track) {
      return error({
        status: 404,
        message: 'Could not find track _id "' + id + '"'
      });
    }

    getMetaData(db)(track, function(err, track) {
      if (err) {
        return error(err);
      }

      if (options.previous && track.previous && options.previous_count < 4) {
        ReadOne(track.previous, options, db, function(previous_track) {
          track.previous = previous_track;
          success(track);
        }, error);
      } else {
        track.previous = null;
        success(track);
      }
    });
  }).error(error);
}

function ReadRecursive(id, db, success, error) {
  var tracks_collection = db.get('tracks');
  tracks_collection.findOne({ _id: id }).success(function(track) {
    if (!track) {
      console.error('ERROR: Recursive read of track failed _id "' + id + '"');
      return success(track);
    }

    async.map(track.next, readAsync(db), function(err, tracks) {
      if (err) {
        return error(err);
      }
      track.next = tracks;
      success(track);
    });
  }).error(error);
}

function Update(id, data, db, success, error) {
  var tracks_collection = db.get('tracks');
  tracks_collection.update({ _id: id }, { $set: data }).success(success).error(error);
}

function Delete(id, db, success, error) {
  var tracks_collection = db.get('tracks');
  ReadOne(id, {}, db, function(track) {
    async.map(track.next, deleteAsync(db), function(err) {
      if (err) {
        return error(err);
      }

      DeleteAudio(id, db, function() {}, function(err) {
        console.error('ERROR: Could not delete audio object');
      });

      tracks_collection.update({ _id: track.previous }, { $pull: { next: track._id }}).success(function() {
        tracks_collection.remove({ _id: id }).success(success).error(error);
      }).error(error);
    });
  }, error);
}

function UpdateAudio(id, data, db, success, error) {
  var audio_collection = db.get('audio');
  audio_collection.update({ _id: id}, { $set: data }, { upsert: true }).success(success).error(error);
}

function GetAudio(id, db, success, error) {
  var audio_collection = db.get('audio');
  audio_collection.findOne({ _id: id }).success(success).error(error);
}

function DeleteAudio(id, db, success, error) {
  var audio_collection = db.get('audio');
  audio_collection.remove({ _id: id }).success(success).error(error);
}

module.exports = {
  Create: Create,
  Read: Read,
  ReadOne: ReadOne,
  ReadRecursive: ReadRecursive,
  Update: Update,
  Delete: Delete,
  UpdateAudio: UpdateAudio,
  GetAudio: GetAudio
};

function readAsync(db) {
  return function(id, callback) {
    ReadRecursive(id, db, function(track) {
      callback(null, track);
    }, function(err) {
      callback(err);
    });
  };
}

function deleteAsync(db) {
  return function(id, callback) {
    Delete(id, db, function() {
      callback();
    }, function(err) {
      callback(err);
    });
  };
}

function getMetaData(db) {
  return function(track, callback) {
    if (!trees) {
      trees = require('./trees');
    }

    trees.ReadOne(track.tree, db, function(tree) {
      track.name = tree.name;
      track.tempo = tree.tempo;
      callback(null, track);
    }, function(err) {
      callback(err);
    });
  };
}

function validateData(dirty_data) {
  var data = { audio: null, tree: null, previous: null, next: [] };

  // XXX: Hrm, good input checks.
  if (dirty_data.audio) {
    data.audio = dirty_data.audio;
  }

  // TODO: Check if these are actually IDs.
  if (dirty_data.tree) {
    data.tree = dirty_data.tree;
  }
  if (dirty_data.previous) {
    data.previous = dirty_data.previous;
  }

  if (dirty_data.next instanceof Array) {
    for (var i = 0; i < dirty_data.next.length; i++) {
      var next = dirty_data.next[i];
      data.next.push(next);
    }
  } else if ('next' in dirty_data) {
    return 'Invalid "next" array';
  }

  return data;
}

function addNext(id, next, db, success, error) {
  var tracks_collection = db.get('tracks');
  tracks_collection.update({ _id: id }, { $addToSet: { next: next }}).success(success).error(error);
}

