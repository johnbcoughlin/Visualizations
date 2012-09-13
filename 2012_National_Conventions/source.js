document.bgColor="#211B10"
var w = 1200,
    h = 700;

var vis = d3.select("body").append("svg")
    .attr("width", "100%")
    .attr("height", "100%");

var partyColors = d3.scale.sqrt()
    .domain([-.4, 0, .4])
    .range(["red", "white", "blue"]);

var cloud = d3.layout.force()
    .gravity(0.5)
    .friction(0.2)
    .charge(function(d) { return -100 * d.N; })
    .size([1200, 700]);

d3.json("data.json", function(nodes) {
    // Initialize the cloud to random positions
    nodes.forEach(function(d) { 
        d.x = Math.random() * w * 0.9;
        d.y = Math.random() * h * 0.9;
    });
    var wordSet = vis.selectAll("g")
        .data(nodes)
      .enter().append("svg:g")
        .call(cloud.drag)
      .append("svg:text")
        .attr("font-size", function(d) { return 3 * Math.sqrt(d.N); })
        .attr("font-family", "sans-serif")
        .attr("fill", function(d) { return partyColors(d.coefficient); })
        .text(function(d) { return d.text; });

    var links = d3.merge(nodes.map(function(node) { return getLinks(node, nodes); }));

    cloud.nodes(nodes)
        .links(links)
        .linkDistance(20)
        .start()
        .alpha(.2);
    
    cloud.on("tick", function(e) { 
        wordSet.data(cloud.nodes())
            .attr("x", function(d) { return d.x; })
            .attr("y", function(d) { return d.y; });
    });

    console.log(cloud.nodes());

});

var getLinks = function(node, nodeSet) {
    if (node.hasOwnProperty("neighbors")) {
        neighbors = node.neighbors;
        return neighbors.map(function(neighborText) { 
            for (var i=0; i < nodeSet.length; i++) {
                if(nodeSet[i].text == neighborText) {
                    return {"source": node, "target": nodeSet[i]};
                }
            }
            return {"source": nodeSet[0], "target": nodeSet[1]};
        });
    } else {
        return [];
    }
}
