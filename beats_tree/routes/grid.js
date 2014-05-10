var express = require('express');
var router = express.Router();

var grid = [];
var num_rows = 8;
var num_columns = 8 * 4;
for (var i = 0; i < num_rows; i++) {
  var row = [];
  for (var j = 0; j < num_columns; j++) {
    row.push(0);
  }
  grid.push(row);
}

router.get('/', function(req, res) {
  res.send({ grid: grid });
});

router.post('/', function(req, res) {
  var x = req.body.x;
  var y = req.body.y;
  var value = req.body.value === 'true' ? 1 : 0;
  grid[x][y] = value;
  console.log(x, y, value);
  res.send({ 'status': 'success' });
});

module.exports = router;

