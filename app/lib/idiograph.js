!function(){

	d3.graph = function(){

		var width, height,
				zoom,
				nodes, links,
				force,
				voronoi,
				pack,
				nodePadding = 30,
				clusterPadding = nodePadding * 2.5,
				group, clusters, clusterGroup,
				linkStrength = 1,
				line = d3.svg.line().interpolate('bundle'),
				overlay, link, node, circle,
				dispatch = d3.dispatch('nodeMousedown'),
				selectedNode,
				showLinks = false,
				color;

		function chart(svg){
			svg.each(function(data){

				// creates nodes and links
			  nodes = createNodes(data.nodes);
			  links = createLinks(data.links);

			  // circle packing for clustering
			  pack = pack || d3.layout.pack()
	          .sort(null)
	          .padding(nodePadding)
	          .children(function (d) { return d.values; })
	          .value(function (d) { return d.size; })

	      pack
					.size([width, height])
          .nodes({
              values: d3.nest()
                  .key(function (d) { return d.cluster; })
                  .entries(nodes)
              }
          );

        // force directed graph
				force = force || d3.layout.force()
				  .charge(-120)
				  .linkDistance(30)
				  .linkStrength(linkStrength)

			  force
				  	.size([width, height])
			      .nodes(nodes)
			      .links(links)
			      .on("tick", tick);

			  // voronoi for selection
			  voronoi = voronoi || d3.geom.voronoi()
			    .x(function(d) { return d.x; })
			    .y(function(d) { return d.y; })
			    //.clipExtent([[-10, -10], [width+10, height+10]]);

			  zoom = zoom || d3.behavior.zoom().on("zoom", redraw);

			  // init svg elements
			  svg.attr("width", width)
			  	.attr("height", height).call(zoom);
				
				overlay = overlay || svg.append("rect")
					.attr("class","overlay")
					.attr("width", width)
					.attr("height", height)
					.attr("fill","none");
			 	
			 	link = link || svg.append("g")
			 		.attr("class","links")
			 		.selectAll(".link");
			 	
			 	node = node || svg.append("g")
			 		.attr("class","nodes")
			 		.selectAll(".node");


			 	function update() {

			 		// links

				 	link = link.data(showLinks ? links : []);

				 	link.enter().append('svg:path')
				    .attr('class', 'link')
				    //.attr("d", curve)

				  link.exit().remove();
				 	
				 	// nodes

				 	node = node.data(nodes.filter(function(d){ return d.type=="node"; }), function(d){ return d.id; });

				 	node.selectAll(".point")
				 		.style("fill", function(d){ return color(d.cluster); })

				 	var g = node.enter()
				 		.append('g')
				 		.attr("class","node")
				 		.classed("cluster", function(d){ return d.type == "cluster";})
				 		.call(drag)
				 		.on("mousedown", nodeMousedown)

				 	// Voronoi circles for better selection
				 	g.append('circle')
        		.attr('r', 30)
        		.attr('fill-opacity', 0);

				 	g.append("circle")
				 		.attr("class","point")
				 		.style("fill", function(d){ return color(d.cluster); })
				 		.attr("r", 4)
				 		.transition()
		    	  .duration(500)
		    	  //.delay(function(d, i) { return i * 5; })
            .attrTween("r", function(d) {
		            var i = d3.interpolate(0, 4);
		            return function(t) { return d.radius = i(t)  };
		        });

				 	node.exit().remove();				 	
					
				 	force.start();

			 	}


			function nodeMousedown(d){
				dispatch.nodeMousedown(d);
			}


			function divergingRange(n){
			  return d3.range(n).map(function (d){
			    return d3.hsl( 360 / n * d, .4, .58 ).toString();
			  })
			}


			function recenterVoronoi(nodes) {
			    var shapes = [];
			    voronoi(nodes).forEach(function(d) {
			        if ( !d.length ) return;
			        var n = [];
			        d.forEach(function(c){
			            n.push([ (c[0] * zoom.scale() + zoom.translate()[0]) - (d.point.x * zoom.scale() + zoom.translate()[0]), (c[1] * zoom.scale() + zoom.translate()[1]) - (d.point.y * zoom.scale() + zoom.translate()[1]) ]);
			        });
			        n.point = d.point;
			        shapes.push(n);
			    });
			    return shapes;
			}

			// Clustering
	    function cluster(alpha) {
	        return function(d) {
	            if (d.type != "node") return;
	            var cluster = d.clusterObject;
	            var x = d.x - cluster.x,
	                y = d.y - cluster.y,
	                l = Math.sqrt(x * x + y * y),
	                r = d.r + cluster.r;
	            if (l != r) {
	              l = (l - r) / l * alpha;
	              d.x -= x *= l;
	              d.y -= y *= l;
	              cluster.x += x;
	              cluster.y += y;
	            }
	        };
	    }

	    // Collision
    	function collide(alpha) {
        var quadtree = d3.geom.quadtree(nodes);
        return function(d) {
            var r = d.r + Math.max(nodePadding, clusterPadding),
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            
            quadtree.visit(function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== d)) {
                    var x = d.x - quad.point.x,
                        y = d.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.r + quad.point.radius + (d.cluster === quad.point.cluster ? nodePadding : clusterPadding);
                    if (l < r) {
                      l = (l - r) / l * alpha;
                      d.x -= x *= l;
                      d.y -= y *= l;
                      quad.point.x += x;
                      quad.point.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    	}
			 	

			/*
			 	Creates the nodes 
			*/

		  function createNodes(n) {

				var nodeClusters = d3.nest()
	        .key(function (d) { return group ? d.data[group] : null; })
	        .rollup(function (d){
	            return { 
	              type: 'cluster',
	              cluster: group !== null ? d[0].data[group] : null,
	              size: 0
	            } 
	        })
	        .map(n);

	      color = d3.scale.ordinal().range(divergingRange(d3.keys(nodeClusters).length));

        var nodeElements = n.map(function (d,i) {
        	d.id = i;
        	d.type = 'node';
        	d.cluster = group !== null ? d.data[group] : null;
        	d.clusterObject = group !== null ? nodeClusters[d.data[group]] : nodeClusters[null];
        	d.size = 1;
        	return d;
        });

	      return nodeElements.concat(d3.values(nodeClusters));
			}

			function createLinks (l) {
				
				var nodeElements = nodes.filter(function(d){ return d.type == "node"; });

				return l.map(function(d){
					return {
						source : nodeElements[d.source],
						target : nodeElements[d.target],
						value : d.value,
						data : {}
					}
					
				})

			}



			  function curve(d) {
					var source = d.source,
						target = d.target,
						sourceX = source.x * zoom.scale() + zoom.translate()[0],
						sourceY = source.y * zoom.scale() + zoom.translate()[1],
						targetX = target.x * zoom.scale() + zoom.translate()[0],
						targetY = target.y * zoom.scale() + zoom.translate()[1];
						rad = Math.sqrt( Math.pow(targetX-sourceX,2) + Math.pow(targetY-sourceY, 2) )/4,
						sourceP = Math.atan2((targetY-sourceY),(targetX-sourceX)) - Math.PI/8,
						targetP = Math.atan2((sourceY-targetY),(sourceX-targetX)) + Math.PI/8;
								
					return line([
						[sourceX, sourceY],
						[sourceX+rad*Math.cos(sourceP),sourceY+rad*Math.sin(sourceP)],
						[targetX+rad*Math.cos(targetP),targetY+rad*Math.sin(targetP)],
						[targetX,targetY]
					]);
				}

				function _curve(d) {
				  var dx = d.target.x - d.source.x,
				      dy = d.target.y - d.source.y,
				      dr = Math.sqrt(dx * dx + dy * dy);
				  return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
				}

			  function tick(e){
			  	if(group) node.each(cluster(10 * e.alpha * e.alpha))
	          .each(collide(.5))
			    redraw();
			  }

			  function redraw(){
					link.attr("d", curve);
					node.attr('transform', function(d) {
						    return 'translate(' + (d.x * zoom.scale() + zoom.translate()[0]) + ',' + (d.y * zoom.scale() + zoom.translate()[1]) + ')';
						  })
						  .attr('clip-path', function(d) { return 'url(#clip-'+d.index+')'; });

				  var clip = svg.selectAll('.clip')
			      .data( recenterVoronoi(node.data()), function(d) { return d.point.index; } );

			    clip.enter().append('clipPath')
			        .attr('id', function(d) { return 'clip-'+d.point.index; })
			        .attr('class', 'clip');
			    clip.exit().remove()

			    clip.selectAll('path').remove();
			    clip.append('path')
			        .attr('d', function(d) { return 'M'+d.join(',')+'Z'; });
				}

			  var drag = force.drag()
					.on("dragstart", function (d) {
						d3.event.sourceEvent.stopPropagation();
						d.fixed = true;
						//d3.select(this).classed("fixed", true).style('stroke', "#222");
					})
					.on("drag.force", function (d) {
						d.px = d.x + d3.event.dx / zoom.scale();
						d.py = d.y + d3.event.dy / zoom.scale();
						force.resume();
					});

			  update();
				
			})
		}

		

		chart.group = function(_) {
			if (!arguments.length) return group;
			group = _;
			return chart;
		};

		chart.showLinks = function(_) {
			if (!arguments.length) return showLinks;
			showLinks = _;
			return chart;
		};

		// controlling the force, Luke
		
		chart.stop = function() {
			if (!force) return;
			force.stop();
			return chart;
		};

		chart.start = function() {
			if (!force) return;
			force.start();
			return chart;
		};

		chart.linkStrength = function(_) {
			if (!arguments.length) return linkStrength;
			linkStrength = _;
			if (force) force.linkStrength(linkStrength);
			return chart;
		};

		chart.height = function(_) {
			if (!arguments.length) return height;
			height = _;
			return chart;
		};

		chart.width = function(_) {
			if (!arguments.length) return width;
			width = _;
			return chart;
		};

		d3.rebind(chart, dispatch, "on");

		return chart;

	}

}();
