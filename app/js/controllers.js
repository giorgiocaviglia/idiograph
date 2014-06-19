'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
  .controller('appCtrl', ['$scope', 'dataService', 'History', function($scope, dataService, History) {
    
    $scope.status = {
      showLinks : true,
      showLabels : false,
      zoom : null,
      editing : false,
      selection : [],
      searching : "",
      selectFunction : null,
      // grouping
      groupName : "group",
      groupValue : null,
      text : ""
    };


    $scope.parse = function(){

      var text = $scope.status.text;
      if (!text) return;

      /*$scope.data = {};
      $scope.metadata = [];
      $scope.error = false;*/

      try {
        var parser = raw.parser();
        var data = parser(text);
        //var metadata = parser.metadata(text);
        $scope.error = false;

        // let's create proper data objects
        data = data.map(function(d){
          return {
            groups : {},
            tags : [],
            data: d 
          };
        })

        $scope.data = { nodes: data, links:[] };
        $scope.status.text = "";
        //$scope.previous = JSON.parse(JSON.stringify($scope.data), jsondiffpatch.dateReviver);

      } catch(e){
        $scope.data = {};
        $scope.metadata = [];
        $scope.error = e.name == "ParseError" ? +e.message : false;
      }

    }



    // loading letters
    dataService.loadData('data/graph.json').then(

      function(data){
        $scope.data = { nodes: [], links:[] };
        $scope.data.links = data.links;
        $scope.data.nodes = data.nodes.map(function(d){
          return {
            groups : {},
            tags : [],
            data: d 
          };
        })
        console.log(data.links)
        $scope.$broadcast("update");

        }, 
      
      function(error){
        $scope.error = error;
      }

    );

    /*

    // loading people
    dataService.loadData('data/people.tsv').then(

      function(data){

        $scope.data = { nodes: d3.tsv.parse(data), links:[] };

        // let's create proper data objects
        $scope.data.nodes = $scope.data.nodes.map(function(d){
          return {
            groups : {},
            tags : [],
            data: d 
          };
        })

        // loading letters
        dataService.loadData('data/letters.tsv').then(

          function(data){

            var links = d3.tsv.parse(data),
                nodes = {},
                usedNodes = [];

            $scope.data.nodes.forEach(function(d,i){
              nodes[d.data.id] = i;
            })

            
            links.forEach(function(d){
              d.source = nodes[d.author];
              d.target = nodes[d.recipient];
              if (d.source && d.target) {
                usedNodes.push(d.source);
                usedNodes.push(d.target);
              }
            })

            $scope.data.links = links
              .filter(function(d){ return d.target && d.source; })
              .map(function(d){ return { source : d.source, target : d.target, value : 1 }; })
              //.slice(0,1000)

            $scope.data.nodes.forEach(function(d,i){
              if (usedNodes.indexOf(i) == -1) {
                d.hidden = true;
              }
            })

            if(!$scope.$$phase) $scope.$apply();
            $scope.$broadcast("update");

            }, 
          
          function(error){
            $scope.error = error;
          }

        );



        }, 
      
      function(error){
        $scope.error = error;
      }

    );

    */

    /* Import */

    $scope.import = function(){

    }

    $scope.history = [];

    $scope.diffpatcher = jsondiffpatch.create({
          objectHash: function(obj) {
              return obj.id;
          }
      });

    /*$scope.$watch('data', function(){
      console.log("bababa")
      if (!$scope.data) return;
      $scope.register()
    },true)*/

    // Registering an action into history
    $scope.register = function(){

      // Rough cleaning of circular entities
      $scope.data.nodes.forEach(function(d){
        delete d.parent;
        delete d.children;
        delete d.clusterObject;
        delete d.inLinks;
        delete d.outLinks;
      })

      
      var delta = $scope.diffpatcher.diff($scope.data, $scope.previous);
      //$scope.diffpatcher.patch($scope.data, delta)
      $scope.history.push(delta);
      $scope.previous = JSON.parse(JSON.stringify($scope.data), jsondiffpatch.dateReviver);
      if(!$scope.$$phase) $scope.$apply();

      console.log(delta);


    }

    $scope.undo = function(){
      var delta = $scope.history.pop()//[$scope.history.length-1];
      $scope.diffpatcher.unpatch($scope.data, delta);
      console.log($scope.data);
      $scope.previous = JSON.parse(JSON.stringify($scope.data), jsondiffpatch.dateReviver);

      if(!$scope.$$phase) $scope.$apply();
      $scope.$broadcast("update");

    }

    $scope.redo = function(){
      
    }

    // Operations on data

    $scope.merge = function(){
      if ($scope.status.selection.length<2) return;

      var ids,
          node = { data: {}, groups: {}, tags:[] },
          points = [],
          nodeId = $scope.data.nodes.length,
          inLinks = [],
          outLinks = [];

      ids = $scope.status.selection.map(function(d){
        points.push([d.x,d.y])
        return d.id;
      })
      // only 'external' in links 
      inLinks = $scope.data.links.filter(function(link){
        return ids.indexOf(link.source) != -1 && ids.indexOf(link.target) == -1;
      })

      // only 'external' out links 
      outLinks = $scope.data.links.filter(function(link){
        return ids.indexOf(link.target) != -1 && ids.indexOf(link.source) == -1;
      })

      inLinks = inLinks.map(function(d){
        return {
          source: nodeId,
          target: d.target,
          value: 1
        }
      })

      outLinks = outLinks.map(function(d){
        return {
         source: d.source,
          target: nodeId,
          value: 1
        }
      })

      var _inLinks = [],
          _outLinks = [];
      
      inLinks.forEach(function(d){
        if (_inLinks.filter(function(l){ return l.source == d.source && l.target == d.target; }).length == 0) _inLinks.push(d);
      })

      outLinks.forEach(function(d){
        if (_outLinks.filter(function(l){ return l.source == d.source && l.target == d.target; }).length == 0) _outLinks.push(d);
      })

      $scope.status.selection.forEach(function(d){
        d.hidden = true;
      })

      node.px = node.x = points.length > 2 ? d3.geom.polygon(points).centroid()[0] : (points[0][0] + points[1][0])/2//- $scope.status.zoom.translate()[0]) * $scope.status.zoom.scale()
      node.py = node.y = points.length > 2 ? d3.geom.polygon(points).centroid()[1] : (points[0][1] + points[1][1])/2//- $scope.status.zoom.translate()[1]) * $scope.status.zoom.scale()
      node.fixed = true;
      node.merge = true;
      node.mergeNodes = $scope.status.selection;

      $scope.data.nodes.push(node);

      $scope.data.links = $scope.data.links.concat(_inLinks);
      $scope.data.links = $scope.data.links.concat(_outLinks);

      $scope.selectNone();
      $scope.$broadcast("update");

    }

    $scope.unmerge = function(){
      if (!$scope.status.selection.length) return;

      $scope.status.selection.filter(function(d){ return d.merge; })
      .forEach(function(d){
        d.hidden = true;
        d.mergeNodes.forEach(function(n){
          n.hidden = false;
        })
      })
      $scope.selectNone();
      $scope.$broadcast("update");

    }

    $scope.grouping = function(){
      if (!$scope.status.selection.length) return;
      $scope.status.selection.forEach(function(d){
        d.groups[$scope.status.groupName] = $scope.status.groupValue;
      })
      $scope.status.groupValue = "";
      $scope.$broadcast("update");
    }

    $scope.changeValue = function(key,value,item){
      item[key] = value;
    }

    $scope.addValue = function(key,value,item){
      item[key] = value;
      $scope.status.newKey = "";
      $scope.status.newValue = "";
    }

    // UIUX

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

    $scope.selectMerged = function(){
      $scope.status.selectFunction = function(d){ return d.merge; };
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

    $scope.selectIsolated = function(){
      $scope.status.selectFunction = function(d){
        return !d.outLinks.length && !d.inLinks.length;
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

    // Keyboard shortcuts

    // Select All
    Mousetrap.bind(['command+a', 'ctrl+a'], function() {
      $scope.selectAll();
      $scope.$apply();
      return false;
    });
    // Select Inverse
    Mousetrap.bind(['command+i', 'ctrl+i'], function() {
      $scope.selectInverse();
      $scope.$apply();
      return false;
    });
    // Delete
    Mousetrap.bind(['backspace'], function() {
      $scope.delete();
      return false;
    });
    // Editing Mode
    Mousetrap.bind(['e'], function() {
      $scope.status.editing = true;
      return false;
    });
    // Dragging Mode
    Mousetrap.bind(['v','a'], function() {
      $scope.status.editing = false;
      return false;
    });

  }])

  .controller('mainCtrl', ['$scope', 'dataService', function($scope, dataService) {

    $scope.$watch("status.searching", function(searching){
      $scope.status.selectFunction = function(d){
        return searching.length && d.data.name && d.data.name.toLowerCase().search(searching.toLowerCase()) != -1;
      };
    })


    //$scope.newGroupName = "dasdsa";
		// Major settings
    $scope.running = true;
    //$scope.selection = [];
  //  $scope.showLinks = true;

    $scope.linkStrength = 1;

  }])
