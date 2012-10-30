// Begin by declaring variables and setting up the drawing space
var w = 1000, h = 750;
var defaultScale = w;
var mapCenter = [w / 2, h / 2];

var venueList = d3.map(), showList = d3.map(), flightList = d3.map(), dateList = [];
var activeDates = [];
var lastFive = [];
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

var arcColor = d3.scale.linear()
    .domain([1960, 2012])
    .range(["white", "red"]);

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
        .attr("d", function(d) { return mapPath(arc(d.flight)); });
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

function highlightDates(activeDates) {
    console.log(activeDates);
    activeDates = d3.map(d3.nest().key(function(d) { return d; }).map(activeDates)).keys().map(function(d) { return new Date(d); });
    console.log(activeDates);
    activeLegs = activeDates.map(function(e) { for(var i; i<dateList.length; i++) { if(dateList[i]==e) { return i; } } return -1; });
    console.log(activeLegs);
    function addCircles() {
        concertGroup.selectAll("circle")
            .data(venueList.entries())
            .attr("class", function(d) { 
                if(d.value.dates.some(function(e) { return activeDates.indexOf(e) >= 0; })) {
                    return "active";
                } else {
                    return "inactive";
                }
            });
    }
    
    function addFlights() {
        var activeFlights = [];
        activeFlights.push({"date" : dateList[activeLegs[0]], "flight" : flightList.get(dateList[activeLegs[0]]), "flightType" : "departure"});
        for(var i=1; i<activeLegs.length-1; i++) {
            var coming = {"date" : dateList[activeLegs[i]-1], "flight" : flightList.get(dateList[activeLegs[i]-1])};
            var going = {"date" : dateList[activeLegs[i]], "flight" : flightList.get(dateList[activeLegs[i]]), "flightType" : "departure"};
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
        activeFlights.push({"date" : dateList[activeLegs[activeLegs.length-1]], "flight" : flightList.get(dateList[activeLegs[activeLegs.length-1]]), "flightType" : "arrival"});
        console.log(activeFlights);

        flightGroup.selectAll("path").remove();
        var flightUpdate = flightGroup.selectAll("path")
            .data(activeFlights);

        flightUpdate.enter().append("svg:path")
            .attr("d", function(d) { return mapPath(arc(d.flight)); })
            .attr("stroke", function(d) { return arcColor(d.date.getFullYear()); })
            .attr("fill", "none");
    }
    addCircles();
    addFlights();

    arcs.parentNode.appendChild(arcs);
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

    worldTour(0);

    // Add persistent click highlighting behavior
    concertGroup.selectAll("circle")
        .on("click", function(d) {
            if(event.shiftKey) {
                activeDates.push(d.value.dates);
                activeDates.push(d.value.dates);
            } else {
                if(this.class == "active") { activeDates = []; }
                else { activeDates = [d.value.dates, d.value.dates]; }
            }
            highlightDates(d3.merge(activeDates.concat(lastFive)));
        });

    // Add mouseover temporary highlighting beharior
    concertGroup.selectAll("circle")
        .on("mouseover", function(d) {
            activeDates.push(d.value.dates);
            highlightDates(d3.merge(activeDates.concat(lastFive)));
        })
        .on("mouseout", function(d) {
            activeDates.pop();
            highlightDates(d3.merge(activeDates.concat(lastFive)));
        });

    map.selectAll("path")
        .on("click", function() {
            activeDates = [];
            highlightDates(d3.merge(activeDates.concat(lastFive)));
        });
    
});

function worldTour(i) {
    console.log(i);
    if(i < dateList.length) {
        lastFive.push(dateList[i]);
        if(lastFive.length > 5) {
            lastFive.shift();
        }
        highlightDates(activeDates.concat(lastFive));
        setTimeout(function() { worldTour(i+1); }, 1500);
    }
    return;
}

vis.call(d3.behavior.zoom()
    .scaleExtent([1, 100])
    .on("zoom", zoom));


d3.selection.prototype.moveToFront = function() {
    console.log("moving to front");
    return this.each(function() {
        this.parentNode.appendChild(this);
    });
};
