const {fetchAll, fetchOne, fetchNone} = require('./utils');

function Create(data, db) {
  const CREATE_QUERY = `
    INSERT INTO tracks (name, previous_track_id, tree_id)
    VALUES ($1, $2, $3)
    RETURNING *
  `
  const values = [data.name, data.previous_track_id, data.tree_id];
  return db.query(CREATE_QUERY, values).then(fetchOne);
}

function Read(db) {
  const READ_QUERY = 'SELECT * FROM tracks';
  return db.query(READ_QUERY).then(fetchAll);
}

function ReadForTree(tree_id, db) {
  const READ_QUERY = `
    SELECT * FROM tracks
    WHERE tree_id = $1
  `;
  const values = [tree_id];
  return db.query(READ_QUERY, values).then(fetchAll);
}

function ReadOne(id, db) {
  const READ_QUERY = 'SELECT * FROM tracks WHERE id = $1';
  const values = [id];
  return db.query(READ_QUERY, values).then(fetchOne);
}

function Update(id, data, db) {
  const UPDATE_QUERY = `
    UPDATE tracks
    SET name = $2
    WHERE id = $1
    RETURNING *
  `;
  const values = [id, data.name];
  return db.query(UPDATE_QUERY, values).then(fetchOne);
}

function Delete(id, db) {
  throw new Error('Not implemented');
}

function UpdateAudio(id, audio, mimetype, db) {
  const UPDATE_QUERY = `
    INSERT INTO audio (track_id, content, mimetype)
    VALUES ($1, $2, $3)
    ON CONFLICT (track_id) DO UPDATE
    SET
      content = EXCLUDED.content,
      mimetype = EXCLUDED.mimetype
  `;
  const values = [id, audio, mimetype];
  return db.query(UPDATE_QUERY, values).then(fetchNone);
}

function GetAudio(id, db) {
  const READ_QUERY = 'SELECT * FROM audio WHERE track_id = $1';
  const values = [id];
  return db.query(READ_QUERY, values).then(fetchOne);
}

function DeleteAudio(id, db, success, error) {
  throw new Error('Not implemented');
}

module.exports = {
  Create: Create,
  Read: Read,
  ReadForTree: ReadForTree,
  ReadOne: ReadOne,
  Update: Update,
  Delete: Delete,
  UpdateAudio: UpdateAudio,
  GetAudio: GetAudio
};

function deleteAsync(db) {
  return function(id, callback) {
    Delete(id, db, function() {
      callback();
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

