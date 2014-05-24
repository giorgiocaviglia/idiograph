'use strict';

/* Directives */


angular.module('myApp.directives', [])

	.directive('graph', function ($rootScope, dataService) {
    return {
      restrict: 'A',
      link: function postLink(scope, element, attrs) {
        
        var graph = d3.graph();

        var svg = d3.select(element[0])
            .append("svg");

        function update(){
        	if (!scope.data) return;

        	graph
        		.width(element.width())
        		.height(600)
                .linkStrength(scope.enableLayout ? 1 : 0)
                .group(scope.grouping ? "group" : null)
                .showLinks(scope.showLinks)
        		
        	svg
        		.datum(scope.data)
        		.call(graph);
        }

        scope.$watch('data', update);
        scope.$watch('enableLayout', update);
        scope.$watch('grouping', update);
        scope.$watch('showLinks', update);  
        scope.$watch('running', function(running){
            if (!running) graph.stop();
            else graph.start();
        });        

      }
    };
  })