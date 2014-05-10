var async = require('async');

var tracks = require('./tracks');

function Create(data, db, success, error) {
  data = validateData(data);
  if (typeof data == 'string') {
    return error(data);
  }

  var trees_collection = db.get('trees');
  trees_collection.insert(data).success(function(tree) {
    tracks.Create({ tree: tree._id }, db, function(track) {
      tree.root = track._id;
      Update(tree._id, tree, db, function() {
        tree.root = track;
        success(tree);
      }, function(err) {
        tracks.Delete(track._id, db, function() {}, function(err) {
          console.error('ERROR: Could not delete track (' + track._id + ')', err);
        });
        error(err);
      });
    }, function(err) {
      Delete(tree._id, db, function() {}, function(err) {
        console.error('ERROR: Could not delete tree (' + tree._id + ')', err);
      });
      error(err);
    });
  }).error(error);
}

function Read(db, meta_data, success, error) {
  var trees_collection = db.get('trees');
  trees_collection.find({}).success(function(trees) {
    if (!trees) {
      return success([]);
    }

    if (meta_data) {
      return success(trees);
    }

    async.map(trees, parseTree(db), function(err, trees) {
      if (err) {
        error(err);
      } else {
        success(trees);
      }
    });
  }).error(error);;
}

function ReadOne(id, db, success, error) {
  var trees_collection = db.get('trees');
  trees_collection.findOne({ _id: id }).success(function(tree) {
    if (!tree) {
      return error({
        status: 404,
        message: 'Could not find tree _id "' + id + '"'
      });
    }

    parseTree(db)(tree, function(err, tree) {
      if (err) {
        next(err);
      } else {
        success(tree);
      }
    });
  }).error(error);
}

function Update(id, data, db, success, error) {
  data = validateData(data);
  if (typeof data == 'string') {
    return error(data);
  }

  var trees_collection = db.get('trees');
  trees_collection.update({ _id: id }, { $set: data }).success(success).error(error);
}

function Delete(id, db, success, error) {
  var trees_collection = db.get('trees');

  ReadOne(id, db, function(tree) {
    tracks.Delete(tree.root, db, function() {}, function(err) {
      console.error('ERROR: Could not delete track (' + tree.root + ')', err);
    });

    trees_collection.remove({ _id: id }).success(success).error(error);
  }, error);
}

module.exports = {
  Read: Read,
  ReadOne: ReadOne,
  Create: Create,
  Update: Update,
  Delete: Delete
};

function parseTree(db) {
  return function(tree, callback) {
    tracks.ReadRecursive(tree.root, db, function(track) {
      tree.root = track;
      callback(null, tree);
    }, function(err) {
      callback(err);
    });
  };
}

function validateData(dirty_data) {
  var data = { name: '', tempo: 120 };

  if (typeof dirty_data.name == 'string') {
    data.name = dirty_data.name;
  } else if ('name' in dirty_data) {
    return 'Invalid "name", it must be a string';
  }

  dirty_data.tempo = parseInt(dirty_data.tempo, 10);
  if (dirty_data.tempo >= 60 && dirty_data.tempo <= 180) {
    data.tempo = dirty_data.tempo;
  } else if ('tempo' in dirty_data) {
    return 'Invalid "tempo", it must be between 60 and 180';
  }

  if (dirty_data.root) {
    // TODO: Actually check if this is a valid ID.
    data.root = dirty_data.root;
  }

  return data;
}

