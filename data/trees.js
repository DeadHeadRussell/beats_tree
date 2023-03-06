const {fetchAll, fetchOne} = require('./utils');

function Create(data, db) {
  const CREATE_QUERY = `
    INSERT INTO trees (name)
    VALUES ($1)
    RETURNING *
  `;
  const values = [data.name];
  return db.query(CREATE_QUERY, values).then(fetchOne);
}

function Read(db) {
  const READ_QUERY = 'SELECT * FROM trees';
  return db.query(READ_QUERY).then(fetchAll);
}

function ReadOne(id, db) {
  const READ_QUERY = 'SELECT * FROM trees WHERE id = $1';
  const values = [id];
  return db.query(READ_QUERY, values).then(fetchOne);
}

function Update(id, data, db) {
  const UPDATE_QUERY = 'UPDATE trees SET name = $2 WHERE id = $1';
  const values = [id, data.name];
  return db.query(UPDATE_QUERY, values).then(fetchOne);
}

function Delete(id, db) {
  throw new Error('Not implemented.')
}

module.exports = {
  Read: Read,
  ReadOne: ReadOne,
  Create: Create,
  Update: Update,
  Delete: Delete
};

