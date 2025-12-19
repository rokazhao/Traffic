import { BLUE, DARK_GREEN, ORANGE, RED } from "./helpers.js";

(() => {
  const width = 600;
  const height = 450;
  const margin = { top: 50, right: 135, bottom: 60, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select("#combined_chart");

  svg.attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Add clip path to prevent lines from extending beyond chart bounds
  g.append("defs")
    .append("clipPath")
    .attr("id", "chart-clip")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", innerWidth)
    .attr("height", innerHeight);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Data sources - will be populated from graph histories
  const simulations = [
    { id: 1, name: 'Baseline', color: DARK_GREEN, data: [], scale: 1 },
    { id: 4, name: 'External Distraction', color: ORANGE, data: [], scale: 1 },
    { id: 2, name: 'Distracted Driver', color: BLUE, data: [], scale: 1 },
    { id: 3, name: 'Distraction Game', color: RED, data: [], scale: 3 }
  ];

  // Track focused simulation
  let focusedSimId = null;

  // Initialize scales
  const x = d3.scaleLinear()
    .domain([0, 30])
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, 350])
    .range([innerHeight, 0]);

  // Add axes
  const xAxis = g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x));

  const yAxis = g.append("g")
    .call(d3.axisLeft(y));

  // Axis labels
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 45)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Time (seconds)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Average Speed (px/s)");

  // Title
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Combined Traffic Flow Analysis");

  // Line generator
  const line = d3.line()
    .x(d => x(d.t))
    .y(d => y(d.avg));

  // Create a container for paths that we can reorder
  const pathsContainer = g.append("g").attr("class", "paths-container");

  // Create path elements for each simulation (with clipping)
  const paths = simulations.map(sim => {
    return pathsContainer.append("path")
      .attr("class", `line-${sim.id}`)
      .attr("fill", "none")
      .attr("stroke", sim.color)
      .attr("stroke-width", 2.5)
      .attr("clip-path", "url(#chart-clip)");
  });

  // Vertical cursor line (drawn before click paths so it doesn't block them)
  const verticalLine = g.append("line")
    .attr("class", "cursor-line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", 'grey')
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4,4")
    .style("opacity", 0)
    .style("pointer-events", "none");

  // Add invisible thick click paths for easier line clicking
  const clickPaths = simulations.map(sim => {
    return g.append("path")
      .attr("class", `click-line-${sim.id}`)
      .attr("fill", "none")
      .attr("stroke", "transparent")
      .attr("stroke-width", 20)
      .attr("clip-path", "url(#chart-clip)")
      .style("cursor", "pointer")
      .on("click", function (event) {
        event.stopPropagation();
        // Don't allow focusing on simulations with no data
        if (sim.data.length === 0) return;

        if (focusedSimId === sim.id) {
          focusedSimId = null;
        } else {
          focusedSimId = sim.id;
        }
        updateFocus();
      });
  });

  // Legend
  const legendHeight = simulations.length * 25;
  const legendY = (height - legendHeight) / 2;

  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right + 10}, ${legendY})`);

  svg.append("text")
    .attr("x", width - margin.right + 10)
    .attr("y", legendY - 13)
    .attr("fill", "grey")
    .style("font-size", "12px")
    .text("(Click to Focus)")


  simulations.forEach((sim, i) => {
    const legendRow = legend.append("g")
      .attr("transform", `translate(0, ${i * 25})`)
      .style("cursor", "pointer")
      .on("click", function (event) {
        event.stopPropagation();
        // Don't allow focusing on simulations with no data
        if (sim.data.length === 0) return;

        if (focusedSimId === sim.id) {
          focusedSimId = null;
        } else {
          focusedSimId = sim.id;
        }
        updateFocus();
      });

    legendRow.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", sim.color)

    legendRow.append("text")
      .attr("x", 24)
      .attr("y", 13)
      .style("font-size", "12px")
      .text(sim.name);

    // Store reference for toggling
    sim.legendRow = legendRow;
  });

  // Overlay for mouse tracking
  const overlay = g.append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "none")
    .style("pointer-events", "all")
    .style("cursor", "default")
    .on("click", function (event) {
      // Reset focus when clicking on background
      if (focusedSimId !== null) {
        focusedSimId = null;
        updateFocus();
      }
    })
    .on("mousemove", function (event) {
      const [mouseX] = d3.pointer(event);
      const xTime = x.invert(mouseX);

      verticalLine
        .attr("x1", mouseX)
        .attr("x2", mouseX)
        .style("opacity", 1);

      let tooltipHTML = `<strong>Time: ${xTime.toFixed(1)}s</strong><br/>`;

      simulations.forEach((sim, i) => {
        if (sim.data.length === 0) {
          highlightCircles[i].style("opacity", 0);
          return;
        }

        const bisect = d3.bisector(d => d.t).left;
        const index = bisect(sim.data, xTime);

        let closest;
        if (index === 0) {
          closest = sim.data[0];
        } else if (index >= sim.data.length) {
          closest = sim.data[sim.data.length - 1];
        } else {
          const d0 = sim.data[index - 1];
          const d1 = sim.data[index];
          closest = xTime - d0.t > d1.t - xTime ? d1 : d0;
        }

        const xPos = x(closest.t);
        const yPos = y(closest.avg);

        highlightCircles[i]
          .attr("cx", xPos)
          .attr("cy", yPos)
          .style("opacity", 1);

        tooltipHTML += `<span style="color: ${sim.color}">●</span> ${sim.name}: ${closest.avg.toFixed(1)} px/s<br/>`;
      });

      tooltip.transition().duration(100).style("opacity", 0.9);
      tooltip.html(tooltipHTML)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function (event) {
      // Only hide if we're actually leaving the chart area
      const [mouseX, mouseY] = d3.pointer(event);
      if (mouseX < 0 || mouseX > innerWidth || mouseY < 0 || mouseY > innerHeight) {
        verticalLine.style("opacity", 0);
        highlightCircles.forEach(circle => circle.style("opacity", 0));
        tooltip.transition().duration(200).style("opacity", 0);
      }
    });

  // Highlight circles for each line (drawn AFTER overlay so they're on top)
  const highlightCircles = simulations.map(sim => {
    return g.append("circle")
      .attr("class", `highlight-${sim.id}`)
      .attr("r", 7)
      .attr("fill", sim.color)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("opacity", 0)
      .style("cursor", "pointer")
      .style("pointer-events", "all")
      .on("click", function (event) {
        event.stopPropagation();
        // Don't allow focusing on simulations with no data
        if (sim.data.length === 0) return;

        if (focusedSimId === sim.id) {
          focusedSimId = null;
        } else {
          focusedSimId = sim.id;
        }
        updateFocus();
      })
      .on("mouseenter", function () {
        d3.select(this).attr("r", 8);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("r", 7);
      })
      .on("mousemove", function (event) {
        // Prevent the overlay's mouseout from firing
        event.stopPropagation();
      });
  });

  function updateFocus() {
    const duration = 500;

    if (focusedSimId === null) {
      // Reset to show all data
      const allData = simulations
        .filter(sim => sim.data.length > 0)
        .flatMap(sim => sim.data);

      if (allData.length > 0) {
        const maxTime = d3.max(allData, d => d.t);
        const maxSpeed = d3.max(allData, d => d.avg);

        x.domain([0, maxTime * 1.05]);
        y.domain([0, Math.max(350, maxSpeed * 1.1)]);

        xAxis.transition().duration(duration).call(d3.axisBottom(x));
        yAxis.transition().duration(duration).call(d3.axisLeft(y));

        // Fade all lines back to full opacity
        simulations.forEach((sim, i) => {
          const pathData = sim.data.length > 0 ? line(sim.data) : null;

          paths[i]
            .transition()
            .duration(duration)
            .attr("d", pathData)
            .style("opacity", 1)
            .attr("stroke-width", 2.5);

          clickPaths[i]
            .transition()
            .duration(duration)
            .attr("d", pathData);

          sim.legendRow
            .transition()
            .duration(duration)
            .style("opacity", 1);

          // Animate circles if they're currently visible
          const currentOpacity = parseFloat(highlightCircles[i].style("opacity"));
          if (currentOpacity > 0 && sim.data.length > 0) {
            const currentX = parseFloat(highlightCircles[i].attr("cx"));
            const currentT = x.invert(currentX);

            const bisect = d3.bisector(d => d.t).left;
            const index = bisect(sim.data, currentT);

            let closest;
            if (index === 0) {
              closest = sim.data[0];
            } else if (index >= sim.data.length) {
              closest = sim.data[sim.data.length - 1];
            } else {
              const d0 = sim.data[index - 1];
              const d1 = sim.data[index];
              closest = currentT - d0.t > d1.t - currentT ? d1 : d0;
            }

            highlightCircles[i]
              .transition()
              .duration(duration)
              .attr("cx", x(closest.t))
              .attr("cy", y(closest.avg))
              .style("stroke-opacity", 1)
              .style("fill-opacity", 1);
          }
        });
      }
    } else {
      // Focus on specific simulation
      const focusedSim = simulations.find(s => s.id === focusedSimId);

      if (focusedSim && focusedSim.data.length > 0) {
        const maxTime = d3.max(focusedSim.data, d => d.t);
        const maxSpeed = d3.max(focusedSim.data, d => d.avg);

        x.domain([0, maxTime * 1.05]);
        y.domain([0, Math.max(350, maxSpeed * 1.1)]);

        xAxis.transition().duration(duration).call(d3.axisBottom(x));
        yAxis.transition().duration(duration).call(d3.axisLeft(y));

        // Update all lines with new scale and opacity
        simulations.forEach((sim, i) => {
          const isFocused = sim.id === focusedSimId;
          const pathData = sim.data.length > 0 ? line(sim.data) : null;

          paths[i]
            .transition()
            .duration(duration)
            .attr("d", pathData)
            .style("opacity", isFocused ? 1 : 0.35)
            .attr("stroke-width", isFocused ? 3.5 : 2.5);

          clickPaths[i]
            .transition()
            .duration(duration)
            .attr("d", pathData);

          sim.legendRow
            .transition()
            .duration(duration)
            .style("opacity", isFocused ? 1 : 0.6);

          // Animate circles if they're currently visible
          const currentOpacity = parseFloat(highlightCircles[i].style("opacity"));
          if (currentOpacity > 0 && sim.data.length > 0) {
            const currentX = parseFloat(highlightCircles[i].attr("cx"));
            const currentT = x.invert(currentX);

            const bisect = d3.bisector(d => d.t).left;
            const index = bisect(sim.data, currentT);

            let closest;
            if (index === 0) {
              closest = sim.data[0];
            } else if (index >= sim.data.length) {
              closest = sim.data[sim.data.length - 1];
            } else {
              const d0 = sim.data[index - 1];
              const d1 = sim.data[index];
              closest = currentT - d0.t > d1.t - currentT ? d1 : d0;
            }

            highlightCircles[i]
              .transition()
              .duration(duration)
              .attr("cx", x(closest.t))
              .attr("cy", y(closest.avg))
              .style("stroke-opacity", isFocused ? 1 : 0.35)
              .style("fill-opacity", isFocused ? 1 : 0.35);
          }
        });
      }
    }
  }

  function reorderElements(sortedIndices) {
    // Reorder paths
    sortedIndices.forEach(i => {
      pathsContainer.node().appendChild(paths[i].node());
    });

    // Reorder circles to match path order
    sortedIndices.forEach(i => {
      g.node().appendChild(highlightCircles[i].node());
    });
  }

  function updateVisualization() {
    // Check if focused sim has no data, reset focus
    if (focusedSimId !== null) {
      const focusedSim = simulations.find(s => s.id === focusedSimId);
      if (!focusedSim || focusedSim.data.length === 0) {
        focusedSimId = null;
      }
    }

    if (focusedSimId !== null) {
      // If focused, update with focus logic
      updateFocus();
    } else {
      // Normal update without focus
      // Sort simulations by max x value (descending) so shortest lines are drawn last (on top)
      const sortedIndices = simulations
        .map((sim, i) => ({
          index: i,
          maxTime: sim.data.length > 0 ? d3.max(sim.data, d => d.t) : -1
        }))
        .sort((a, b) => b.maxTime - a.maxTime)
        .map(item => item.index);

      // Update line paths
      sortedIndices.forEach(i => {
        const sim = simulations[i];
        const pathData = sim.data.length > 0 ? line(sim.data) : null;
        paths[i].attr("d", pathData);
      });

      // Reorder paths and circles
      reorderElements(sortedIndices);

      // Update click paths (don't need to reorder these)
      simulations.forEach((sim, i) => {
        const pathData = sim.data.length > 0 ? line(sim.data) : null;
        clickPaths[i].attr("d", pathData);
      });

      // Update scales based on data
      const allData = simulations
        .filter(sim => sim.data.length > 0)
        .flatMap(sim => sim.data);

      if (allData.length > 0) {
        const maxTime = d3.max(allData, d => d.t);
        const maxSpeed = d3.max(allData, d => d.avg);

        x.domain([0, maxTime * 1.05]);
        y.domain([0, Math.max(350, maxSpeed * 1.1)]);

        xAxis.call(d3.axisBottom(x));
        yAxis.call(d3.axisLeft(y));

        // Redraw paths with new scales
        sortedIndices.forEach(i => {
          const sim = simulations[i];
          if (sim.data.length > 0) {
            const pathData = line(sim.data);
            paths[i].attr("d", pathData);
          }
        });

        // Reorder again after redraw
        reorderElements(sortedIndices);

        // Update click paths
        simulations.forEach((sim, i) => {
          if (sim.data.length > 0) {
            const pathData = line(sim.data);
            clickPaths[i].attr("d", pathData);
          }
        });
      }
    }
  }

  // Export function to receive data from other simulations
  window.updateCombinedChart = function (simId, history) {
    const sim = simulations.find(s => s.id === simId);
    if (!sim) {
      console.error('Simulation not found for id:', simId);
      return;
    }

    // Convert history data and apply scaling
    sim.data = history.map(d => ({
      t: d.t / 1000, // Convert ms to seconds
      avg: d.avg * sim.scale // Apply scale factor (3x for sim3)
    }));

    updateVisualization();
  };

  // Initial render
  updateVisualization();
})();