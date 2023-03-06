'use strict'

var beats_tree_controllers = angular.module('bt_controllers', []);

var interpolateHeight = function(total_height) {
  var amplitude = 256;
  return function(size) {
    return total_height - ((size + 128) * total_height) / amplitude;
  };
};

const mimetypes = {
  'audio/mp3': ['mp3'],
  'audio/mp4': ['m4a', 'mp4a'],
  'audio/mpeg': ['mp3', 'mpga', 'mp2', 'mp2a', 'm2a', 'm3a'],
  'audio/ogg': ['oga', 'ogg', 'spx', 'opus'],
  'audio/wav': ['wav'],
  'audio/wave': ['wav'],
  'audio/webm': ['weba']
}

beats_tree_controllers.controller('trees_controller', ['$scope', '$http', '$location',
  function($scope, $http, $location) {
    $scope.order_prop = 'id';
    $http.get('/api/trees')
      .success(trees => {
        $scope.trees = trees;
      })
      .error(error);

    $scope.create = function() {
      var data = {name: $scope.name};
      $http.post('/api/trees', data)
        .success(tree => $location.path('/tree/' + tree.id))
        .error(error);
    };
  }
]);

beats_tree_controllers.controller('tree_controller', ['$scope', '$routeParams', '$http', '$location',
  function($scope, $routeParams, $http, $location) {
    var id = $routeParams.tree_id;
    var playingTracks = [];
    var playingSources = [];
    var playingStartTime = null;
    var transitionTimerId = null;

    $scope.tree = {};
    $scope.tracks = [];

    getTree(id, $http, function(tree) {
      $scope.tree = tree;
    });

    getTracksForTree(id, $http, function(tracks) {
      updateTracks(tracks);
    });

    $scope.playing = false;
    $scope.autoTransitionTime = 0;

    $scope.updateFileName = function() {
      if (!$scope.newTrackName) {
        const audioFile = document.getElementById('track-audio').files[0];
        $scope.newTrackName = audioFile.name.replace(/\.[^/.]+$/, '');
        $scope.$apply();
      }
    };

    $scope.addTrack = function() {
      const audioFile = document.getElementById('track-audio').files[0];
      if (!$scope.newTrackName || !audioFile) {
        error(new Error('Invalid track audio file / name'));
      } else {
        const reader = new FileReader();
        reader.onloadend = function() {
          const data = {
            name: $scope.newTrackName,
            mimetype: audioFile.type,
            audio: base64EncArr(reader.result)
          };

          if ($scope.selectedTrack) {
            data.previous_track_id = $scope.selectedTrack.id;
          }

          $http.post('/api/trees/' + id + '/tracks', data)
            .success(track => {
              $scope.newTrackName = '';
              document.getElementById('track-audio').value = null;
              updateTracks($scope.tracks.concat([track]));
            })
            .error(error);
        };
        reader.readAsArrayBuffer(audioFile);
      }
    };

    $scope.play = function() {
      playFrom($scope.root);
    };

    $scope.playSelected = function() {
      playFrom($scope.selectedTrack);
    };

    $scope.switchTracks = function() {
      if ($scope.selectedTrack) {
        switchTo($scope.selectedTrack);
      }
    }

    $scope.stop = function() {
      stop();
    };

    $scope.download = function() {
      const tracks = getTracksArray($scope.selectedTrack);
      const zip = new JSZip();
      tracks.forEach(track => {
        const ext = track.mimetype
          ? mimetypes[track.mimetype][0]
          : 'mp3';

        const fileName = track.name + '.' + ext;
        zip.file(fileName, track.rawAudioArray, {binary: true});
      });
 
      zip.generateAsync({type: 'blob'}).then(blob => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = $scope.tree.name + '.zip';
        link.click();
      });
    };

    $scope.updateTransitionTimer = function() {
      if ($scope.autoTransitionTime == 0) {
        clearTimeout(transitionTimerId);
        transitionTimerId = null;
      } else if (!transitionTimerId) {
        runTransition();
      }
    };

    function updateTracks(tracks) {
      $scope.tracks = tracks;

      buildTree(tracks, $('.tree')[0], $http, function(track) {
        $scope.selectedTrack = track;
        $scope.$apply();
      }, function(metadata) {
        $scope.root = metadata.root;
      });
    };

    function playFrom(track) {
      if ($scope.playing) {
        stop();
      }

      const boxOff = playingTracks.length > 0
        ? playingTracks[0].box
        : null;

      animate(track.box, boxOff, null);

      $scope.playing = true;
      playingTracks = getTracksArray(track);
      const audioBuffers = playingTracks.map(t => t.audioBuffer);
      playingSources = playAudio(audioBuffers, []);
      playingStartTime = getAudioTime();

      runTransition();
    }

    function switchTo(track) {
      if (!$scope.playing) {
        playFrom(track);
      } else {
        // TODO: Find full connection chain.
        animate(track.box, playingTracks[0].box, track.connection);

        playingTracks = getTracksArray(track);
        const audioBuffers = playingTracks.map(t => t.audioBuffer);
        const duration = Math.max(...audioBuffers.map(buffer => buffer.duration));
        const offset = (getAudioTime() - playingStartTime) % duration;
        const newSources = playAudio(audioBuffers, [], offset);
        stopAudio(playingSources);
        playingSources = newSources;

        runTransition();
      }
    }

    function runTransition() {
      clearTimeout(transitionTimerId);
      if ($scope.playing && $scope.autoTransitionTime > 0) {
        const audioBuffers = playingTracks.map(t => t.audioBuffer);
        const duration = Math.max(...audioBuffers.map(buffer => buffer.duration));
        const offset = (getAudioTime() - playingStartTime) % duration;
        const transitionTime = duration * $scope.autoTransitionTime;
        if (offset + transitionTime < duration) {
          transitionTimerId = setTimeout(
            () => {
              if ($scope.playing) {
                switchTo(getRandomTrack());
              }
            },
            transitionTime * 1000
          );
        }
      }
    }

    function stop() {
      if ($scope.playing) {
        $scope.playing = false;

        animate(null, playingTracks[0].box, null);

        stopAudio(playingSources);
        playingTracks = [];
        playingSources = [];
        playingStartTime = null;
        
        clearTimeout(transitionTimerId);
        transitionTimerId = null;
      }
    }

    function getTracksArray(track) {
      const tracks = [track];
      for (var i = 0; i < 4; i++) {
        track = track.previous;
        if (!track) {
          break;
        }
        tracks.push(track);
      }
      return tracks;
    }

    function getRandomTrack() {
      const trackNum = Math.floor(Math.random() * $scope.tracks.length);
      return $scope.tracks[trackNum];
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

    // ====================================

    function playNext() {
      $scope.playing = true;
      $scope.next_track.source = playAudio([ $scope.next_track.audioBuffer ], [])[0];

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
      if (Math.random() < $scope.randomPercent) {
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
            new_track.source = playAudio([ new_track.audioBuffer ], [], 0, $scope.previous_time)[0];
          }
        } else if ($scope.next_track != top_track) {
          $scope.next_track.source = playAudio([ $scope.next_track.audioBuffer ], [], 0, $scope.previous_time)[0];
        }

        setTimeout(playNext, $scope.seconds * 1000);
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
          current_buffers.push(track.audioBuffer);
        });

        $scope.previous_time = wait || getAudioTime();
        $scope.seconds = 4;
        var sources = playAudio([ $scope.next_track.audioBuffer ].concat(current_buffers), [], 0, wait);
        $scope.next_track.source = sources[0];
        for (var i = 0; i < $scope.current_tracks.length; i++) {
          $scope.current_tracks[i].source = sources[i + 1];
        }

        playNext();
      }, (wait - getAudioTime()) * 1000);
    }
}]);

