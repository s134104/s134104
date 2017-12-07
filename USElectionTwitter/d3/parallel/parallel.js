(function() {

var margin = {top: 50, right: 100, bottom: 20, left: 100},
    width = 960 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

var types = {
  "Number": {
    key: "Number",
    coerce: function(d) { return +d; },
    extent: d3.extent,
    within: function(d, extent) { return extent[0] <= d && d <= extent[1]; },
    defaultScale: d3.scale.linear().range([height, 0])
  },
  "String": {
    key: "String",
    coerce: String,
    extent: function (data) { return data.sort(); },
    within: function(d, extent, dim) { return extent[0] <= dim.scale(d) && dim.scale(d) <= extent[1]; },
    defaultScale: d3.scale.ordinal().rangePoints([0, height])
  },
  "Date": {
    key: "Date",
    coerce: function(d) { return new Date(d); },
    extent: d3.extent,
    within: function(d, extent) { return extent[0] <= d && d <= extent[1]; },
    defaultScale: d3.time.scale().range([0, height])
  }
};

var dimensions = [
  {
    key: "state",
    description: "State",
    type: types["String"]
  },
  {
    key: "abortion",
    description: "Abortion",
    type: types["Number"],
    domain: [0,1]
  },
  {
    key: "corruption",
    description: "Corruption",
    type: types["Number"],
    domain: [0,1]
  },
  {
    key: "economy",
    description: "Economy",
    type: types["Number"],
    domain: [0,1]
  },
  {
    key: "education",
    description: "Education",
    type: types["Number"],
    domain: [0,1]
  },
  {
    key: "environment",
    description: "Environment",
    type: types["Number"],
    domain: [0,1]
  },
  {
    key: "gun",
    description: "Gun Policy",
    type: types["Number"],
    domain: [0,1]
  },
  {
    key: "health",
    description: "Health Care",
    type: types["Number"],
    domain: [0,1]
  },
  {
    key: "immigration",
    description: "Immigration",
    type: types["Number"],
    domain: [0,1]
  },
  {
    key: "tax",
    description: "Taxes",
    type: types["Number"],
    domain: [0,1]
  },
  {
    key: "party",
    description: "Party",
    type: types["String"],
    domain: ["Republicans", "Swing State", "Democrats"]
  }
];

var x = d3.scale.ordinal()
    .domain(dimensions.map(function(dim) { return dim.key; }))
    .rangePoints([0, width]);

var line = d3.svg.line()
    .defined(function(d) { return !isNaN(d[1]); });

var yAxis = d3.svg.axis()
    .orient("left");

var svg = d3.select("#parallelCoord").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//var output = d3.select("#parallelCoord").append("pre");

var foreground = svg.append("g")
  .attr("class", "foreground");

var axes = svg.selectAll(".axis")
    .data(dimensions)
  .enter().append("g")
    .attr("class", "axis")
    .attr("transform", function(d) { return "translate(" + x(d.key) + ")"; });

d3.csv("d3/parallel/parallel.csv", function(error, data) {
  if (error) throw error;

  data.forEach(function(d) {
    dimensions.forEach(function(p) {
      d[p.key] = p.type.coerce(d[p.key]);
    });
  });

  // type/dimension default setting happens here
  dimensions.forEach(function(dim) {
    if (!("domain" in dim)) {
      // detect domain using dimension type's extent function
      dim.domain = d3.functor(dim.type.extent)(data.map(function(d) { return d[dim.key]; }));

      // TODO - this line only works because the data encodes data with integers
      // Sorting/comparing should be defined at the type/dimension level
      dim.domain.sort(function(a,b) {
        return a - b;
      });
    }
    if (!("scale" in dim)) {
      // use type's default scale for dimension
      dim.scale = dim.type.defaultScale.copy();
    }
    dim.scale.domain(dim.domain);
  });

  foreground.selectAll("path")
      .data(data)
    .enter().append("path")
      .attr("d", draw)
      .style("stroke",  function(d) { if (d.party == "Republicans") { return "#FF0000"} else if (d.party == "Democrats") { return "#0000FF"} else { return "#555" };});
      //.style("stroke",  function(d) { return "#6ac" });

  axes.append("g")
      .attr("class", "axis")
      .each(function(d) {
        var renderAxis = "axis" in d
          ? d.axis.scale(d.scale)  // custom axis
          : yAxis.scale(d.scale);  // default axis
        d3.select(this).call(renderAxis);
      })
    .append("text")
      .attr("class", "title")
      .attr("text-anchor", "start")
      .text(function(d) { return "description" in d ? d.description : d.key; });

  // Add and store a brush for each axis.
  axes.append("g")
      .attr("class", "brush")
      .each(function(d) {
        d3.select(this).call(d.brush = d3.svg.brush()
          .y(d.scale)
          .on("brushstart", brushstart)
          .on("brush", brush));
      })
    .selectAll("rect")
      .attr("x", -8)
      .attr("width", 16);

  //output.text(d3.tsv.format(data));

  function draw(d) {
    return line(dimensions.map(function(dim) {
      return [x(dim.key), dim.scale(d[dim.key])];
    }));
  }

  function brushstart() {
    d3.event.sourceEvent.stopPropagation();
  }

  // Handles a brush event, toggling the display of foreground lines.
  function brush() {
    var actives = dimensions.filter(function(p) { return !p.brush.empty(); }),
        extents = actives.map(function(p) { return p.brush.extent(); });

    var selected = [];

    d3.selectAll(".foreground path").style("display", function(d) {
      if (actives.every(function(dim, i) {
          // test if point is within extents for each active brush
          return dim.type.within(d[dim.key], extents[i], dim);
        })) {
        selected.push(d);
        return null;
      }
      return "none";
    });

    output.text(d3.tsv.format(selected));
  }
});

})();