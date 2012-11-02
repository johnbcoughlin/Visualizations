var width = window.innerWidth;
var height = window.innerHeight;

var spiralSlope = 3;
var spiralDetail = .02;
var earliest = 4567170000;
var latest = 1;
var lowerLimit = 0;
var upperLimit = 2 * Math.PI * Math.log(earliest / latest) / Math.log(spiralSlope);
var quantizedAngles = d3.range(lowerLimit, upperLimit, spiralDetail);

var vis = d3.select("body").append("svg");

var g = vis.append("svg:g")
    .attr("transform", "translate(" + width / 2 + ", " + height / 2 + ")");

var yearToAngle = d3.scale.log()
    .domain([latest, earliest])
    .range([lowerLimit, upperLimit]);

var quantizeAngle = d3.scale.quantize()
    .domain(yearToAngle.range())
    .range(quantizedAngles);

// Return the radius corresponding to the given angle in the spiral
function logSpiral(theta) {
    return 120 * Math.exp(theta * Math.log(spiralSlope) / (2 * Math.PI));
}

// Precompute some points so we don't have to do it every time we zoom
var spiralPoints = quantizedAngles.map(function(val) {
        return [logSpiral(val), val];
    });

var spiralSection = d3.svg.area.radial();

function initialize(data) {
    data.forEach(function(d) {
        d.startIndex = Math.round((quantizeAngle(yearToAngle(d.start))) / spiralDetail);
        d.endIndex = Math.round((quantizeAngle(yearToAngle(d.end))) / spiralDetail);
        points = spiralPoints.slice(d.endIndex, d.startIndex + 1);
        var extent;
        if (d.level == "eon") { extent = 1; }
        else if (d.level == "era") { extent = .75; }
        else if (d.level == "period") { extent = .5; }
        else { extent = 0; }
        d.points = points.map(function(p) { return [
            p[0],
            p[0] * spiralSlope * extent,
            p[1]
        ]; });
    });

    g.selectAll("path.epochs")
        .data(data)
      .enter().append("svg:path")
        .attr("class", "epochs")
        .attr("id", function(d) { return d.name; })
        .attr("fill", function(d) { return generateColor(d); })
        .attr("stroke", "white");

    zoom(1);

}

function zoom(scale) {
    viewLimits = getViewLimits(scale);
    spiralSection.radius(function(d) { return d[1] * scale; })
        .innerRadius(function(d) { return d[0] * scale; })
        .angle(function(d) { return d[2]; });
    g.selectAll("path.epochs")
        .attr("d", function(d) {
            if (viewLimits[0] > d.startIndex || viewLimits[1] < d.endIndex) { 
                return null; 
            }
            else if (viewLimits[1] < d.startIndex && viewLimits[0] >= d.endIndex) {
                return spiralSection(d.points.slice(Math.max(0, viewLimits[0] - d.endIndex),
                        viewLimits[1] - d.endIndex));
            } else {
                return spiralSection(d.points);
            }
        });
}

vis.call(d3.behavior.zoom()
        .scaleExtent([latest / earliest, latest])
        .on("zoom", function() { zoom(d3.event.scale); }));

d3.json("eras.json", function(json) {
    initialize(json.eons);
});

function generateColor(epoch) {
    if (epoch.parent == null) {
        return "red";
    } else {
        parentColor = document.getElementById(epoch.parent).getAttribute("fill")
    }
}

function getViewLimits(scale) {
    presentAngle = yearToAngle(1 / scale);
    leastIndex = (quantizeAngle(presentAngle - 8 * Math.PI)) / spiralDetail;
    greatestIndex = (quantizeAngle(presentAngle + 4 * Math.PI)) / spiralDetail;

    return [Math.round(leastIndex), Math.round(greatestIndex)];
}
