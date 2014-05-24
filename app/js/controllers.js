'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
  .controller('MyCtrl', ['$scope', 'dataService', function($scope, dataService) {

		dataService.loadData('data/graph.json').then(
        function(data){
          // let's create proper data objects
          data.nodes = data.nodes.map(function(d){
            return { data: d };
          })

          $scope.data = data;
          }, 
        function(error){
          $scope.error = error;
        }
      );

		// Major settings
		$scope.enableLayout = false;
    $scope.running = true;
    $scope.grouping = false;
    $scope.showLinks = false;

    $scope.linkStrength = 1;

  }])
