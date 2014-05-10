'use strict'

var beats_tree_controllers = angular.module('bt_controllers', []);

var interpolateHeight = function(total_height) {
  var amplitude = 256;
  return function(size) {
    return total_height - ((size + 128) * total_height) / amplitude;
  };
};

beats_tree_controllers.controller('trees_controller', ['$scope', '$http', '$location',
  function($scope, $http, $location) {
    $scope.$watch('metronome', metronome, true);
    $scope.$watch('tempo', setTempo, true);
    $scope.tempo = 120;
    $http.get('/api/trees?meta_data=true').success(function(trees) {
      $scope.trees = trees;
    }).error(error);;
    $scope.order_prop = '_id';

    var play = null;

    $scope.create = function() {
      if (play) {
        play.stop();
      }

      var data = { tempo: $scope.tempo, name: $scope.name };
      $http.post('/api/trees', data).success(function(tree) {
        $location.path('/editor/' + tree.root._id);
      }).error(error);
    };

    function setTempo() {
      if (play) {
        play.setTempo($scope.tempo);
      }
    }

    function metronome() {
      if ($scope.metronome) {
        play = playMetronome($scope.tempo);
      } else if (play) {
        play.stop();
      }
    }
  }
]);

beats_tree_controllers.controller('tree_controller', ['$scope', '$routeParams', '$http', '$location',
  function($scope, $routeParams, $http, $location) {
    var id = $routeParams.tree_id;
    getTree($scope, id, $http, function() {
      buildTree($scope, $('.tree')[0], function(track) {
        $scope.selected_track = track;
        $scope.$apply();
      }, function(total_nodes) {
        $scope.number_tracks = total_nodes;
      });
    });

    $scope.number_tracks = 0;
    $scope.playing = false;
    $scope.current_tracks = [];
    $scope.random_percent = 0.05;

    $scope.play = function() {
      $scope.playing = true;
      $scope.current_tracks = [];
      $scope.next_track = $scope.tree.root;

      $scope.previous_time = getAudioTime();
      $scope.seconds = 16 * 60 / $scope.tree.tempo;
      $scope.next_track.source = playAudio([ $scope.next_track.audio_buffer ], [])[0];

      playNext();
    };

    function playNext() {
      if (!$scope.playing) {
        return;
      }

      var move;
      var top_track;

      if ($scope.current_tracks.length == 0) {
        move = -1;
      } else {
        top_track = $scope.current_tracks[$scope.current_tracks.length - 1];
        move = top_track.level - $scope.next_track.level;
      }

      if (move < 0) {
        if ($scope.current_tracks.length >= 4) {
          var old_track = $scope.current_tracks.shift();
          if (old_track && old_track.source) {
            stopAudio([old_track.source]);
            old_track.source = null;
          }
        }

        var new_track = $scope.next_track;
        $scope.current_tracks.push(new_track);

        var box = top_track ? top_track.box : null;

        animate(new_track.box, box, new_track.connection);
      } else if (move > 0) {
        var old_track = $scope.current_tracks.pop();
        var new_track = getPrevious($scope.next_track);
        if (new_track) {
          $scope.current_tracks.unshift(new_track);
        }

        stopAudio([old_track.source]);
        old_track.source = null;

        animate($scope.next_track.box, old_track.box, old_track.connection);
      }

      var top_track = $scope.current_tracks[$scope.current_tracks.length - 1];

      $scope.previous_time += $scope.seconds;
      if (Math.random() < $scope.random_percent) {
        var track = getRandomTrack();
        play_track(track, $scope.previous_time);
      } else {
        var tracks = [top_track];
        var tracks = [];

        if (top_track.next) {
          tracks = tracks.concat(top_track.next);
        }

        if (top_track.previous) {
          tracks.push(top_track.previous);
        }

        $scope.next_track = null;
        while (!$scope.next_track) {
          var i = parseInt(Math.random() * tracks.length, 10);
          $scope.next_track = tracks[i];
        }

        if ($scope.next_track == top_track.previous) {
          var new_track = getPrevious($scope.next_track);
          if (new_track) {
            new_track.source = playAudio([ new_track.audio_buffer ], [], 0, $scope.previous_time)[0];
          }
        } else if ($scope.next_track != top_track) {
          $scope.next_track.source = playAudio([ $scope.next_track.audio_buffer ], [], 0, $scope.previous_time)[0];
        }

        setTimeout(playNext, $scope.seconds * 1000);
      }
    }

    function animate(box_on, box_off, connection) {
      if (box_on) {
        box_on.animate({ 'fill-opacity': 0.4 }, 1000);
      }
      
      if (box_off) {
        box_off.animate({ 'fill-opacity': 0.0 }, 1000);
      }

      if (connection) {
        var bg = connection.bg;
        bg.animate({ 'stroke-opacity': 0.4 }, 1000, function() {
          bg.animate({ 'stroke-opacity': 0 }, 1000);
        });
      }
    }

    function getPrevious(track) {
      var count = 0;
      while (count < 3) {
        track = track.previous;
        if (!track) {
          return null;
        }
        count++;
      }
      return track;
    }

    function getPreviousArray(track) {
      var count = 0;
      var previous = [];
      while (count < 3) {
        track = track.previous;
        if (!track) {
          return previous;
        }
        previous.push(track);
        count++;
      }
      return previous;
    }

    $scope.stop = function() {
      $scope.playing = false;
      var sources = [];
      $.each($scope.current_tracks, function(i, track) {
        if (track.source) {
          sources.push(track.source);
        }
      });

      if ($scope.next_track && $scope.next_track.source) {
        sources.push($scope.next_track.source);
      }

      if ($scope.next_track) {
        var previous_track = getPrevious($scope.next_track);
        if (previous_track && previous_track.source) {
          sources.push(previous_track.source);
        }
      }

      if (sources.length > 0) {
        stopAudio(sources);
      }
    };

    function getRandomTrack() {
      var tracks = [$scope.tree.root];
      for (var i = 0; i < tracks.length; i++) {
        var track = tracks[i];
        if (track && track.next) {
          tracks = tracks.concat(track.next);
        }
      }

      var ret = null;
      while (!ret) {
        var track_num = parseInt(Math.random() * $scope.number_tracks, 10);
        ret = tracks[track_num];
      }

      return ret;
    }

    function play_track(track, wait) {
      if (!$scope.playing) {
        return;
      }
      wait = wait || 0;

      setTimeout(function() {
        if (!$scope.playing) {
          return;
        }

        if ($scope.current_tracks.length > 0) {
          animate(null, $scope.current_tracks.pop().box);
        }
        $scope.stop();
        $scope.playing = true;
        $scope.current_tracks = getPreviousArray(track).reverse();
        $scope.next_track = track;

        var current_buffers = [];
        $.each($scope.current_tracks, function(i, track) {
          current_buffers.push(track.audio_buffer);
        });

        $scope.previous_time = wait || getAudioTime();
        $scope.seconds = 16 * 60 / $scope.tree.tempo;
        var sources = playAudio([ $scope.next_track.audio_buffer ].concat(current_buffers), [], 0, wait);
        $scope.next_track.source = sources[0];
        for (var i = 0; i < $scope.current_tracks.length; i++) {
          $scope.current_tracks[i].source = sources[i + 1];
        }

        playNext();
      }, (wait - getAudioTime()) * 1000);
    }

    $scope.view = function() {
      $location.path('/tracks/' + $scope.selected_track._id);
    };

    $scope.play_from = function() {
      $scope.playing = true;
      play_track($scope.selected_track);
    };

    $scope.delete = deleteTree($scope, $http, $location);
  }
]);

