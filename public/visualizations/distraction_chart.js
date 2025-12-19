import { DARK_GREEN } from "./helpers.js";

(() => {
  const width = 450;
  const height = 450;
  const margin = { top: 40, right: 30, bottom: 60, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select("#distraction_chart");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  d3.csv("./data_files/intro_data.csv").then(data => {
    data.forEach(d => {
      d.Year = +d.Year;
      d.percentage = parseFloat(d.Visible_Manipulation.replace('%', ''));
    });

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.Year))
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.percentage) * 1.1])
      .range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(10));

    g.append("g")
      .call(d3.axisLeft(y).tickFormat(d => d + "%"));

    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 45)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Year");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Visible Device Use (%)");

    g.append("text")
      .attr("x", width / 2 - margin.left)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("fill", DARK_GREEN)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Chart 1: Visible Device Use by Drivers Over Time");

    // source
    g.append("text")
      .attr("x", innerWidth)
      .attr("y", innerHeight + 45)
      .attr("text-anchor", "end")
      .attr("fill", "grey")
      .style("font-size", "8px")
      .text("Source: National Safety Council");

    const line = d3.line()
      .x(d => x(d.Year))
      .y(d => y(d.percentage));

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", DARK_GREEN)
      .attr("stroke-width", 2.5)
      .attr("d", line);

    g.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", d => x(d.Year))
      .attr("cy", d => y(d.percentage))
      .attr("r", 5)
      .attr("fill", DARK_GREEN)
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    const verticalLine = g.append("line")
      .attr("class", "cursor-line")
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", 'grey')
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .style("opacity", 0);

    const highlightCircle = g.append("circle")
      .attr("r", 8)
      .attr("fill", DARK_GREEN)
      .attr("stroke", "white")
      .attr("stroke-width", 3)
      .style("opacity", 0);

    const overlay = g.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mousemove", function (event) {
        const [mouseX] = d3.pointer(event);
        const xYear = x.invert(mouseX);

        const bisect = d3.bisector(d => d.Year).left;
        const index = bisect(data, xYear);

        let closest;
        if (index === 0) {
          closest = data[0];
        } else if (index >= data.length) {
          closest = data[data.length - 1];
        } else {
          const d0 = data[index - 1];
          const d1 = data[index];
          closest = xYear - d0.Year > d1.Year - xYear ? d1 : d0;
        }

        const xPos = x(closest.Year);
        const yPos = y(closest.percentage);

        verticalLine
          .attr("x1", xPos)
          .attr("x2", xPos)
          .style("opacity", 1);

        highlightCircle
          .attr("cx", xPos)
          .attr("cy", yPos)
          .style("opacity", 1);

        tooltip.transition().duration(100).style("opacity", 0.9);
        tooltip.html(`<strong>Year: ${closest.Year}</strong><br/>Percentage: ${closest.percentage}%`)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        verticalLine.style("opacity", 0);
        highlightCircle.style("opacity", 0);
        tooltip.transition().duration(200).style("opacity", 0);
      });

  }).catch(err => {
    console.error("Error loading CSV:", err);
  });
})();