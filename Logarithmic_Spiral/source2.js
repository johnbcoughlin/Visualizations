var width = window.innerWidth;
var height = window.innerHeight;

var spiralSlope = 3;
var spiralDetail = .02;
var earliest = 4567170000;
var latest = 1;
var lowerLimit = 0;
var upperLimit = 2 * Math.PI * Math.log(earliest / latest) / Math.log(spiralSlope);

var vis = d3.select("body").append("svg");

var g = vis.append("svg:g")
    .attr("transform", "translate(" + width / 2 + ", " + height / 2 + ")");

var yearToAngle = d3.scale.log()
    .domain([latest, earliest])
    .range([lowerLimit, upperLimit]);

var quantizeAngle = d3.scale.quantize()
    .domain(yearToAngle.range())
    .range(d3.range(lowerLimit, upperLimit, spiralDetail));

// Return the radius corresponding to the given angle in the spiral
function logSpiral(theta) {
    return 120 * Math.exp(theta * Math.log(spiralSlope) / (2 * Math.PI));
}

// Precompute some points so we don't have to do it every time we zoom
var spiralPoints = d3.range(lowerLimit, upperLimit, spiralDetail).map(function(val) {
        return [logSpiral(val), val];
    });

var spiralSection = d3.svg.area.radial();

var epochs = g.selectAll("path.epochs");

function initialize(data) {
    data.forEach(function(d) {
        d.points = spiralPoints.filter(function(p) {
            return p[1] <= quantizeAngle(yearToAngle(d.start))
            && p[1] >= quantizeAngle(yearToAngle(d.end));
        }).map(function(p) {
            point = {"formalRadius" : p[0], "angle" : p[1]}
            if (d.level == "eon") {
                point.extent = 1;
            } else if (d.level == "era") {
                point.extent = .7;
            } else if (d.level == "period") {
                point.extent = .5;
            }
            return point;
        });
    });

    g.selectAll("path.epochs")
        .data(data)
      .enter().append("svg:path")
        .attr("class", "epochs")
        .attr("fill", function(d) { return generateColor(d); })
        .attr("stroke", "white");

    zoom(1);
}

function zoom(scale) {
    console.log(scale);
    spiralSection.radius(function(d) { return d.formalRadius * spiralSlope * scale * d.extent; })
        .innerRadius(function(d) { return d.formalRadius * scale; })
        .angle(function(d) { return d.angle; });
    g.selectAll("path.epochs").attr("d", function(d) {
        localPoints = d.points.filter(function(p) {
            return p.formalRadius * scale < 1800 && p.formalRadius * scale > 1;
        });
        return localPoints ? spiralSection(localPoints) : null;
    });
}

vis.call(d3.behavior.zoom()
        .scaleExtent([latest / earliest, latest])
        .on("zoom", function() { zoom(d3.event.scale); }));

d3.json("eras.json", function(json) {
    var eras = json.eras;
    initialize(eras);
});

function generateColor(epoch) {
    yearToHue = d3.scale.log()
        .domain([latest, earliest])
        .range([0, upperLimit / Math.PI * 180]);
    yearToSaturation = d3.scale.log()
        .domain([latest, earliest])
        .range([.15, .05]);

    hue = yearToHue((epoch.start + epoch.end) / 2) % 360;
    sat = yearToSaturation((epoch.start + epoch.end) / 2);
    
    return d3.hsl(hue, sat, .5);
    
}