beats_tree_controllers.controller('track_controller', ['$scope', '$routeParams', '$http', '$location',
  function($scope, $routeParams, $http, $location) {
    var id = $routeParams.track_id;
    $scope.$watch('audio_buffer', updateWaveform($scope), true);
    $scope.$watch('previous_buffers', updatePrevious($scope), true);
    getTrack($scope, id, $http, function() {
      getAudio($scope, id, $scope.track, $http);

      $scope.gains = [];
      $scope.gains.push($scope.track.audio.gain);

      var track = $scope.track.previous;
      var count = 1;
      while (track && count < 4) {
        $scope.gains.push(track.audio.gain);
        getAudio($scope, track._id, track, $http, true);
        var track = track.previous;
        count++;
      }
    });

    var playing = false;
    $scope.previous_buffers = [];

    $scope.fork = function() {
      var data = { previous: $scope.track._id };
      $http.post('/api/tracks', data).success(function(track) {
        $scope.stop();
        $location.path('/editor/' + track._id);
      }).error(error);
    };

    $scope.edit = function() {
      $scope.stop();
      $location.path('/editor/' + $scope.track._id);
    };

    $scope.delete = deleteTrack($scope, $http, $location);

    $scope.isPlaying = function() {
      return playing;
    };

    $scope.play = function() {
      if ($scope.audio_buffer) {
        playing = true;
        var buffers = [$scope.audio_buffer].concat($scope.previous_buffers);
        $scope.sources = playAudio(buffers, $scope.gains);
      }
    };

    $scope.stop = function() {
      if ($scope.sources) {
        playing = false;
        stopAudio($scope.sources);
      }
    };

    $scope.goto = function(depth) {
      var count = 0;
      var track = $scope.track;
      while (count < depth) {
        track = track.previous;
        count++;
      }

      if (track) {
        $scope.stop();
        $location.path('/tracks/' + track._id);
      }
    };
  }
]);

