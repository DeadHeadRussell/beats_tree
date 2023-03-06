module.exports = {
  fetchAll: fetchAll,
  fetchOne: fetchOne
};


function fetchAll(res) {
  return res.rows;
}

function fetchOne(res) {
  if (res.rows.length != 1) {
    throw new Error(`Expected 1 row, found ${res.rows.length}`);
  }
  return res.rows[0];
}

function fetchNone(res) {
  return null;
}

