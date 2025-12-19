import { addCars, addGraph, addRoad, centerX, centerY, createCars, DEFAULT_MAX_SPEED, finalizeGraph, getCarCoords, LIGHT_GREEN, ORANGE, renderCars, resetGraph, resetSimulation, SimulationLock, startSimulation, YELLOW } from "./helpers.js";


(() => {
  const SIM_ID = 4;

  const svg = d3.select("#traffic-simulation4");

  const DISTRACTED_MAX_SPEED = 0.1;

  const cars = createCars();

  addRoad(svg);

  const carRects = addCars(svg, cars);

  const draggableGroup = addDistraction(svg)

  const graphSVG = d3.select("#speed-graph4");

  const graph = addGraph(graphSVG, ORANGE);

  let simulationTimer = null;

  const button = d3.select('#restart-button4');

  button.on("click", buttonCallback);

  startDistraction()

  function buttonCallback() {
    const isGreen = button.classed("btn-success");

    if (isGreen) {
      SimulationLock.requestStart(SIM_ID);

      button
        .classed("btn-success", false)
        .classed("btn-danger", true)
        .text("Stop");

      resetGraph(graph);

      //distraction logic doesnt need to be started, always running

      simulationTimer = startSimulation(simulationTimer, cars, carRects, graph, stopSimulation);
    } else {
      stopSimulation();
    }
  }

  function stopSimulation() {
    button
      .classed("btn-danger", false)
      .classed("btn-success", true)
      .text("Start");

    finalizeGraph(graph);

    // Send data to combined chart
    if (typeof window.updateCombinedChart === 'function') {
      window.updateCombinedChart(SIM_ID, graph.history);
    }

    resetDistraction();

    simulationTimer = resetSimulation(simulationTimer, cars, carRects);

    SimulationLock.stop(SIM_ID);
  }

  SimulationLock.register(SIM_ID, stopSimulation);

  resetSimulation(simulationTimer, cars, carRects);

  function addDistraction(svg) {
    const draggableGroup = svg.append("g")
      .attr("transform", `translate(${centerX}, ${centerY})`)
      .style("cursor", "move");

    draggableGroup.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 80)
      .attr("fill", 'none')
      .attr("stroke", YELLOW)
      .attr("stroke-width", 2)

    draggableGroup.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 80)
      .attr("fill", YELLOW)
      .attr("opacity", 0.3)

    applyDragBehavior(draggableGroup);


    d3.xml("sun.svg").then(data => {
      const importedNode = data.documentElement;

      const iconOriginalSize = 36;
      const scaleFactor = 1;
      const scaledSize = iconOriginalSize * scaleFactor;

      draggableGroup.node().appendChild(importedNode);

      d3.select(importedNode)
        .attr("fill", "grey")
        .attr("x", - (scaledSize / 2))
        .attr("y", - (scaledSize / 2))
        .attr("width", scaledSize)
        .attr("height", scaledSize)
        .attr("viewBox", `0 0 ${iconOriginalSize} ${iconOriginalSize}`);

    });

    function applyDragBehavior(group) {
      const BOUNDARY_RADIUS = 160;

      const dragHandler = d3.drag()
        .on("start", (event) => {
          // Get the current group translation (same as before)
          const transformString = d3.select(group.node()).attr("transform");
          const match = transformString.match(/translate\(([^,]+),([^)]+)\)/);

          let initialX = match ? parseFloat(match[1]) : centerX;
          let initialY = match ? parseFloat(match[2]) : centerY;

          event.subject.x = initialX;
          event.subject.y = initialY;
        })
        .on("drag", function (event) {
          let rawNewX = event.subject.x + event.dx;
          let rawNewY = event.subject.y + event.dy;

          const dx = rawNewX - centerX;
          const dy = rawNewY - centerY;

          const distance = Math.sqrt(dx * dx + dy * dy);

          let boundedX = rawNewX;
          let boundedY = rawNewY;

          if (distance > BOUNDARY_RADIUS) {
            const scaleFactor = BOUNDARY_RADIUS / distance;

            boundedX = centerX + (dx * scaleFactor);
            boundedY = centerY + (dy * scaleFactor);
          }

          event.subject.x = boundedX;
          event.subject.y = boundedY;

          d3.select(this)
            .attr("transform", `translate(${boundedX}, ${boundedY})`);
        });

      group.call(dragHandler);
    }

    return draggableGroup;
  }

  function resetDistraction() {
    draggableGroup
      .attr("transform", `translate(${centerX}, ${centerY})`);
  }

  function startDistraction() {
    d3.timer(() => {
      const transformString = draggableGroup.attr("transform");
      const match = transformString.match(/translate\(([^,]+),([^)]+)\)/);

      const boundedX = match ? parseFloat(match[1]) : centerX;
      const boundedY = match ? parseFloat(match[2]) : centerY;

      const distractionRadius = 80;

      for (const car of cars) {
        const carCoords = getCarCoords(car.position);

        const dx = carCoords.x - boundedX;
        const dy = carCoords.y - boundedY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < distractionRadius) {
          car.color = YELLOW;
          car.maxSpeed = DISTRACTED_MAX_SPEED;
        } else {
          car.color = LIGHT_GREEN;
          car.maxSpeed = DEFAULT_MAX_SPEED;
        }
      }

      renderCars(carRects);
    })
  }
})();