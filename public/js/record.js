navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;

(function() {
  var can_record = false;
  var input_source = null;

  var callbacks = [];
  var got_permissions = false;

  $(function() {
    navigator.getUserMedia({ audio: true }, setupRecording, function(e) {
      got_permissions = true;
      can_record = false;
      $.each(callbacks, function(i, callback) {
        callback(can_record);
      });
    });
  });

  function setupRecording(stream) {
    got_permissions = true;
    can_record = true;
    input_source = context.createMediaStreamSource(stream);
    recorder = new Recorder(input_source, {
      workerPath: '/js/Recorderjs/recorderWorker.js',
      bufferLen: 512
    });

    $.each(callbacks, function(i, callback) {
      callback(can_record);
    });
  }

  function init(callback) {
    if (got_permissions) {
      callback(can_record);
    } else {
      callbacks.push(callback);
    }
  }

  function record() {
    if (recorder) {
      recorder.clear();
      recorder.record();
      return true;
    }
    return false;
  }

  function stop(callback) {
    if (recorder) {
      recorder.stop();
      recorder.getBuffer(function(buffers) {
        callback(context.sampleRate, buffers);
      });
      return true;
    }
    return false;
  }

  window.beatRecorder = {
    record: record,
    stop: stop,
    init: init
  };
})();

