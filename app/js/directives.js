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
        	if (!scope.data) return;

        	graph
        		.width(element.width())
        		.height(650)
                .showLinks(scope.status.showLinks)
                // listeners
                .on('selected', function(d){
                    scope.status.selection = d.data()//.map(function(n){ return n.data; });
                    if(!scope.$$phase) scope.$apply();
                })
                .on('forceStart', forceStart)
                .on('forceEnd', forceEnd)
                .on('zoomEnd', zoomEnd)
                .group(group)
                .label(label)
            /*
            .editing(scope.status.editing)

            */
        	svg
        		.datum(scope.data)
        		.call(graph);

            //scope.register()//.push(dataService.saveStatus(scope.data,scope.previous))

        }

        function forceStart(){
            console.log("force started")
        }

        function forceEnd(){
            console.log("force ended")
        }

        function zoomEnd(d){
            scope.status.zoom = d;
        }

        function group(d){
            return d.groups.hasOwnProperty(scope.status.groupName) ? d.groups[scope.status.groupName] : null;
        }

        function label(d){
            return d.data ? d.data['name'] ? d.data['name'] : 'Untitled' : null;
        }



        scope.$watch('data', update);
        scope.$watch('enableLayout', update);
        scope.$watch('grouping', update);
        scope.$watch('status.showLinks', function(showLinks){
            graph.showLinks(showLinks);
        });
        scope.$watch('status.showLabels', function(showLabels){
            graph.showLabels(showLabels)
        });
        scope.$watch('status.editing', function(editing){
            graph.editing(editing)
        });
        scope.$watch('running', function(running){
            //graph.select(function(d){ return d.data.group == 1; })
            //if (!running) graph.stop();
            //else graph.start();
            //if (!scope.datas || !scope.status.selection) return;
            //scope.status.selection.forEach(function(d){ d.data.newGroup=Math.random() })
            //update();
            if(running) return
        });

        scope.$on("update", update);

        scope.$on("applyForceLayout", function(){
            graph.applyForceLayout();
        });
        scope.$on("applyGroupLayout", function(){
            graph.applyGroupLayout();
        });
        scope.$on("applyNoLayout", function(){
            graph.applyNoLayout();
        });

        // selections
        scope.$watch('status.selectFunction', function(selectFunction){
            if (!selectFunction) return;
            graph.selectNodes(selectFunction);
        });

      }
    };

  })

.directive('smooth', function () {
        return {
      restrict: 'A',

      link: function postLink(scope, element, attrs) {

        var graph = d3.smooth();

        var container = d3.select(element[0]);
        //.append("canvas")

        function update(){

            if (!scope.data || !scope.data.links.length) return;

            graph
              .width(element.width())
              .height(650)
              .on('selected', function(d){
                scope.status.selection = d.data()//.map(function(n){ return n.data; });
                if(!scope.$$phase) scope.$apply();
              })
              .showLinks(scope.status.showLinks)
                // listeners

                /*.on('forceStart', forceStart)
                .on('forceEnd', forceEnd)
                .on('zoomEnd', zoomEnd)*/
              .group(group)
              .label(label)

            container
              .datum(scope.data)
              .call(graph);

        }

        function group(d){
            return d.groups.hasOwnProperty(scope.status.groupName) ? d.groups[scope.status.groupName] : null;
        }

        function label(d){
            return d.data ? d.data['Full Name'] ? d.data['Full Name'] : 'Untitled' : null;
        }


        scope.$watch('data', update);

        scope.$on("update", update);

        scope.$on("applyForceLayout", function(){
            graph.applyForceLayout();
        });
        scope.$on("applyGroupLayout", function(){
            graph.applyGroupLayout();
        });
        scope.$on("applyNoLayout", function(){
            graph.applyNoLayout();
        });

        scope.$watch('status.showLinks', function(showLinks){
            graph.showLinks(showLinks);
        });
        scope.$watch('status.showLabels', function(showLabels){
            graph.showLabels(showLabels)
        });
        scope.$watch('status.editing', function(editing){
            graph.editing(editing)
        });

        // selections
        scope.$watch('status.selectFunction', function(selectFunction){
            if (!selectFunction) return;
            graph.selectNodes(selectFunction);
        });



      }
    };

  })
