var api = require('./api');
var editor = require('./editor');
var grid = require('./grid');
var index = require('./index');

exports.create = function(app) {
  app.use('/editor', editor);
  app.use('/', index);
  app.use('/api', api);
  app.use('/grid', grid);
};

