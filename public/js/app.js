'use strict'

var beats_tree_app = angular.module('beats_tree', [
  'ngRoute',
  'bt_controllers',
]);

beats_tree_app.config(['$routeProvider',
  function($rp) {
    $rp.
      when('/tree', {
        templateUrl: '/partials/tree',
        controller: 'tree_controller'
      }).
      when('/tracks/:track_id', {
        templateUrl: '/partials/track',
        controller: 'track_controller'
      }).
      when('/editor/:track_id', {
        templateUrl: '/partials/editor',
        controller: 'editor_controller'
      }).
      otherwise({
        redirectTo: '/tree'
      });
}]);

