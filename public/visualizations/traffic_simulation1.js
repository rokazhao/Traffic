import { addCars, addGraph, addRoad, createCars, DARK_GREEN, finalizeGraph, resetGraph, resetSimulation, SimulationLock, startSimulation } from "./helpers.js";

(() => {
  const SIM_ID = 1;

  const svg = d3.select("#traffic-simulation1");

  const cars = createCars();

  addRoad(svg);

  const carRects = addCars(svg, cars);

  const graphSVG = d3.select("#speed-graph1")

  const graph = addGraph(graphSVG, DARK_GREEN);

  graphSVG.select(".avg-line").remove();
  graphSVG.select(".avg-line-label").remove();

  let simulationTimer = null;

  const button = d3.select('#restart-button1');

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