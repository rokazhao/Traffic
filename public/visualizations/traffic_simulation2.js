import { addCars, addGraph, addRoad, BLUE, createCars, DEFAULT_MAX_SPEED, finalizeGraph, LIGHT_BLUE, resetGraph, resetSimulation, SimulationLock, startSimulation } from "./helpers.js";

(() => {
  const SIM_ID = 2;

  const svg = d3.select("#traffic-simulation2");

  const cars = createCars();
  cars[0].color = LIGHT_BLUE;

  addRoad(svg);

  const carRects = addCars(svg, cars);

  const graph = addGraph(d3.select("#speed-graph2"), BLUE);

  let simulationTimer = null;

  const button = d3.select('#restart-button2');

  button.on("click", buttonCallback);

  function buttonCallback() {
    const isGreen = button.classed("btn-success");

    if (isGreen) {
      SimulationLock.requestStart(SIM_ID);

      button
        .classed("btn-success", false)
        .classed("btn-danger", true)
        .text("Stop");

      resetGraph(graph);

      simulationTimer = startSimulation(simulationTimer, cars, carRects, graph, stopSimulation);

      cars[0].maxSpeed = 0;
      d3.timeout(() => {
        cars[0].maxSpeed = DEFAULT_MAX_SPEED;
      }, 1500);
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

    simulationTimer = resetSimulation(simulationTimer, cars, carRects);

    SimulationLock.stop(SIM_ID);
  }

  SimulationLock.register(SIM_ID, stopSimulation);

  resetSimulation(simulationTimer, cars, carRects);
})();