beats_tree_controllers.controller('track_controller', ['$scope', '$routeParams', '$http', '$location',
  function($scope, $routeParams, $http, $location) {
    var id = $routeParams.track_id;
    $scope.$watch('audioBuffer', updateWaveform($scope), true);
    $scope.$watch('previous_buffers', updatePrevious($scope), true);
    getTrack($scope, id, $http, function() {
      getAudio($scope, id, $scope.track, $http);

      $scope.gains = [];
      $scope.gains.push($scope.track.audio.gain);

      var track = $scope.track.previous;
      var count = 1;
      while (track && count < 4) {
        $scope.gains.push(track.audio.gain);
        getAudio($scope, track.id, track, $http, true);
        var track = track.previous;
        count++;
      }
    });

    var playing = false;
    $scope.previous_buffers = [];

    $scope.fork = function() {
      var data = { previous: $scope.track.id };
      $http.post('/api/tracks', data).success(function(track) {
        $scope.stop();
        $location.path('/editor/' + track.id);
      }).error(error);
    };

    $scope.edit = function() {
      $scope.stop();
      $location.path('/editor/' + $scope.track.id);
    };

    $scope.delete = deleteTrack($scope, $http, $location);

    $scope.isPlaying = function() {
      return playing;
    };

    $scope.play = function() {
      if ($scope.audioBuffer) {
        playing = true;
        var buffers = [$scope.audioBuffer].concat($scope.previous_buffers);
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
        $location.path('/tracks/' + track.id);
      }
    };
  }
]);

beats_tree_controllers.controller('editor_controller', ['$scope', '$routeParams', '$http', '$location',
  function($scope, $routeParams, $http, $location) {
    var id = $routeParams.track_id;
    $scope.$watch('audioBuffer', updateWaveform($scope), true);
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
        getAudio($scope, track.id, track, $http, true);
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
      $scope.audioBuffer = undefined;
      $scope.$apply();

      getAudioBufferFromFile(file_input.files[0], function(buffer) {
        $scope.audioBuffer = shortenBuffer(buffer, $scope.length);
        $scope.saved = false;
        $scope.$apply();
      });
    });

    $scope.play = function() {
      if ($scope.audioBuffer) {
        $scope.playing = true;
        var buffers = [$scope.audioBuffer].concat($scope.previous_buffers);
        $scope.sources = playAudio(buffers, $scope.gains, 0, 0, $scope);
        if ($scope.use_metronome) {
          $scope.metronome = playMetronome($scope.track.tempo);
        }
      }
    };

    $scope.record = function() {
      $scope.recording = true;
      $scope.audioBuffer = undefined;
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
          $scope.audioBuffer = createAudioBuffer(buffers, sampleRate, start, length);
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
      var buffer = $scope.audioBuffer;
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

      $http.put('/api/tracks/' + $scope.track.id, data).success(function() {
        var data = { 'audio': base64EncArr(channels.buffer) };
        $http.post('/api/tracks/' + $scope.track.id + '/audio', data).success(function() {
          $scope.stop();
          $location.path('/tracks/' + $scope.track.id);
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
      $location.path('/tracks/' + $scope.track.id);
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
        $location.path('/tracks/' + track.id);
      }
    };

    function scaleCanvas() {
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

