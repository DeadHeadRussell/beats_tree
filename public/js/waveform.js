function getDisplayArray(buffer, factor) {
  factor = factor || 100;
  var display_length = parseInt(buffer.length / factor, 10);
  var display_array = new Float32Array(display_length);
  var input = buffer.getChannelData(0);
  for (var i = 0; i < display_length; i++) {
    var max_value = input[i * factor];

    for (var j = 0; j < factor; j++) {
      if (Math.abs(input[i * factor + j]) > Math.abs(max_value)) {
        max_value = input[i * factor + j];
      }
    }

    display_array[i] = max_value;
  }

  return display_array;
}

function displayWaveform(audio, canvas, style) {
  var length = audio.length;
  var ctx = canvas.getContext('2d');
  var width = canvas.width;
  var height = canvas.height;
  var dx = width / length;
  var dy = height / 2;

  ctx.fillStyle = '#FFF';
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.moveTo(0, dy);

  for (var x = 0; x < length; x++) {
    var value = audio[x];
    if (value >= 0) {
      ctx.lineTo(x * dx, value * dy + (dy + 0.5));
    }
  }

  for (var x = length - 1; x >= 0; x--) {
    var value = audio[x];
    if (value <= 0) {
      ctx.lineTo(x * dx, value * dy + (dy - 0.5));
    }
  }

  ctx.lineTo(0, dy);

  ctx.closePath();
  ctx.fill();
}

function updateWaveform($scope) {
  return function() {
    if (!$scope.audio_buffer) {
      return;
    }
    var display_array = getDisplayArray($scope.audio_buffer);
    displayWaveform(display_array, $('#waveform')[0], '#55AA55');
    getGained($scope.gains[0], $('#waveform'));
  };
}

function updatePrevious($scope) {
  return function() {
    if (!$scope.previous_buffers || $scope.previous_buffers.length == 0) {
      return;
    }

    for (var i = 0; i < $scope.previous_buffers.length; i++) {
      var canvas = $('#previous' + (i+1))[0];
      var display_array = getDisplayArray($scope.previous_buffers[i]);
      displayWaveform(display_array, canvas, '#000');
      getGained($scope.gains[i + 1], $(canvas));
    }
  };
}

function getGained(gain, canvas) {
  gain *= 100;
  canvas.css('height', gain + 'px');
  canvas.css('top', (100 - gain)/2 + 'px');
}

