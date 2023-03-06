function buildTree(tracks, elem, $http, click_callback, built_callback) {
  elem.innerHTML = '';

  if (!tracks || !tracks.length) {
    return;
  }

  const roots = tracks.filter(t => !t.previous_track_id);

  function onClick(track) {
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

  const metadata = parseTree(tracks);

  var size = {
    width: metadata.numLayers * box.width,
    height: metadata.biggestLayer * box.height
  };

  const r = Raphael(elem, size.width, size.height);
  tracks.forEach(track => track.box = createBox(track));
  moveShapes([metadata.root], 0);
  connectShapes(tracks);

  built_callback(metadata);

  function connectShapes(tracks) {
    tracks.forEach(track => {
      track.next.forEach(next => {
        next.connection = r.connection(track.box, next.box, '#017', '#FFF|5');
      });
    });
  }

  function moveShapes(nodes, level) {
    const height = size.height / nodes.length;
    const nextNodes = nodes.reduce(
      (nextNodes, node, i) => {
        nextNodes = nextNodes.concat(node.next);
        var attrs = {
          x: level * box.width,
          y: i * height + (height - box.h)/2
        };
        node.box.attr(attrs);
        node.level = level;

        createWaveform(node, attrs);
        return nextNodes;
      },
      []
    );

    if (nextNodes.length > 0) {
      moveShapes(nextNodes, level + 1);
    }
  }

  function createBox(track) {
    var shape = r.rect(0, 0, box.w, box.h, box.r);
    shape.attr({ fill: box_colour, stroke: box_colour, 'fill-opacity': 0, 'stroke-width': 2, cursor: 'pointer' });
    shape.click(() => onClick(track));
    shape.hover(
      () => shape.animate({ 'stroke': 'green', 'stroke-opacity': 0.6 }, 250),
      () => shape.animate({ 'stroke': box_colour, 'stroke-opacity': 1.0 }, 250)
    );
    return shape;
  }

  function createWaveform(track, attrs) {
    $http.get('/api/tracks/' + track.id + '/audio')
      .success(data => {
        var audioArray = base64DecToArr(data.audio);
        track.rawAudioArray = audioArray.slice();

        getAudioBuffer(audioArray)
          .then(audioBuffer => {
            track.audioBuffer = audioBuffer;

            const displayBuffer = getDisplayArray(audioBuffer, 2000);
            const waveformPath = getWaveformPath(displayBuffer, attrs);

            var path = r.path(waveformPath);
            path.attr({ fill: 'black', cursor: 'pointer' });
            path.hover(function() {
              track.box.animate({ 'stroke': 'green', 'stroke-opacity': 0.6 }, 250);
            }, function() {
              track.box.animate({ 'stroke': box_colour, 'stroke-opacity': 1.0 }, 250);
            });

            path.click(function() {
              onClick(track);
            });
          });
      })
      .error(error);
  }

  function getWaveformPath(displayBuffer, attrs) {
    var length = displayBuffer.length;
    var ox = attrs.x;
    var oy = attrs.y;
    var dx = box.w / length;
    var dy = box.h / 2;

    var pathString = '';
    pathString += moveTo(ox, oy + dy);

    for (var x = 0; x < length; x++) {
      var value = displayBuffer[x];
      if (value >= 0) {
        pathString += lineTo(ox + x * dx, oy + value * dy + (dy + 0.5));
      }
    }

    for (var x = length - 1; x >= 0; x--) {
      var value = displayBuffer[x];
      if (value <= 0) {
        pathString += lineTo(ox + x * dx, oy + value * dy + (dy - 0.5));
      }
    }

    pathString += closePath();
    return pathString;

    function moveTo(x, y) {
      return 'M' + x + ',' + y
    }

    function lineTo(x, y) {
      return 'L' + x + ',' + y;
    }

    function closePath() {
      return 'Z';
    }
  }
}

function parseTree(tracks) {
  var numLayers = 0;
  var biggestLayer = 0;
  const numNodes = tracks.length;

  function getChildren(track) {
    numLayers++;
    const children = tracks
      .filter(child => child.previous_track_id == track.id)
      .map(child => {
        child.previous = track;
        return child;
      })
      .map(getChildren);
    track.next = children;
    biggestLayer = Math.max(biggestLayer, children.length);
    return track;
  }

  const root = getChildren({id: null}).next[0];
  root.previous = null;
  return {root, numLayers, biggestLayer, numNodes};
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

