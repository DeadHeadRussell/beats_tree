var grid = null;
/*
var beats_tree = angular.module('beats_tree', []);
beats_tree.controller('Editor', function($scope, $http) {
  if (beat_tree.track_ids.length > 0) {
    $http.get('/grids', {
      'data': beat_tree.track_ids
    }).success(function(data) {
      $scope.tracks = data;
    });
  }

  $scope.tracks = [
    { content: 'test', id: 1 },
    { content: 'ss', id: 10}
  ];
});
*/

$(function() {
  grid = createGrid();
  $('#grid').append(grid.getDiv());
  grid.play();
  grid.startUpdating();

  function createGrid() {
    var root = $('<div>');

    var num_rows = 8;
    var num_columns = 8 * 4;

    var grid = [];
    var cells = [];

    sines = [261.626, 293.665, 329.628, 349.228, 391.995, 440.000, 493.883, 523.251];
    for (var i = 0; i < num_rows; i++) {
      sines[i]  = T("sin", {freq: sines[i], mul: 0.5});
    }

    for (var i = -1; i < num_rows; i++) {
      var row = $('<div>', { 'class': 'grid_row' });
      var grid_row = [];
      var cell_row = [];

      for (var j = 0; j < num_columns; j++) {
        if (i == -1) {
          var cell = $('<div>', { 'class': 'grid_top' });
          row.append(cell);
        } else {
          var cell = $('<div>', { 'class': 'grid_cell' });
          cell.click(clickCell(cell, i, j));
          row.append(cell);
          grid_row.push(0);
          cell_row.push(cell);
        }
      }

      root.append(row);
      grid.push(grid_row);
      cells.push(cell_row);
    }

    return {
      getDiv: function() { return root; },
      play: play,
      startUpdating: startUpdating,
      stopUpdating: stopUpdating
    };

    function play() {
      var top_row = $(root.children()[0]);
      var rows = root.children('.grid_row');
      var tempo = beat_tree.tempo;
      var beat = -1;
      var spb = 60 / tempo * 1000;
      setInterval(playNext, spb / 2);

      function playNext() {
        var previous = beat;
        beat = (beat + 1) % num_columns;

        $(top_row.children()[previous]).toggleClass('on');
        $(top_row.children()[beat]).toggleClass('on');

        rows.children('.playing').toggleClass('playing');
        rows.children('.on:nth-child(' + (beat+1) + ')').addClass('playing');

        for (var i = 0; i < num_rows; i++) {
          if (grid[i][beat]) {
            sines[i].play();
          } else {
            sines[i].pause();
          }
        }
      }
    }

    var update_id = null;

    function startUpdating() {
      if (update_id) {
        return;
      }

      update_id = setInterval(function() {
        $.getJSON('/grid', function(data) {
          if (data.error) {
            console.log(error);
          } else {
            for (var i = 0; i < num_rows; i++) {
              for (var j = 0; j < num_columns; j++) {
                if (data.grid[i][j]) {
                  cellOn(i, j);
                } else {
                  cellOff(i, j);
                }
              }
            }
          }
        });
      }, 1000);
    }

    function stopUpdating() {
      stopInterval(update_id);
      update_id = null;
    }

    function clickCell(cell, i, j) {
      return function(evt) {
        cell.toggleClass('on');
        grid[i][j] = !grid[i][j];
        saveCell(i, j, grid[i][j]);
      }
    }

    function cellOn(i, j) {
      $(cells[i+1][j]).addClass('on');
      grid[i][j] = 1;
    }

    function cellOff(i, j) {
      $(cells[i+1][j]).removeClass('on');
      grid[i][j] = 0;
    }

    function saveCell(x, y, value) {
      $.post('/grid', { x:x, y:y, value:value }, function(data) {
        if (data.error) {
          console.log(data.error);
        } else {
          console.log(x, y, 'saved');
        }
      });
    }
  }
});

