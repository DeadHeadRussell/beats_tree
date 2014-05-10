window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
var context = new AudioContext();

function getAudioBufferFromFile(file, callback) {
  var reader = new FileReader();
  reader.onloadend = loadAudio;
  reader.readAsArrayBuffer(file);

  function loadAudio() {
    context.decodeAudioData(reader.result, callback);
  }
}

function playAudio(buffers, gains, offset_percent, start, scope) {
  offset_percent = offset_percent || 0;
  start = start || 0;
  var sources = [];
  $.each(buffers, function(i, buffer) {
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    var gain_node = context.createGain();
    if (i == 0 && scope) {
      // Omg, please kill me now.
      scope.gain_node = gain_node;
    }
    source.connect(gain_node);
    gain_node.gain.value = gains[i] || 1;
    gain_node.connect(context.destination);
    sources.push(source);
  });


  for (var i = 0; i < buffers.length; i++) {
    sources[i].start(start, buffers[i].duration * offset_percent);
  }

  return sources;
}

function stopAudio(sources) {
  $.each(sources, function(i, source) {
    source.stop();
    source.disconnect();
  });
}

function shortenBuffer(full_buffer, length) {
  var numberOfChannels = full_buffer.numberOfChannels;
  var sampleRate = full_buffer.sampleRate;
  var samples = parseInt(length.seconds * sampleRate, 10);
  var buffer = context.createBuffer(numberOfChannels, samples, sampleRate);

  for (var i = 0; i < full_buffer.numberOfChannels; i++) {
    var input = full_buffer.getChannelData(i);
    var output = buffer.getChannelData(i);
    output.set(input.subarray(0, samples));
  }

  return buffer;
}

function createAudioBuffer(buffers, sampleRate, offset, length) {
  var audio_buffer = context.createBuffer(buffers.length, length, sampleRate);
  $.each(buffers, function(i, input) {
    // XXX: Do I really have to add 512 here? Much hacky, so latency, wow.
    var input = input.subarray(offset + 1024);
    var output = audio_buffer.getChannelData(i);

    if (input.length > length) {
      if (input.length >= length + 5120) {
        var crossfade = input.subarray(length, length + 5120);
        for (var i = 0; i < crossfade.length; i++) {
          var x = i / crossfade.length;
          var gain1 = Math.cos(x * 0.5 * Math.PI);
          var gain2 = Math.cos((1.0 - x) * 0.5 * Math.PI);
          input[i] = crossfade[i] * gain1 + input[i] * gain2;
        }
      }
      input = input.subarray(0, length);
    }

    output.set(input);
  });

  return audio_buffer;
}

function getAudioBuffer(track, audio_data) {
  if (!track.audio) {
    return;
  }
  var numberOfChannels = track.audio.numberOfChannels;
  var length = track.audio.length;
  var sampleRate = track.audio.sampleRate;
  var audio_buffer = context.createBuffer(numberOfChannels, length, sampleRate);
  for (var i = 0; i < numberOfChannels; i++) {
    var input = audio_data.subarray(i * length, (i+1) * length);
    var output = audio_buffer.getChannelData(i);
    output.set(input);
  }
  return audio_buffer;
}

function playMetronome(tempo, length, callback, silence) {
  var current_beat = 0;
  var timer_id = null;
  var next_note_time = context.currentTime;
  var lookahead = 25;
  var schedule_ahead_time = 0.1;
  var note_length = 0.05;
  var notes_queue = [];
  var stopped = false;
  var silence = silence || false;

  scheduler();

  function nextNote() {
    var spb = 60.0 / tempo;
    next_note_time += spb;
    current_beat++;
  }

  function scheduleNote(beat, time) {
    if (stopped || silence) {
      return;
    }

    notes_queue.push({ note: beat, time: time });
    var osc = context.createOscillator();
    osc.connect(context.destination);
    if (beat % 4 == 0) {
      osc.frequency.value = 440.0;
    } else {
      osc.frequency.value = 220.0;
    }

    osc.start(time);
    osc.stop(time + note_length);
  }

  function scheduler() {
    while (next_note_time < context.currentTime + schedule_ahead_time) {
      scheduleNote(current_beat, next_note_time);
      if (length && current_beat > length) {
        callback();
        stop();
        return;
      }
      nextNote();
    }
    timer_id = window.setTimeout(scheduler, lookahead);
  }

  function stop() {
    window.clearTimeout(timer_id);
    stopped = true;
  }

  return {
    stop: stop,
    setTempo: function(t) { tempo = t; }
  };
}

function getAudioTime() {
  return context.currentTime;
}

