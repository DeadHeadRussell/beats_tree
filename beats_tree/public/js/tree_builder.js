function buildTree($scope, elem, click_callback, built_callback) {
  if (!$scope.tree.root) {
    return;
  }

  function callback(track) {
    if (selected_track == track) {
      selected_track = null;
      track.box.animate({ 'stroke-width': 2 }, 400);
    } else {
      if (selected_track) {
        selected_track.box.animate({ 'stroke-width': 2 }, 400);
      }
      track.box.animate({ 'stroke-width': 4 }, 400);
      selected_track = track;
    }
    click_callback(selected_track);
  }

  var selected_track = null;

  var line_colour = Raphael.getColor();
  Raphael.getColor();
  var box_colour = Raphael.getColor();
  var box = {
    width: 250,
    height: 120,
    w: 180,
    h: 60,
    r: 5
  };

  var total_nodes = 0;
  var number_of_layers = 0;
  var biggest_layer = 0;

  var root = [ $scope.tree.root ];
  parseTree(root);

  var size = {
    width: number_of_layers * box.width,
    height: biggest_layer * box.height
  };

  var r = Raphael(elem, size.width, size.height);
  createShapes(root);
  moveShapes(root, 0);
  connectShapes(root);

  built_callback(total_nodes);

  function parseTree(nodes) {
    number_of_layers++;
    var next_nodes = [];
    $.each(nodes, function(i, node) {
      if (!node) { return; }
      total_nodes++;
      if (node.next) {
        next_nodes = next_nodes.concat(node.next);
      }
    });

    biggest_layer = Math.max(nodes.length, biggest_layer);

    if (next_nodes.length > 0) {
      parseTree(next_nodes);
    }
  }

  function createShapes(nodes) {
    var next_nodes = [];
    $.each(nodes, function(i, node) {
      if (!node) { return; }
      node.box = createBox(node);
      if (node.next) {
        next_nodes = next_nodes.concat(node.next);
      }
    });

    if (next_nodes.length > 0) {
      createShapes(next_nodes);
    }
  }

  function connectShapes(nodes) {
    var next_nodes = [];
    $.each(nodes, function(i, node) {
      if (!node) { return; }
      $.each(node.next, function(i, child) {
        if (!child) { return; }
        // YOLO
        child.previous = node;
        child.connection = r.connection(node.box, child.box, '#000', '#FFF|5');
      });

      if (node.next) {
        next_nodes = next_nodes.concat(node.next);
      }
    });

    if (next_nodes.length > 0) {
      connectShapes(next_nodes);
    }
  }

  function moveShapes(nodes, level) {
    var height = size.height / nodes.length;
    var next_nodes = [];
    $.each(nodes, function(i, node) {
      if (!node) { return; }
      var attrs = {
        x: level * box.width,
        y: i * height + (height - box.h)/2
      };
      node.box.attr(attrs);
      node.level = level;

      createWaveform(node, attrs);

      if (node.next) {
        next_nodes = next_nodes.concat(node.next);
      }
    });

    if (next_nodes.length > 0) {
      moveShapes(next_nodes, level + 1);
    }
  }

  function createBox(track) {
    var shape = r.rect(0, 0, box.w, box.h, box.r);
    shape.attr({ fill: box_colour, stroke: box_colour, 'fill-opacity': 0, 'stroke-width': 2, cursor: 'pointer' });
    shape.click(function() {
      callback(track);
    });

    shape.hover(function() {
      shape.animate({ 'stroke': 'green', 'stroke-opacity': 0.6 }, 250);
    }, function() {
      shape.animate({ 'stroke': box_colour, 'stroke-opacity': 1.0 }, 250);
    });

    return shape;
  }

  function createWaveform(track, attrs) {
    $.get('/api/tracks/' + track._id + '/audio', function(data) {
      var audio = data.audio;

      var array = new Float32Array(base64DecToArr(audio));
      var audio_buffer = getAudioBuffer(track, array);
      var display_buffer = getDisplayArray(audio_buffer, 2000);
      track.audio_buffer = audio_buffer;
        
      var length = display_buffer.length;
      var ox = attrs.x;
      var oy = attrs.y;
      var dx = box.w / length;
      var dy = box.h / 2;

      var path_string = '';
      path_string += moveTo(ox, oy + dy);

      for (var x = 0; x < length; x++) {
        var value = display_buffer[x];
        if (value >= 0) {
          path_string += lineTo(ox + x * dx, oy + value * dy + (dy + 0.5));
        }
      }

      for (var x = length - 1; x >= 0; x--) {
        var value = display_buffer[x];
        if (value <= 0) {
          path_string += lineTo(ox + x * dx, oy + value * dy + (dy - 0.5));
        }
      }

      path_string += closePath();

      var path = r.path(path_string);
      path.attr({ fill: 'black', cursor: 'pointer' });
      path.hover(function() {
        track.box.animate({ 'stroke': 'green', 'stroke-opacity': 0.6 }, 250);
      }, function() {
        track.box.animate({ 'stroke': box_colour, 'stroke-opacity': 1.0 }, 250);
      });

      path.click(function() {
        callback(track);
      });

      function moveTo(x, y) {
        return 'M' + x + ',' + y
      }

      function lineTo(x, y) {
        return 'L' + x + ',' + y;
      }

      function closePath() {
        return 'Z';
      }
    });
  }
}

