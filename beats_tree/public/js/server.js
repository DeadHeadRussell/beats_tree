function getTree($scope, id, $http, callback) {
  $scope.tree = {
    _id: id
  };
  $http.get('/api/trees/' + $scope.tree._id).success(function(tree) {
    $scope.tree = tree;
    callback();
  }).error(error);
}

function deleteTree($scope, $http, $location) {
  return;
  return function() {
    $http.delete('/api/trees/' + $scope.tree._id).success(function() {
      $location.path('/trees');
    }).error(error);
  };
}

function getTrack($scope, id, $http, callback) {
  $scope.track = {
    _id: id
  };
  $http.get('/api/tracks/' + $scope.track._id + '?previous=true').success(function(track) {
    $scope.track = track;

    $scope.length = {};
    $scope.length.seconds = 16 * 60 / track.tempo;
    $scope.length.seconds_neat = parseInt($scope.length.seconds * 100) / 100;

    if (callback) {
      callback();
    }
  }).error(error);
}

function deleteTrack($scope, $http, $location) {
  return;
  return function() {
    $http.delete('/api/tracks/' + $scope.track._id).success(function() {
      $location.path('/trees');
    }).error(error);
  };
}

function getAudio($scope, id, track, $http, previous) {
  $http.get('/api/tracks/' + id + '/audio').success(function(audio) {
    audio = audio.audio;
    if (audio && (previous || !$scope.audio_buffer)) {
      var array = new Float32Array(base64DecToArr(audio));
      var audio_buffer = getAudioBuffer(track, array);

      if (previous) {
        $scope.previous_buffers.push(audio_buffer);
      } else {
        $scope.audio_buffer = audio_buffer;
      }
    } else if (!previous) {
      $scope.audio_buffer = null;
    }
  }).error(error);
}

function error(data, status, headers, config, statusText) {
  var elem = $('#error');
  elem.text('Error: ' + statusText + ' ' + data);
}

