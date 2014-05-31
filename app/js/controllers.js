'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
  .controller('appCtrl', ['$scope', 'dataService', function($scope, dataService) {
    
    $scope.status = {
      showLinks : true,
      editing : false,
      selection : [],
      searching : "",
      selectFunction : null
    };

    dataService.loadData('data/graph.json').then(
      
      function(data){
        // let's create proper data objects
        data.nodes = data.nodes.map(function(d){
          return {
            groups : {},
            tags : [],
            data: d 
          };
        })

        $scope.datas = data;
        }, 
      
      function(error){
        $scope.error = error;
      }
    );

    $scope.selectAll = function(){
      $scope.status.selectFunction = function(d){ return true; };
    }

    $scope.selectNone = function(){
      $scope.status.selectFunction = function(d){ return false; };
    }

    $scope.selectInverse = function(){
      if (!$scope.status.selection.length) return;
      $scope.status.selectFunction = function(d){ return !d.selected; };
    }

    $scope.selectLocked = function(){
      $scope.status.selectFunction = function(d){ return d.fixed; };
    }

    $scope.selectUnlocked = function(){
      $scope.status.selectFunction = function(d){ return !d.fixed; };
    }

    $scope.selectConnected = function(){
      if (!$scope.status.selection.length) return;
      $scope.status.selectFunction = function(d){
        return d.selected
          || d.inLinks.filter(function(a){ return a.selected; }).length
          || d.outLinks.filter(function(a){ return a.selected; }).length
      };
    }

    $scope.selectOutConnected = function(){
      if (!$scope.status.selection.length) return;
      $scope.status.selectFunction = function(d){
        return d.selected
          || d.outLinks.filter(function(a){ return a.selected; }).length
      };
    }

    $scope.selectInConnected = function(){
      if (!$scope.status.selection.length) return;
      $scope.status.selectFunction = function(d){
        return d.selected
          || d.inLinks.filter(function(a){ return a.selected; }).length
      };
    }

    $scope.delete = function(){
      if (!$scope.status.selection.length) return;
      $scope.status.selection.forEach(function(d){ d.hidden = true; })
      $scope.status.selection = [];
      $scope.selectNone();
      $scope.$broadcast("update");
    }

    $scope.unlock = function(){
      if (!$scope.status.selection.length) return;
      $scope.status.selection.forEach(function(d){ d.fixed = false; })
      //$scope.status.selection = [];
      //$scope.selectNone();
      $scope.$broadcast("update");
    }

    $scope.lock = function(){
      if (!$scope.status.selection.length) return;
      $scope.status.selection.forEach(function(d){ d.fixed = true; })
      //$scope.status.selection = [];
      //$scope.selectNone();
      $scope.$broadcast("update");
    }

    $scope.applyNoLayout = function(){
      $scope.$broadcast("applyNoLayout");
    }

    $scope.applyForceLayout = function(){
      $scope.$broadcast("applyForceLayout");
    }

    $scope.applyGroupLayout = function(){
      $scope.$broadcast("applyGroupLayout");
    }


  }])

  .controller('mainCtrl', ['$scope', 'dataService', function($scope, dataService) {

    $scope.$watch("status.searching", function(searching){
      $scope.status.selectFunction = function(d){
        return searching.length && d.data.name.toLowerCase().search(searching.toLowerCase()) != -1;
      };
    })


    //$scope.newGroupName = "dasdsa";
		// Major settings
		$scope.enableLayout = false;
    $scope.running = true;
    $scope.grouping = false;
    //$scope.selection = [];
  //  $scope.showLinks = true;

    $scope.linkStrength = 1;

  }])
