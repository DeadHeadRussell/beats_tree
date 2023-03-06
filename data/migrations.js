const migrations = [
  `
    CREATE TABLE IF NOT EXISTS trees (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS tracks (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tree_id INT NOT NULL,
      previous_track_id INT,
      FOREIGN KEY (tree_id) REFERENCES trees (id),
      FOREIGN KEY (previous_track_id) REFERENCES tracks (id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS audio (
      id SERIAL PRIMARY KEY,
      content BYTEA NOT NULL,
      track_id INT NOT NULL,
      FOREIGN KEY (track_id) REFERENCES tracks (id)
    )
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS audio_track_id_uniq
    ON audio (track_id)
  `,
  `
    ALTER TABLE audio
    ADD COLUMN IF NOT EXISTS mimetype text
  `
];


function run(pool) {
  return migrations.reduce(
    (promise, migration) => promise
      .then(() => pool.query(migration)),
    Promise.resolve()
  );
}


module.exports = {
  run: run
};

