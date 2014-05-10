'use strict'

var beats_tree_app = angular.module('beats_tree', [
  'ngRoute',
  'bt_controllers',
]);

beats_tree_app.config(['$routeProvider',
  function($rp) {
    $rp.
      when('/trees', {
        templateUrl: '/partials/trees',
        controller: 'trees_controller'
      }).
      when('/tree/:tree_id', {
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
      when('/about', {
        templateUrl: '/partials/about',
        controller: 'about_controller'
      }).
      otherwise({
        redirectTo: '/trees'
      });
}]);

