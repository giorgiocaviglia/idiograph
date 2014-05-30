'use strict';

/* Directives */


angular.module('myApp.directives', [])

	.directive('graph', function () {
    return {
      restrict: 'A',

      link: function postLink(scope, element, attrs) {
        
        var graph = d3.graph();

        var svg = d3.select(element[0])
            .append("svg");

        function update(){
        	if (!scope.datas) return;

        	graph
        		.width(element.width())
        		.height(650)
            .linkStrength(scope.enableLayout ? 1 : 0)
            .group(scope.grouping ? "newGroup" : null)
            .showLinks(scope.status.showLinks)
            // listeners
            .on('selected', function(d){
                scope.status.selection = d.data()//.map(function(n){ return n.data; });
                if(!scope.$$phase) scope.$apply();
            })
            .editing(scope.status.editing)
          
        	svg
        		.datum(scope.datas)
        		.call(graph);
        }
        
        scope.$watch('datas', update);
        scope.$watch('enableLayout', update);
        scope.$watch('grouping', update);
        scope.$watch('status.showLinks', update);
        scope.$watch('status.editing', function(editing){
          graph.editing(editing)
        });
        scope.$watch('running', function(running){
            //graph.select(function(d){ return d.data.group == 1; })
            //if (!running) graph.stop();
            //else graph.start();
            if (!scope.datas || !scope.status.selection) return;
            scope.status.selection.forEach(function(d){ d.data.newGroup=Math.random() })
            update();
        });

        scope.$on("update", update);
        
        // selections
        scope.$watch('status.selectFunction', function(selectFunction){
          if (!selectFunction) return;
            graph.select(selectFunction);
        });

      }
    };
  })