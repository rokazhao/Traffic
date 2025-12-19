import { BLUE, DARK_GREEN } from "./helpers.js";

(() => {
  const width = 450;
  const height = 450;
  const margin = { top: 40, right: 30, bottom: 150, left: 90 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select("#crash_chart");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  d3.csv("./data_files/distraction_types.csv").then(rawData => {
    const data = rawData.map(d => ({
      type: d.Dist_Type.replace(/_/g, ' '),
      count: +d.Count
    })).sort((a, b) => b.count - a.count);

    const x = d3.scaleBand()
      .domain(data.map(d => d.type))
      .range([0, innerWidth])
      .padding(0.15);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) * 1.1])
      .range([innerHeight, 0]);

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).ticks(5));

    g.append("text")
      .attr("x", width / 2 - margin.left)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("fill", "#3199db")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Chart 2: Distraction Types in Rear-End Accidents");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Number of Observed Instances");

    // source
    g.append("text")
      .attr("x", innerWidth)
      .attr("y", innerHeight + 110)
      .attr("text-anchor", "end")
      .attr("fill", "grey")
      .style("font-size", "8px")
      .text("Source: AAA Foundation");

    g.selectAll(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.type))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => innerHeight - y(d.count))
      .attr("fill", BLUE)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("fill", DARK_GREEN);

        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(`<strong>${d.type}</strong><br/>Count: ${d.count}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("fill", BLUE);

        tooltip.transition().duration(200).style("opacity", 0);
      });
  }).catch(err => {
    console.error("Error loading CSV:", err);
  });
})();