!function(){

	d3.graph = function(){

		var width, height,
				zoom, zooming, brush, shiftKey,
				nodes, links,
				force, drag, dragging,
				voronoi,
				pack,
				nodePadding = 30,
				clusterPadding = nodePadding * 2.5,
				group, clusters, clusterGroup,
				linkStrength = 1,
				line = d3.svg.line().interpolate('bundle'),
				overlay, link, node, circle,
				dispatch = d3.dispatch('selected'),
				selection,
				showLinks = false,
				nodeTip,
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

			  d3.select("body")
			    .attr("tabindex", 1)
			    .on("keydown.brush", keyflip)
			    .on("keyup.brush", keyflip)
			    .each(function() { this.focus(); })

			  // init svg elements
			  svg.attr("width", width)
			  	.attr("height", height)
			  	.call(zoom)

			  zooming = svg.on("mousedown.zoom");

			  svg
			  	//.on("keydown.brush", keyflip)
    			.on("mouseup.selection", selected)
    			.on("dblclick.zoom", null)
			  	.on("mousedown.zoom", null)
			    .on("touchstart.zoom", null)
			    .on("touchmove.zoom", null)
			    .on("touchend.zoom", null);


			  /*$(document).keydown(function(e) {
				    if(e.keyCode == 32) {
				        keydown();
				    }
				});*/

				d3.select(window)
			  	.on("keydown.pan", keydown)
			  	.on("keyup.pan", keyup)

			  brush = brush || svg.append("g")
		      .datum(function() { return { selected: false, previouslySelected: false }; })
		      .attr("class", "brush")
		      .call(d3.svg.brush()
		        .x(d3.scale.identity().domain([0, width]))
		        .y(d3.scale.identity().domain([0, height]))
		        .on("brushstart", function(d) {
		          node.each(function(d) { d.previouslySelected = shiftKey && d.selected; });
		        })
		        .on("brush", function() {
		          var extent = d3.event.target.extent();
		          node.classed("selected", function(d) {
		            return d.selected = d.previouslySelected ^
		                (extent[0][0] <= (d.x * zoom.scale() + zoom.translate()[0]) && (d.x * zoom.scale() + zoom.translate()[0]) < extent[1][0]
		                && extent[0][1] <= (d.y * zoom.scale() + zoom.translate()[1]) && (d.y * zoom.scale() + zoom.translate()[1]) < extent[1][1]);
		          });
		        })
		        .on("brushend", function() {
		          d3.event.target.clear();
		          d3.select(this).call(d3.event.target);
		        }));
			 	
			 	link = link || svg.append("g")
			 		.attr("class","links")
			 		.selectAll(".link");
			 	
			 	node = node || svg.append("g")
			 		.attr("class","nodes")
			 		.selectAll(".node");

			 	overlay = overlay || svg.append("rect")
					.attr("class","overlay")
					.classed("active", false)
					.attr("width", width)
					.attr("height", height)
					.attr("fill-opacity", 0);

				drag = drag || force.drag()
					.on("dragstart", function (d) {
						
					})
					.on("drag.force", function (a) {

						 node
							.filter(function(d){ return d.selected; })
							.each(function(d){
								d.fixed = true;
								d.px = d.x + d3.event.dx / zoom.scale();
								d.py = d.y + d3.event.dy / zoom.scale();
							})

						force.resume();
					})

			 	// brush

			 	nodeTip = d3.tip().attr("class","d3-tip").html(function(d) { return d.data.name; });

				svg.call(nodeTip)

				function selected(){
					dispatch.selected(node.filter(function(d){ return d.selected; }))
				}

			 	function update() {

			 		// links

				 	link = link.data(showLinks ? links : []);

				 	link.enter().append('svg:path')
				    .attr('class', 'link')
				    //.attr("d", curve)

				  link.exit().remove();
				 	
				 	// nodes

				 	node = node.data(nodes.filter(function(d){ return d.type=="node"; }), function(d){ return d.id; });

				 	node
						.selectAll(".point")
				 		.style("fill", function(d){ return color(d.cluster); })

				 	var g = node.enter()
				 		.append('g')
				 		.attr("class","node")
				 		.classed("cluster", function(d){ return d.type == "cluster";})
				 		.call(drag)
				 		.on("mouseover", function(){
			        //this.parentNode.appendChild(this);
			      })
				 		.on("mousedown", function(d) {
			        if (shiftKey) d3.select(this).classed("selected", d.selected = !d.selected);
			        else if (!d.selected) {
			        	node.classed("selected", function(p) { return p.selected = d === p; });
			        }
			      })

				 	//	.on("mouseover", nodeTip.show)
				 	//	.on("mouseout", nodeTip.hide)

				 	// Voronoi circles for better selection
				 	g.append('circle')
				 		.attr("class", "voronoi")
        		.attr('r', 30)
        		.attr('fill-opacity', 0);

				 	g.append("circle")
				 		.attr("class","point")
				 		.style("fill", function(d){ return color(d.cluster); })
				 		.attr("r", 5)
				 		.transition()
		    	  .duration(500)
		    	  //.delay(function(d, i) { return i * 5; })
            .attrTween("r", function(d) {
		            var i = d3.interpolate(0, 5);
		            return function(t) { return d.radius = i(t)  };
		        });

				 	node.exit().remove();				 	
					
				 	force.start();

			 	}

			function updateBrush() {
			    var extent = d3.event.target.extent();

			    d3.selectAll(".node").select("circle").classed("selected", function (d) {
			        if (extent[0][0]  <= d.x && d.x < extent[1][0]  && extent[0][1]  <= d.y && d.y < extent[1][1] ) {
			            if (d.group == "Domain") {
			                //                domains += d.name + ",";
			            }
			            return true;
			        }
			        return false;
			    });
			}

			function keyflip() {
			  shiftKey = d3.event.shiftKey || d3.event.metaKey;
			}


			function keydown(){

				d3.event.preventDefault();

				if (d3.event.keyCode == 32) {

					overlay.classed("active", true);

					svg
				  	.on("mousedown.zoom", zooming)
				    .on("touchstart.zoom", zooming)
				    .on("touchmove.zoom", zooming)
				    .on("touchend.zoom", zooming);
				  return false;
				}

			}

			function keyup(e){
				
				if (d3.event.keyCode == 32) {

					overlay.classed("active", false);

					svg
				  	.on("mousedown.zoom", null)
				    .on("touchstart.zoom", null)
				    .on("touchmove.zoom", null)
				    .on("touchend.zoom", null);
				}

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

			  	// check for SPACEBAR
			  	//var e = d3.event.sourceEvent

					link.attr("d", curve);
					node.attr('transform', function(d) {
						    return 'translate(' + (d.x * zoom.scale() + zoom.translate()[0]) + ',' + (d.y * zoom.scale() + zoom.translate()[1]) + ')';
						  })
						  .attr('clip-path', function(d) { return 'url(#clip-'+d.index+')'; });

					node.classed("fixed", function(d){ return d.fixed; })

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
