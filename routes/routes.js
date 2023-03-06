var api = require('./api');
var index = require('./index');

exports.create = function(app) {
  app.use('/', index);
  app.use('/api', api);
};

