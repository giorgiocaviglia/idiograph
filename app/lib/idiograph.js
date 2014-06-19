!function(){

	d3.graph = function(){

		var svg,
				_data,
				// Main data objects
				nodes, links,
				// Grouping
				group,
				// Labeling
				label,
				// Layouts
				pack, force,
				// Zoom, Drag & Brush
				zoom, drag, brush,
				zoomingFunction, shiftKey, panning,
				// Main elements
				node, link,
				// Other elements
				overlay, dragLine,
				// Event dispatcher
				dispatch = d3.dispatch(
					'selected',
					'forceStart',
					'forceEnd',
					'zoomEnd'
					),

				// options,
				showLinks = true,
				showLabels = true,
				editing = false,

				//mouse vars
				selectedNode = null,
		    selectedLink = null,
		    mousedownLink = null,
		    mousedownNode = null,
		    mouseupNode = null,

				// Graphics
				width, height,
				color,
				nodeTip,
				line = d3.svg.line().interpolate('bundle'),
				nodePadding = 20,
				clusterPadding = nodePadding * 2.5; // magic

		function chart(selection){
			
			// Make the selection available globally
			svg = selection;

			svg.each(function(data){

				_data = data;

				// Circle packing (for clustering)
			  pack = pack || d3.layout.pack()
          .sort(null)
          .padding(nodePadding)
          .children(function (d) { return d.values; })
          .value(function (d) { return d.size; })

        // force directed graph
				force = force || d3.layout.force()
				  .charge(-120)
				  .linkDistance(50)
				  .linkStrength(0)//linkStrength)
			    .on("tick", redraw)
			    .on("end", lockNodes)
			    .on("start.force", forceStart)
			    .on("end.force", forceEnd)

				// Updates nodes and links
				// from this moment on use only nodes and links
				updateNodesLinks(_data);

			  // drag function
			  drag = drag || force.drag()
					.on("drag.force", function (a) {
						if (editing) return;
						 node
							.filter(function(d){ return d.selected; })
							.each(function(d){
								d.fixed = true;
								d.x=d.px = d.x + d3.event.dx / zoom.scale();
								d.y=d.py = d.y + d3.event.dy / zoom.scale();
							})
						redraw();
						//force.resume();
					})

        zoom = zoom || d3.behavior.zoom()
        	.on("zoom", redraw)
        	.on("zoomend", zoomEnd)

        zoomEnd(zoom);

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
		        	if (editing) {
		        		d3.select(this).select(".extent").remove();
		        		return;
		        	}
		          var extent = d3.event.target.extent();
		          node.classed("selected", function(d) {
		            return d.selected = d.previouslySelected ^
		                (extent[0][0] <= (d.x * zoom.scale() + zoom.translate()[0]) && (d.x * zoom.scale() + zoom.translate()[0]) < extent[1][0]
		                && extent[0][1] <= (d.y * zoom.scale() + zoom.translate()[1]) && (d.y * zoom.scale() + zoom.translate()[1]) < extent[1][1]);
		          });
		          selected();
		        })
		        .on("brushend", function() {
		          d3.event.target.clear();
		          d3.select(this).call(d3.event.target);
		        }));

        d3.select("body")
			    .attr("tabindex", 1)
			    .on("keydown.brush", keyflip)
			    .on("keyup.brush", keyflip)
			    .each(function() { this.focus(); })

			  d3.select(window)
			  	.on("keydown.pan", keydown)
			  	.on("keyup.pan", keyup)

			  svg.attr("width", width)
			  	.attr("height", height)
			  	.call(zoom)

			  // Registering the original listener
			  zooming = svg.on("mousedown.zoom");

			  svg
    			.on("mouseup.selection", selected)
    			.on("mousemove", function(){ if (editing) mouseMoveEditing(this); })
    			.on("mouseup", function(){ if (editing) mouseUp(); })
    			.on("mousedown", function(){ if (editing) mouseDown(this); })
    			.on("dblclick.zoom", null)
			  	.on("mousedown.zoom", null)
			    .on("touchstart.zoom", null)
			    .on("touchmove.zoom", null)
			    .on("touchend.zoom", null);

			  nodeTip = d3.tip()
			  	.offset([-10, 0])
			  	.attr("class","d3-tip")
			  	.html(label);

				svg.call(nodeTip)

				// Main links container
				link = link || svg.append("g")
			 		.attr("class","links")
			 		.selectAll(".link");

			 	// line displayed when dragging new nodes
				dragLine = dragLine || svg.append('svg:path')
  				.attr('class', 'link dragline hidden')
  				.attr('d', 'M0,0L0,0');
			 	
			 	// Main nodes container
			 	node = node || svg.append("g")
			 		.attr("class","nodes")
			 		.selectAll(".node");

			 	// For zoom
			 	overlay = overlay || svg.append("rect")
					.attr("class","overlay")
					.classed("active", false)
					.attr("width", width)
					.attr("height", height)
					.attr("fill-opacity", 0);

				// Update SVG elements
				updateElements();

			})
		}

		// Updating the data
		function updateNodesLinks(data){

			// Nodes
			
			// Nodes clustering (for groupings)
			var clusters = d3.nest()
	        .key(function (d) { return group(d) ? group(d) : null; })
	        .rollup(function (d){
	            return { 
	            	// distinguish b/w nodes and clusters
	              isNode : false,
	              // if not grouping let's create a generic null cluster
	              cluster : group(d[0]) ? group(d[0]) : null,
	              size: 0
	            } 
	        })
	        .map(data.nodes);

	    // Let's create an id if not present
	    // to everyone, even the invisibles!
	    data.nodes.forEach(function(d,i){
    		d.id = d.hasOwnProperty("id") ? d.id : i;
    	})
      
      // Filtering out invisible (removed) nodes
      var elements = data.nodes.filter(function(d){
	    		return !d.hidden;
	    	})
	      .map(function (d,i) {
	      	d.label = label(d.data);
	      	d.isNode = true;
	      	d.cluster = group(d) ? group(d) : null;
	      	d.clusterObject = group(d) ? clusters[group(d)] : clusters[null];
	      	d.size = 1;
	      	// Links
	      	d.inLinks = [];
	      	d.outLinks = [];
	      	return d;
	      });

      // Combine elements and clusters into nodes
      nodes = elements.concat(d3.values(clusters));

      // Links

      // We cannot rely on positions (index) any more since we lost that by filtering
      var elementsMap = d3.map();

			elements.forEach(function(d){ elementsMap[d.id] = d; })
			
			// Filtering out links from/to invisible (removed) nodes
			links = data.links.filter(function(d){
				return elementsMap[d.source] && elementsMap[d.target];
			})
			.map(function(d){
				
				// Updating links references into nodes
				elementsMap[d.source].outLinks.push(elementsMap[d.target])
				elementsMap[d.target].inLinks.push(elementsMap[d.source])

				// reference to nodes objects instead of ids
				return {
					source : elementsMap[d.source],
					target : elementsMap[d.target],
					value : linkValue(d),
					data : {}
				}
				
			})

			// Update color scale
			color = d3.scale.ordinal().range(divergingRange(d3.keys(clusters).length));

			// Update packing

			pack
				.size([width, height])
				.nodes({
	        values: d3.nest()
	          .key(function (d) { return d.cluster; })
	          .entries(nodes)
	        }
		    );

		  force
		  	.size([width, height])
	      .nodes(nodes)
	      .links(links)
	      .start();
		}

		// Update SVG elements
		function updateElements(){

			// Links

			// Update
			link = link.data(showLinks ? links : []);
			// Add new
		 	link.enter()
		 		.append('svg:path')
		    .attr('class', 'link')
		  // Remove old
			link.exit().remove();
				 	
			// Nodes

			// Update
			node = node.data(nodes.filter(function(d){ return d.isNode; }), function(d){ return d.id; });

		 	node
		 		.classed("selected", function(d){ return d.selected; })
				.selectAll(".point")
		 		.style("fill", function(d){ return color(d.cluster); })

		 	node.selectAll("text")
		 		.text(showLabels ? label : null);

		 	// Add new
		 	var g = node.enter()
		 		.append('g')
		 		.attr("class","node")
		 		.classed("cluster", function(d){ return !d.isNode; })
		 		.classed("selected", function(d){ return d.selected; })
		 		.call(drag)
		 		.on("mousedown", function (d) {
	        if (editing) mouseDownEditing(d);
	        else mouseDownDragging(d,this);
	      })
	      .on("mouseup", function (d) {
	        if (editing) mouseUpEditing(d);
	      })
	      .on("mouseover", nodeTip.show)
				.on("mouseout", nodeTip.hide)

				//.on("mouseover.highlight", highlightLinked)
				//.on("mouseout.highlight", unhighlightLinked)

/*	      .on('mouseover', function(d) {
		      if(!mousedownNode || d === mousedownNode) return;
		    })
		    .on('mouseout', function(d) {
		      if(!mousedownNode || d === mousedownNode) return;
		    })

		 	// Voronoi circles for better selection
		 	g.append('circle')
		 		.attr("class", "voronoi")
    		.attr('r', 40)
		 	//	.style("fill", function(d){ return color(d.cluster); })
    		.attr('fill-opacity', 0);
*/
		 	g.append("circle")
		 		.attr("class","point")
		 		.style("fill", function(d){ return color(d.cluster); })
    //		.on("mouseover", nodeTip.show)
		// 		.on("mouseout", nodeTip.hide)
				//.attr("r",5)
		 		.transition()
    	  .duration(500)
        .attrTween("r", function(d) {
            var i = d3.interpolate(0, 5);
            return function(t) { return d.radius = i(t)  };
        });

      g.append("text")
      	.attr("dx", 12)
      	.attr("dy", ".35em")
      	.text(showLabels ? label : null);

      // Remove old
		 	node.exit().remove();

		 	nodeTip.hide();

		 	redraw();

		}

		// Force tick
		function tick(e){
			//if (e.alpha <= 0.01) return;
	  	node.each(cluster(e.alpha))
          .each(collide(.5))
	    redraw();
	  }

		// Redraw the elements
		function redraw(){
			
			link.attr("d", curve);
			
			node
				.classed("selected", function(d){ return d.selected; })
				.attr('transform', function(d) {
		    return 'translate(' + (d.x * zoom.scale() + zoom.translate()[0]) + ',' + (d.y * zoom.scale() + zoom.translate()[1]) + ')';
		  })
		  //.attr('clip-path', function(d) { return 'url(#clip-'+d.index+')'; });

			node.classed("fixed", function(d){ return d.fixed; })

		}

		function highlightLinked(a) {	
			node
				.classed("muted", function(d){ 
        		return d !== a
        		&& !d.inLinks.filter(function(b){ return a === b; }).length
        		&& !d.outLinks.filter(function(b){ return a === b; }).length
				})
		}

		function unhighlightLinked(d) {
			node.classed("muted", false)
		}

		// Listeners

		// Mouse

		// Mouse Over

		// Mouse Down Dragging mode
		function mouseDownDragging(d,that){
			if (shiftKey) d3.select(that).classed("selected", d.selected = !d.selected);
      else if (!d.selected) {
      	node.classed("selected", function(p) { return p.selected = d === p; });
      }
		}

		// Mouse Down Editing mode
		function mouseDownEditing(d,i){

      // select node
      mousedownNode = d;
      if(mousedownNode === selectedNode) selectedNode = null;
      else selectedNode = mousedownNode;
      selectedLink = null;

      // reposition drag line
      dragLine
        .classed('hidden', false)
        .attr('d', 'M' + mousedownNode.x + ',' + mousedownNode.y + 'L' + mousedownNode.x + ',' + mousedownNode.y);

      redraw();
		}

		function mouseMoveEditing(that) {
			  if(!mousedownNode) return;
			  // update drag line
			  dragLine.attr('d', function(){
			  	var d = {
			  		source:mousedownNode,
			  		target : {
			  			x: d3.mouse(that)[0],
			  			y: d3.mouse(that)[1]
			  		}
			  	}
			  	return 'M' + (mousedownNode.x * zoom.scale() + zoom.translate()[0]) + ',' + (mousedownNode.y * zoom.scale() + zoom.translate()[1]) + 'L' + d3.mouse(that)[0] + ',' + d3.mouse(that)[1];
			  	//return curve(d);
			  })
			}

		// Mouse Down Editing mode
		function mouseUpEditing(d,i){
			if(!mousedownNode) return;
      // needed by FF
      dragLine
        .classed('hidden', true)

      // check for drag-to-self
      mouseupNode = d;
      if(mouseupNode === mousedownNode) { resetMouseVars(); return; }

      var source, target;
      
      source = mousedownNode;
      target = mouseupNode;

      var newLink = links.filter(function(l) {
        return (l.source === source && l.target === target);
      })[0];

      if(!newLink) {
        newLink = {source: source.id, target: target.id, value: 1, data : {}};
        _data.links.push(newLink)
        updateNodesLinks(_data);
				updateElements();
      }

      // select new link
      selectedLink = newLink;
      selectedNode = null;
		}

		function mouseDown(that) {
				if (panning) return;
			  // prevent I-bar on drag
			  //d3.event.preventDefault();
			  
			  // because :active only works in WebKit?
			  svg.classed('active', true);

			  if(mousedownNode || mousedownLink) return;

			  // insert new node at point
			  var point = d3.mouse(that);

			  addNode(point);
			}

			function mouseUp() {
			  if(mousedownNode) {
			    // hide drag line
			    dragLine
			      .classed('hidden', true)
			      .style('marker-end', '');
			  }

			  // because :active only works in WebKit?
			  svg.classed('active', false);

			  // clear mouse event vars
			  resetMouseVars();
			}

		function selected(){
			dispatch.selected(node.filter(function(d){ return d.selected; }))
		}

		// Key Flip (for SHIFT)
		function keyflip() {
		  shiftKey = d3.event.shiftKey || d3.event.metaKey;
		}

		// Key Down
		function keydown(){
			switch(d3.event.keyCode) {
				case 32: // spacebar
					panning = true;
					overlay.classed("active", true);
					// Restoring the original zooming
					svg
				  	.on("mousedown.zoom", zooming)
				    .on("touchstart.zoom", zooming)
				    .on("touchmove.zoom", zooming)
				    .on("touchend.zoom", zooming);
				  return false;
					break;
		  }
		}

		// Key Up
		function keyup(e){
			switch(d3.event.keyCode) {
				case 32: // spacebar
					panning = false;
					overlay.classed("active", false);
					svg
				  	.on("mousedown.zoom", null)
				    .on("touchstart.zoom", null)
				    .on("touchmove.zoom", null)
				    .on("touchend.zoom", null);
					break;
		  }
		}

		function forceStart(){
			dispatch.forceStart();
		}

		function forceEnd(){
			dispatch.forceEnd();
		}
		
		function zoomEnd(){
			dispatch.zoomEnd(zoom);
		}


		// Layouts
		function unlockNodes(){
			nodes.forEach(function(d){ d.fixed = !d.selected; }) //<<<< DA RIVEDERE! interessante // = false })
		}

		function lockNodes(){
			nodes.forEach(function(d){ d.fixed = true; })
		}

		// Data

		function addNode(point){
			var n = { data:{}, groups:{}, tags : [] };
			if (point){
				n.px = n.x = (point[0] - zoom.translate()[0]) / zoom.scale() ;
				n.py = n.y = (point[1] - zoom.translate()[1]) / zoom.scale() ;
			}

			n.fixed = true;
			node.each(function(d){ d.selected = false; })
			n.selected = true;

			_data.nodes.push(n);
			updateNodesLinks(_data);
			updateElements();
		}

		// Utilities

		function resetMouseVars() {
		  mousedownNode = null;
		  mouseupNode = null;
		  mousedownLink = null;
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


		function divergingRange(n){
		  return d3.range(n).map(function (d){
		    return d3.hsl( 360 / n * d, .4, .58 ).toString();
		  })
		}

		// Clusterize
		function cluster(alpha) {
			// Provisional to stop the force...
   		/*if (alpha < .01) return function(d){ 
   			force.alpha(0);
   		};*/
		  return function(d) {
          if (!d.isNode) return;
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

		// Accessor functions

		function group(d){
			return null;
		}

		function label(d){
			return d.id;
		}

		function linkValue(d){
			return 1;
		}

		// Getters & Setters

		chart.selectNodes = function (f) {
			if (!node) return;
			node
				.each(function(d){ d.preSelected = f(d); })
				.classed("selected", function(d){ return d.selected = d.preSelected; })
			dispatch.selected(node.filter(function(d){ return d.selected; }));
		}

		// TODO: provare a limitare l'unlockNodes solo ai selezionati d.selected

		chart.applyForceLayout = function() {
			unlockNodes()
			force
				.linkStrength(1)
       	.on("tick", redraw)
				.start();
		};

		chart.applyNoLayout = function() {
			unlockNodes()
			force
				.linkStrength(0)
       	.on("tick", redraw)
				.start();
		};

		chart.applyGroupLayout = function() {
			unlockNodes()
       force
       	.linkStrength(0)
       	.on("tick", tick)
       	.start();
		};

		chart.editing = function(_) {
			if (!arguments.length) return editing;
			editing = _;
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

		chart.group = function(_) {
			if (!arguments.length) return group;
			group = _;
			return chart;
		};

		chart.label = function(_) {
			if (!arguments.length) return label;
			label = _;
			return chart;
		};

		chart.linkValue = function(_) {
			if (!arguments.length) return linkValue;
			linkValue = _;
			return chart;
		};

		chart.showLinks = function(_) {
			if (!arguments.length) return showLinks;
			showLinks = _;
			if(link) updateElements();
			return chart;
		};

		chart.showLabels = function(_) {
			if (!arguments.length) return showLabels;
			showLabels = _;
			if(node) updateElements();
			return chart;
		};

		d3.rebind(chart, dispatch, "on");

		return chart;

	}

}();
