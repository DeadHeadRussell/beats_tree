'use strict'

var beats_tree_controllers = angular.module('bt_controllers', []);

beats_tree_controllers.controller('tree_controller', ['$scope', '$http', '$location',
  function($scope, $http, $location) {
    $http.get('/api/tracks').success(function(data) {
      $scope.tracks = data.tracks;
    });
    $scope.order_prop = '_id';

    $scope.create = function() {
      $http.post('/api/tracks', { tempo: $scope.tempo }).success(function(data) {
        $location.path('/editor/' + data.track._id);
      });
    };
}]);

beats_tree_controllers.controller('track_controller', ['$scope', '$routeParams', '$http', '$location',
  function($scope, $routeParams, $http, $location) {
    $scope.track = {
      _id: $routeParams.track_id
    };
    $http.get('/api/tracks/' + $scope.track._id).success(function(data) {
      $scope.track = data.track;
    });

    $scope.fork = function() {
      $http.post('/api/tracks/' + $scope.track._id).success(function(data) {
        $location.path('/editor/' + data.track_id);
      });
    };
}]);

beats_tree_controllers.controller('editor_controller', ['$scope', '$routeParams', '$http',
  function($scope, $routeParams, $http) {
    $scope.track = {
      _id: $routeParams.track_id
    };
    $http.get('/api/tracks/' + $scope.track._id).success(function(data) {
      $scope.track = data.track;
    });

    $scope.toggle_cell = function() {
      //
    };
}]);