Raphael.fn.connection = function (obj1, obj2, line, bg) {
  if (obj1.line && obj1.from && obj1.to) {
    line = obj1;
    obj1 = line.from;
    obj2 = line.to;
  }
  var bb1 = obj1.getBBox(),
    bb2 = obj2.getBBox(),
    p = [{x: bb1.x + bb1.width / 2, y: bb1.y - 1},
    {x: bb1.x + bb1.width / 2, y: bb1.y + bb1.height + 1},
    {x: bb1.x - 1, y: bb1.y + bb1.height / 2},
    {x: bb1.x + bb1.width + 1, y: bb1.y + bb1.height / 2},
    {x: bb2.x + bb2.width / 2, y: bb2.y - 1},
    {x: bb2.x + bb2.width / 2, y: bb2.y + bb2.height + 1},
    {x: bb2.x - 1, y: bb2.y + bb2.height / 2},
    {x: bb2.x + bb2.width + 1, y: bb2.y + bb2.height / 2}],
    d = {}, dis = [];
  for (var i = 0; i < 4; i++) {
    for (var j = 4; j < 8; j++) {
      var dx = Math.abs(p[i].x - p[j].x),
        dy = Math.abs(p[i].y - p[j].y);
      if ((i == j - 4) || (((i != 3 && j != 6) || p[i].x < p[j].x) && ((i != 2 && j != 7) || p[i].x > p[j].x) && ((i != 0 && j != 5) || p[i].y > p[j].y) && ((i != 1 && j != 4) || p[i].y < p[j].y))) {
        dis.push(dx + dy);
        d[dis[dis.length - 1]] = [i, j];
      }
    }
  }
  if (dis.length == 0) {
    var res = [0, 4];
  } else {
    res = d[Math.min.apply(Math, dis)];
  }
  var x1 = p[res[0]].x,
    y1 = p[res[0]].y,
    x4 = p[res[1]].x,
    y4 = p[res[1]].y;
  dx = Math.max(Math.abs(x1 - x4) / 2, 10);
  dy = Math.max(Math.abs(y1 - y4) / 2, 10);
  var x2 = [x1, x1, x1 - dx, x1 + dx][res[0]].toFixed(3),
    y2 = [y1 - dy, y1 + dy, y1, y1][res[0]].toFixed(3),
    x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]].toFixed(3),
    y3 = [0, 0, 0, 0, y1 + dy, y1 - dy, y4, y4][res[1]].toFixed(3);
  var path = ["M", x1.toFixed(3), y1.toFixed(3), "C", x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)].join(",");
  if (line && line.line) {
    line.bg && line.bg.attr({path: path});
    line.line.attr({path: path});
  } else {
    var color = typeof line == "string" ? line : "#000";
    return {
      bg: bg && bg.split && this.path(path).attr({stroke: bg.split("|")[0], fill: "none", "stroke-width": bg.split("|")[1] || 3}),
      line: this.path(path).attr({stroke: color, fill: "none"}),
      from: obj1,
      to: obj2
    };
  }
};