beats_tree_controllers.controller('editor_controller', ['$scope', '$routeParams', '$http', '$location',
  function($scope, $routeParams, $http, $location) {
    var id = $routeParams.track_id;
    $scope.$watch('audio_buffer', updateWaveform($scope), true);
    $scope.$watch('previous_buffers', updatePrevious($scope), true);
    $scope.$watch('gain', scaleCanvas);
    getTrack($scope, id, $http, function() {
      $scope.pickup = 8 * 60 / $scope.track.tempo;

      $scope.gains = [];
      var g = $scope.track.audio ? $scope.track.audio.gain : 1;
      $scope.gains.push(g);
      $scope.gain = $scope.gains[0] * 100;

      getAudio($scope, id, $scope.track, $http);
      var track = $scope.track.previous;
      var count = 1;
      while (track && count < 4) {
        $scope.gains.push(track.audio.gain);
        getAudio($scope, track._id, track, $http, true);
        var track = track.previous;
        count++;
      }
    });

    $scope.playing = false;
    $scope.recording = false;
    $scope.saved = true;
    $scope.saving = false;
    $scope.use_metronome = true;
    $scope.gain = 100;
    $scope.previous_buffers = [];


    beatRecorder.init(function(can_record) {
      $scope.can_record = can_record;
      var phase = $scope.$root.$$phase;
      if (phase != '$apply' && phase != '$digest') {
        $scope.$apply();
      }
    });

    var file_input = $('input[type=file]')[0];
    $(file_input).change(function(e) {
      $scope.audio_buffer = undefined;
      $scope.$apply();

      getAudioBufferFromFile(file_input.files[0], function(buffer) {
        $scope.audio_buffer = shortenBuffer(buffer, $scope.length);
        $scope.saved = false;
        $scope.$apply();
      });
    });

    $scope.play = function() {
      if ($scope.audio_buffer) {
        $scope.playing = true;
        var buffers = [$scope.audio_buffer].concat($scope.previous_buffers);
        $scope.sources = playAudio(buffers, $scope.gains, 0, 0, $scope);
        if ($scope.use_metronome) {
          $scope.metronome = playMetronome($scope.track.tempo);
        }
      }
    };

    $scope.record = function() {
      $scope.recording = true;
      $scope.audio_buffer = undefined;
      $scope.sources = playAudio($scope.previous_buffers, $scope.gains.slice(1), 0.5);
      $scope.metronome = playMetronome($scope.track.tempo, 24, $scope.stop, !$scope.use_metronome);
      beatRecorder.record();
    };

    $scope.stop = function() {
      if ($scope.sources) {
        $scope.playing = false;
        stopAudio($scope.sources);
      }
      
      if ($scope.recording) {
        $scope.recording = false;
        beatRecorder.stop(function(sampleRate, buffers) {
          var start = parseInt($scope.pickup * sampleRate, 10);
          var length = parseInt($scope.length.seconds * sampleRate, 10);
          $scope.audio_buffer = createAudioBuffer(buffers, sampleRate, start, length);
          $scope.saved = false;
          $scope.$apply();
        });
      }
      if ($scope.metronome) {
        $scope.metronome.stop();
      }
    };

    $scope.save = function() {
      $scope.saved = true;
      $scope.saving = true;
      var buffer = $scope.audio_buffer;
      var data = {
        audio: {
          length: buffer.length,
          numberOfChannels: buffer.numberOfChannels,
          sampleRate: buffer.sampleRate,
          gain: $scope.gain / 100
        }
      };

      var channels = new Float32Array(buffer.numberOfChannels * buffer.length);
      for (var i = 0; i < buffer.numberOfChannels; i++) {
        var input = buffer.getChannelData(i);
        channels.set(input, i * buffer.length);
      }

      $http.put('/api/tracks/' + $scope.track._id, data).success(function() {
        var data = { 'audio': base64EncArr(channels) };
        $http.post('/api/tracks/' + $scope.track._id + '/audio', data).success(function() {
          $scope.stop();
          $location.path('/tracks/' + $scope.track._id);
          $scope.saving = false;
        }).error(function() {
          $scope.saved = false;
          $scope.saving = false;
          error(data, status, headers, config, statusText);
        });
      }).error(function(data, status, headers, config, statusText) {
        $scope.saved = false;
        $scope.saving = false;
        error(data, status, headers, config, statusText);
      });
    };

    $scope.view = function() {
      $scope.stop();
      $location.path('/tracks/' + $scope.track._id);
    };

    $scope.delete = deleteTrack($scope, $http, $location);

    $scope.goto = function(depth) {
      var count = 0;
      var track = $scope.track;
      while (count < depth) {
        track = track.previous;
        count++;
      }

      if (track) {
        $scope.stop();
        $location.path('/tracks/' + track._id);
      }
    };

    function scaleCanvas() {
      if ($scope.gain_node) {
        $scope.gain_node.gain.value = $scope.gain / 100;
      }

      if ($scope.gains && $scope.gains.length > 0) {
        if ($scope.gains[0] != $scope.gain / 100) {
          $scope.saved = false;
        }
        $scope.gains[0] = $scope.gain / 100;
      }

      $('#waveform').css('height', $scope.gain + 'px');
      $('#waveform').css('top', (100 - $scope.gain)/2 + 'px');
    }
  }
]);

beats_tree_controllers.controller('about_controller', ['$scope',
  function($scope) {
    //
  }
]);

