var width = window.innerWidth;
var height = window.innerHeight;

var spiralSlope = 3;
var spiralStep = .03;
var earliest = 4567170000;
var latest = 1;
var lowerLimit = 0
// Set the upperLimit of the spiral so that our turning factor is correct
var upperLimit = 2 * Math.PI * Math.log(earliest / latest) / Math.log(spiralSlope);

var vis = d3.select("body").append("svg");
var g = vis.append("svg:g")
        .attr("transform", "translate(" + width / 2 + ", " + height / 2 + ")");

// Return the radius corresponding to the given angle in the spiral
function logSpiral(theta) {
    return 360 * Math.exp(theta * Math.log(spiralSlope) / (2 * Math.PI));
}

// Precompute some points so we don't have to do it every time we zoom
var spiralPoints = d3.range(lowerLimit, upperLimit, spiralStep).map(function(val) {
        return [logSpiral(val), val];
    });

var history = d3.scale.log()
    .domain([1, 4567170000])
    .range([lowerLimit, upperLimit]);

var quantized = d3.scale.quantize()
    .domain(history.range())
    .range(spiralPoints.map(function(val) { return val[1]; }));

function chunk(yearsAgo) {
    return quantized(history(yearsAgo));
}

var radToDeg = d3.scale.linear()
    .domain([0, 2 * Math.PI])
    .range([0, 360]);

var section = d3.svg.area.radial()
    .radius(function(d) { return d[0]; })
    .innerRadius(function(d) { return d[0] / spiralSlope; })
    .angle(function(d) { return d[1]; });

var ages = g.selectAll("path.section")

function initialize(data) {
    var eras = json.eras;
    var events = json.events;

    console.log(data);
    var ages = g.selectAll("path.section")
        .data(data.eras)
      .enter().append("svg:path")
        .attr("fill", function(d) { return d.color; })
        .attr("class", "section")
        .attr("stroke", "white");
}

d3.json("eras.json", function(json) {
    initialize(json);
    var eras = json.eras;
    var events = json.events;

    // Add the beginning of each geological era to the events list
    eras.forEach(function(d) {
        events[events.length] = {"name" : d.name.toUpperCase(), "date" : d.start, "type" : "geological", "importance" : 3};
    });

    events.forEach(function(d) {
        if (d.type == "geological" ) {
            d.angle = chunk(d.date);
        } else {
            d.angle = history(d.date);
        }
        d.formalRadius = logSpiral(d.angle);
        d.reversed = (d.angle % (2 * Math.PI) > Math.PI);
    });

    var markers = g.selectAll("g.eventMark")
        .data(events)
      .enter().append("svg:a")
        .attr("class", "eventMark")
        .attr("id", function(d) { return d.name; })
        .attr("xlink:href", function(d) { return d.link ? d.link : null; })
        .attr("xlink:show", "new");

    var markerText = markers.append("svg:text")
        .attr("text-anchor", function(d) {
            if (d.type == "historical" || d.type == "geological") {
                return "middle";
            } else if (d.type == "calendrical") {
                return d.reversed ? "start" : "end";
            }
        })
        .attr("font-family", "sans-serif")
        .attr("fill", function(d) { return d.type == "geological" ? "#ddd" : "black"; })
        .text(function(d) { return d.name; });

    g.append("svg:path")
        .attr("class", "present");

    zoom(1);

    function zoom(scale) {
        // Update generator accessor functions
        section.radius(function(d) { return scale * d[0]; });
        section.innerRadius(function(d) { return scale * d[0] / spiralSlope; });

        ages.attr("d", function(d) { return section(spiralPoints.filter(function(val) {
                            return val[1] <= chunk(d.start) && val[1] >= chunk(d.end);
                        }));
                    });

        markers.attr("transform", function(d) {
                var offset;
                if (d.type == "historical") { // We want the text in the middle of the spiral
                    offset = (spiralSlope + 1) / 2;
                    displacement = offset * d.formalRadius * scale / spiralSlope;
                    return "translate(" + Math.cos(d.angle - Math.PI/2) * displacement + ", " + Math.sin(d.angle - Math.PI/2) * displacement + ")";
                } else if (d.type == "calendrical") { // We want dates on the outer edge
                    offset = spiralSlope;
                } else if (d.type == "geological") {
                    offset = (spiralSlope + 1) / 2;
                }
                if (!d.reversed) {
                    return "rotate(" + (radToDeg(d.angle) - 90)
                    + ")translate(" + offset * d.formalRadius * scale / spiralSlope
                    + ", "  + 0 + ")";
                } else {
                    return "rotate(" + (radToDeg(d.angle) + 90)
                    + ")translate(" + -1 * offset * d.formalRadius * scale / spiralSlope
                    + ", " + 0 + ")";
                }
            });

        markerText.attr("dy", function(d) { if (d.type == "geological") { return d.reversed ? ".95em" : "-.25em"; } else return null; })
            .attr("dx", function(d) { if (d.type == "calendrical") { return d.reversed ? ".2em" : "-.2em"; } else return null; })
            .attr("font-size", function(d) { return d.formalRadius * scale / 40 * Math.sqrt(d.importance); });

        vis.selectAll(".eventMark").attr("display", function(d) { return d.formalRadius * scale > 1500 
                || d.formalRadius * scale < 1 ? "none" : null; });

        presentAngle = history(1 / scale);
        console.log(presentAngle);

        var line = d3.svg.line.radial()
            .angle(presentAngle);

        g.selectAll("path.present")
            .attr("d", line([[360, 0], [360 / spiralSlope, 0]]))
            .attr("fill", "none")
            .attr("stroke", "black");
    }

    vis.call(d3.behavior.zoom()
            .scaleExtent([1 / earliest, 1])
            .on("zoom", function() { zoom(d3.event.scale); }));
});
