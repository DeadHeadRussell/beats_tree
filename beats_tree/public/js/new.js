$(function() {
  $('#create').click(function() {
    var tempo = $('#tempo').val();
    $.getJSON('/api/create', { tempo: tempo }, function(data) {
      if (data.error) {
        $('#error').text(data.error);
      } else {
        window.location.href = data.url;
      }
    });
  });
});

