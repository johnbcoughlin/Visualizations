// Begin by declaring variables and setting up the drawing space
var w = 1000, h = 750;
var defaultScale = w;
var mapCenter = [w / 2, h / 2];

var venueList = d3.map(), showList = d3.map(), flightList = d3.map(), dateList = [];
var activeVenues = [];
var tempActiveVenue = null;

// Append the svg canvas and drawing groups
var vis = d3.select("body").append("svg:svg")
    .attr("width", w)
    .attr("height", h);

var map = vis.append("svg:g")
    .attr("id", "map");
var flightGroup = vis.append("svg:g")
    .attr("id", "arcs");
var concertGroup = vis.append("svg:g")
    .attr("id", "circles");

// Define our projection and draw the map
var projection = d3.geo.mercator()
    .scale(defaultScale)
    .translate(mapCenter);

var mapPath = d3.geo.path()
    .projection(projection);

var arc = d3.geo.greatArc()
    .precision(1);

d3.json("world-countries.json", function(collection) {
    var geojson = collection.features;
    var latMax = 78;
    var latMin = -72;
    map.selectAll("path")
        .data(geojson)
      .enter().append("svg:path")
        .attr("d", function(d) {
            // This actually changes our geojson for real, so we only need to do it once.
            if(d.geometry.type == "Polygon") {
                d.geometry.coordinates[0].forEach(function(pt) { pt[1] = Math.max(latMin, Math.min(latMax, pt[1])); });
            } else {
                d.geometry.coordinates.forEach(function(shape) { shape[0].forEach(function(pt) { pt[1] = Math.max(latMin, Math.min(latMax, pt[1])); }); });
            }
            return mapPath(d);
        });
});

// Define some useful functions
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
        .attr("r", function(d) { return d.value.active ? Math.pow(d3.event.scale, .7) * 2 : Math.pow(d3.event.scale, .7) })
        .attr("cx", function(d) { return projection(d.value.coords)[0]; })
        .attr("cy", function(d) { return projection(d.value.coords)[1]; });

    flightGroup.selectAll("path")
        .attr("d", function(d) { return mapPath(arc(d)); });
}

function drawVenues() {
    concertGroup.selectAll("circle")
        .data(venueList.entries())
      .enter().append("circle")
        .attr("class", "inactive")
        .attr("r", 1)
        .attr("cx", function(d) { return projection(d.value.coords)[0]; })
        .attr("cy", function(d) { return projection(d.value.coords)[1]; });
}

function highlightVenues() {
    var activeLegs = [];
    concertGroup.selectAll("circle")
        .data(venueList.entries())
        .attr("class", function(d) { 
            if(activeVenues.indexOf(d.key) >= 0) {
                activeLegs = activeLegs.concat(d.value.dates.map(function(e) {
                    return dateList.indexOf(e);
                }));
                return "active";
            } else {
                return "inactive";
            }
        });
    
    var activeFlights = [];
    for(var i=0; i<activeLegs.length; i++) {
        var coming = flightList.get(dateList[activeLegs[i]-1]);
        var going = flightList.get(dateList[activeLegs[i]]);
        going.flightType = "departure";
        if(coming == activeFlights[activeFlights.length-1]) {
            coming.flightType = "inbetween";
            activeFlights[activeFlights.length-1] = coming;
            activeFlights.push(going);
        } else {
            coming.flightType = "arrival";
            activeFlights.push(coming);
            activeFlights.push(going);
        }
    }
    flightGroup.selectAll("path").remove();
    var flightUpdate = flightGroup.selectAll("path")
        .data(activeFlights);

    flightUpdate.enter().append("svg:path")
        .attr("d", function(d) { return mapPath(arc(d)); });
    flightGroup.selectAll("path")
        .attr("class", function(d) { return d.flightType; });
    flightGroup.selectAll("path").moveToFront();
}
// Read in the concerts json and parse it into the data structures we need.
d3.json("concerts.json", function(json) {
    // Iterate once to add the necessary fields
    json.forEach(function(d) {
        d.date = new Date(d.date);
        dateList.push(d.date);
        d.coords = [d.lon, d.lat];
    });
    dateList.sort(function(d) { return d.date; });

    // Iterate again and construct the map of venues and dates
    json.forEach(function(d) {
        showList.set(d.date, d.location);
        if(venueList.has(d.location)) {
            v = venueList.get(d.location);
            v.dates.push(d.date);
            venueList.set(d.location, v);
        } else {
            venueList.set(d.location, {
                "dates" : [d.date],
                "coords" : d.coords,
            });
        }
    });

    // Build the list of flights, by date of departure.
    for(var i=0; i < dateList.length-1; i++) {
        var departDate = dateList[i];
        var arrivalDate = dateList[i+1];
        flightList.set(departDate, {
            "source" : venueList.get(showList.get(departDate)).coords,
            "target" : venueList.get(showList.get(arrivalDate)).coords
        });
    }

    drawVenues();

    // Add persistent click highlighting behavior
    concertGroup.selectAll("circle")
        .on("click", function(d) {
            if(event.shiftKey) {
                activeVenues.push(d.key);
                activeVenues.push(d.key);
            } else {
                if(activeVenues[0] == d.key && activeVenues[1] == d.key) { activeVenues = []; }
                else { activeVenues = [d.key, d.key]; }
            }
            highlightVenues();
        });

    // Add mouseover temporary highlighting beharior
    concertGroup.selectAll("circle")
        .on("mouseover", function(d) {
            activeVenues.push(d.key);
            highlightVenues();
        })
        .on("mouseout", function(d) {
            activeVenues.pop();
            highlightVenues();
        });

    map.selectAll("path")
        .on("click", function() {
            activeVenues = [];
            highlightVenues();
        });
});

vis.call(d3.behavior.zoom()
    .scaleExtent([1, 100])
    .on("zoom", zoom));


d3.selection.prototype.moveToFront = function() {
    console.log("moving to front");
    return this.each(function() {
        this.parentNode.appendChild(this);
    });
};
