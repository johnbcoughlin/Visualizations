var w = 1200,
    h = 900;

var vis = d3.select("body").append("svg:svg")
    .attr("width", w)
    .attr("height", h);

var map = vis.append("svg:g")
    .attr("id", "map");
var flightGroup = vis.append("svg:g")
    .attr("id", "arcs");
var concertGroup = vis.append("svg:g")
    .attr("id", "circles");

var defaultScale = 1200;
var mapCenter = [defaultScale * .5, defaultScale * .375];
var mapData = [];

var projection = d3.geo.mercator()
    .scale(defaultScale)
    .translate(mapCenter);

var mapPath = d3.geo.path()
    .projection(projection);

var arc = d3.geo.greatArc()
    .precision(1);

// Clip the paths at the greatest and least latitudes that we want to display
function clip(d) {
    latMax = 78;
    latMin = -72
    if(d.geometry.type == "Polygon") {
        d.geometry.coordinates[0].forEach(function(pt) { pt[1] = Math.max(latMin, Math.min(latMax, pt[1])); });
    } else {
        d.geometry.coordinates.forEach(function(shape) { shape[0].forEach(function(pt) { pt[1] = Math.max(latMin, Math.min(latMax, pt[1])); }); });
    }
    return mapPath(d);
}


d3.json("world-countries.json", function(collection) {
    mapData = collection.features;
    function drawMap() {
        map.selectAll("path").remove();
        map.selectAll("path")
            .data(mapData)
          .enter().append("svg:path")
            .attr("d", function(d) {
                var latMax = 78;
                var latMin = -72;
                if(d.geometry.type == "Polygon") {
                    d.geometry.coordinates[0].forEach(function(pt) { pt[1] = Math.max(latMin, Math.min(latMax, pt[1])); });
                } else {
                    d.geometry.coordinates.forEach(function(shape) { shape[0].forEach(function(pt) { pt[1] = Math.max(latMin, Math.min(latMax, pt[1])); }); });
                }
                return mapPath(d);
            });
    }
    drawMap();
});


var concertList;
var venueList;
var flightList = []

var timeouts = [];

function redrawConcerts() {
    concertGroup.selectAll("circle").remove();
    var circles = concertGroup.selectAll("circle")
        .data(concertList.sort(function(d) { return d.active; }))
      .enter().append("circle")
        .attr("class", function(d) { return d.active ? "active" : "inactive"; })
        .attr("r", function(d) { return d.active ? Math.pow(zoomScale, 0.3) * 2 : Math.pow(zoomScale, 0.3); })
        .attr("cx", function(d) { return projection(d.coords)[0]; })
        .attr("cy", function(d) { return projection(d.coords)[1]; });
}

function redrawFlights() {
    flightGroup.selectAll("path").remove();
    var arcs = flightGroup.selectAll("path")
        .data(flightList.filter(function(d) { return d.opacity > 0; }).sort(function(d) { return d.active; }))
      .enter().append("svg:path")
        .attr("class", function(d) { return d.active ? "active" : "inactive"; })
        .attr("opacity", function(d) { return d.opacity; })
        .attr("d", function(d) { return mapPath(arc(d)); });
}

function decayOnce() {
    flightList.forEach(function(d) { d.opacity = d.opacity - 0.125; });
}
        
function highlightConcert(i) {
    console.log("highlighting concert " + i);
    var venue = venueList.get(concertList[i].values[0].location);
    console.log(concertGroup.selectAll("circle").data());

    return;
}

function zoom() {
    console.log("zooming");
    projection.scale(defaultScale * d3.event.scale);
    projection.translate([
        mapCenter[0] * d3.event.scale + d3.event.translate[0],
        mapCenter[1] * d3.event.scale + d3.event.translate[1]
    ]);

    map.selectAll("path")
        .attr("d", mapPath);
    concertGroup.selectAll("circle")
        .attr("r", function(d) { return d.active ? Math.pow(d3.event.scale, .5) * 2 : Math.pow(d3.event.scale, .5) })
        .attr("cx", function(d) { return projection(d.coords)[0]; })
        .attr("cy", function(d) { return projection(d.coords)[1]; });
}

d3.json("concerts.json", function(json) {
    json.forEach(function(d) {
        d.date = new Date(d.date);
        d.coords = [d.lon, d.lat];
    });
    concertList = d3.nest()
        .key(function(d) { return d.date; })
        .sortKeys(function(d, e) { return d.date - e.date; })
        .entries(json);
   
    console.log(concertList);

    // Build arrays of difference values
    for(var i=0; i < json.length-1; i++) {
        timeouts[i] = (json[i+1].date - json[i].date) / (86400000 / 5);
        flightList.push({"source" : json[i].coords, "target" : json[i+1].coords, "opacity" : 0});
    }

    venueList = d3.map(d3.nest()
        .key(function(d) { return d.location; })
        .map(json));

    console.log(venueList.entries());
    console.log(venueList.get("Aalborg, Denmark"));

    concertGroup.selectAll("circle")
        .data(venueList.entries())
      .enter().append("circle")
        .attr("r", 1)
        .attr("cx", function(d) { return projection(d.value[0].coords)[0]; })
        .attr("cy", function(d) { return projection(d.value[0].coords)[1]; });

    flightGroup.selectAll("path")
        .data(flightList)
      .enter().append("svg:path")
        .attr("opacity", function(d) { return d.opacity; })
        .attr("d", function(d) { return mapPath(arc(d)); });

    highlightConcert(0);

    vis.call(d3.behavior.zoom()
            .scaleExtent([1, 100])
            .on("zoom", zoom));

});
