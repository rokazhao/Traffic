export const width = 450;
export const height = 450;

export const centerX = width / 2;
export const centerY = height / 2;
export const radius = 200;
const trackLength = 2 * Math.PI * radius;

const DEFAULT_NUM_CARS = 10;
export const DEFAULT_MAX_SPEED = 0.3;
export const DEFAULT_REACTION_DELAY = 300;
const DEFAULT_ACCELERATION = 0.00015;

const safeFollowDist = 20;

const carWidth = 26;
const carHeight = 14;

export const DARK_GREEN = "#188754";
export const LIGHT_GREEN = "#90ed90";
export const BLUE = "#3498db";
export const LIGHT_BLUE = "#00ccffff"
export const YELLOW = "#fffe03";
export const RED = "#eb4034";
export const ORANGE = "#f5945c";

export function createCars(numCars = DEFAULT_NUM_CARS, maxSpeed = DEFAULT_MAX_SPEED,
  acceleration = DEFAULT_ACCELERATION, reactionDelay = DEFAULT_REACTION_DELAY) {
  return d3.range(numCars).map(i => {
    return {
      id: i,
      position: (i / numCars) * trackLength,
      maxSpeed: maxSpeed,
      speed: maxSpeed,
      accel: acceleration,
      color: LIGHT_GREEN,
      reactionDelay: reactionDelay,
      reactionTimer: 0,
    };
  });
}

export function addRoad(svg) {
  svg.append("circle")
    .attr("cx", centerX)
    .attr("cy", centerY)
    .attr("r", radius)
    .attr("fill", "none")
    .attr("stroke", "#777")
    .attr("stroke-width", 24);
}

export function addCars(svg, cars) {
  return svg.selectAll(".car")
    .data(cars)
    .enter()
    .append("rect")
    .attr("class", "car")
    .attr("width", carWidth)
    .attr("height", carHeight)
    .attr("fill", d => d.color)
    .attr("rx", 3)
    .attr("y", centerY - 7);
}

export function posToAngle(pos) {
  return (pos / trackLength) * 2 * Math.PI;
}

export function updateCar(car, carAhead, dt) {
  let gap = carAhead.position - car.position - carWidth;
  if (gap <= 0) gap += trackLength;

  const canMove = (gap >= safeFollowDist);

  if (canMove) {
    car.reactionTimer += dt;

    if (car.reactionTimer >= car.reactionDelay) {
      const desiredSpeed = car.speed + car.accel * dt
      car.speed = Math.min(desiredSpeed, car.maxSpeed)
    }
  } else {
    car.speed = 0;
    car.reactionTimer = 0;
  }

  car.position = (car.position + car.speed * dt) % trackLength;
}

export function renderCars(carRects) {
  carRects
    .attr("x", d => {
      const angle = posToAngle(d.position);
      return centerX + Math.cos(angle) * radius - carWidth / 2;
    })
    .attr("y", d => {
      const angle = posToAngle(d.position);
      return centerY + Math.sin(angle) * radius - carHeight / 2;
    })
    .attr("transform", d => {
      const angle = posToAngle(d.position);
      const deg = (angle * 180 / Math.PI) + 90;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      return `rotate(${deg}, ${x}, ${y})`;
    })
    .attr("fill", d => d.color)
}

export function startSimulation(simulationTimer, cars, carRects, graph, resetCallback) {
  if (simulationTimer) {
    simulationTimer.stop();
  }

  let lastTime = 0;

  return d3.timer(now => {
    if (lastTime === 0) {
      lastTime = now;
      return;
    }

    const dt = now - lastTime;
    lastTime = now;

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const carAhead = cars[(i + 1) % cars.length];
      updateCar(car, carAhead, dt);
    }

    const maxPos = cars.reduce((a, b) => Math.max(a, b.position), -Infinity)
    for (let i = 0; i < cars.length; i++) {
      const pos1 = cars[i].position;
      const pos2 = cars[(i + 1) % cars.length].position;

      if (pos1 > pos2 && pos1 !== maxPos) {
        if (typeof resetCallback === "function") {
          resetCallback();
        } else {
          console.warn("resetCallback missing — simulation reset skipped");
        }
        return true;
      }
    }

    renderCars(carRects);

    updateGraph(graph, cars, now);
  });
}

export function resetSimulation(simulationTimer, cars, carRects) {
  if (simulationTimer) {
    simulationTimer.stop();
  }

  cars.forEach((car, i) => {
    car.position = (i / cars.length) * trackLength;
    car.speed = 0.0;
    car.reactionTimer = 0;
  });

  renderCars(carRects);

  return null;
}

export function addGraph(svg, pathColor = DARK_GREEN, maxSpeed = DEFAULT_MAX_SPEED) {
  const width = 600;
  const height = 150;

  const margin = { top: 20, right: 20, bottom: 35, left: 45 };

  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  svg.attr("width", width)
    .attr("height", height);

  const inner = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);



  // --- SCALES ---

  const x = d3.scaleLinear()
    .domain([0, 1000])        // 1 second
    .range([0, w]);

  const y = d3.scaleLinear()
    .domain([0, maxSpeed * 1000 * 1.1])
    .range([h, 0]);

  const labelDist = maxSpeed === DEFAULT_MAX_SPEED ? 8 : 12;

  inner.append("line")
    .attr("class", "avg-line")
    .attr("x1", 0)
    .attr("x2", w)
    .attr("y1", y(maxSpeed * 1000))
    .attr("y2", y(maxSpeed * 1000))
    .attr("stroke", "grey")
    .attr("stroke-width", 3)
    .attr("stroke-dasharray", "8 8");

  inner.append("text")
    .attr("class", "avg-line-label")
    .attr("x", w)          // a little right of the line end
    .attr("y", y(maxSpeed * 1000) - labelDist)    // 8 pixels above the line
    .attr("fill", "grey")
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .attr("text-anchor", "end")  // align text start at this x position
    .text("Speed without distracted driver");

  // --- AXES ---  
  const ticks = d3.range(
    Math.ceil(x.domain()[0] / 1000) * 1000,
    x.domain()[1],
    1000
  );

  const xAxis = inner.append("g")
    .attr("transform", `translate(0,${h})`)
    .call(
      d3.axisBottom(x)
        .tickValues(ticks)
        .tickFormat(d => (d / 1000))
    );

  const yAxis = inner.append("g")
    .call(d3.axisLeft(y).ticks(3));

  // Axis labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Time (seconds)");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 10)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Average Speed (px/s)");

  // --- LINE GENERATOR ---
  const line = d3.line()
    .x(d => x(d.t))
    .y(d => y(d.avg));

  // --- HISTORY BUFFER ---
  const history = [];

  // --- PATH ELEMENT ---
  const path = inner.append("path")
    .attr("stroke", pathColor)
    .attr("stroke-width", 2)
    .attr("fill", "none");

  return { x, y, xAxis, yAxis, line, history, path, isFinalized: false };
}

export function updateGraph(graph, cars, t) {
  if (graph.isFinalized) return;

  const { x, xAxis, line, history, path } = graph;

  // Compute average speed
  const avg = d3.mean(cars, d => d.speed) * 1000;

  // Add to history
  history.push({ t, avg });

  const liveData = history.filter(d => d.t >= t - 10000);

  // Scroll x-axis to show last 10 seconds
  x.domain([Math.max(0, t - 10000), t]);

  const ticks = d3.range(
    Math.ceil(x.domain()[0] / 1000) * 1000,
    x.domain()[1],
    1000
  );

  xAxis.call(
    d3.axisBottom(x)
      .tickValues(ticks)
      .tickFormat(d => (d / 1000))
  );

  // Redraw the line
  path.attr("d", line(liveData));
}

export function finalizeGraph(graph) {
  const { x, y, xAxis, yAxis, line, history, path } = graph;

  graph.isFinalized = true;

  if (history.length === 0) return;

  // Convert ms → seconds for final view
  const start = history[0].t / 1000;
  const end = history[history.length - 1].t / 1000;

  // Change x scale to seconds
  x.domain([start, end]);

  // 1 tick per second
  // const ticks = d3.range(Math.ceil(start), Math.floor(end) + 1, 1);

  xAxis.call(
    d3.axisBottom(x)
      .ticks(5)
  );

  // Update path with converted time
  const finalData = history.map(d => ({
    t: d.t / 1000,
    avg: d.avg
  }));

  path.attr("d", line(finalData));
}

export function resetGraph(graph) {
  const { history, x, xAxis, path } = graph;

  // Clear history data
  history.length = 0;

  // Reset x domain to initial 0–10 seconds (0–10000 ms)
  x.domain([0, 10000]);

  // Reset ticks (one tick per second)
  const ticks = d3.range(0, 11000, 1000);

  xAxis.call(
    d3.axisBottom(x)
      .tickValues(ticks)
      .tickFormat(d => d / 1000)
  );

  // Clear the line visually
  path.attr("d", null);

  // Allow new data to be recorded again
  graph.isFinalized = false;
}

export function getCarCoords(carPosition) {
  const angle = posToAngle(carPosition);
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius
  };
}

let activeSimulation = null;
const stopCallbacks = new Map();

export const SimulationLock = {
  register(simId, stopCallback) {
    stopCallbacks.set(simId, stopCallback);
  },

  requestStart(simId) {
    if (activeSimulation && activeSimulation !== simId) {
      const stopCallback = stopCallbacks.get(activeSimulation);
      if (stopCallback) {
        stopCallback();
      }
    }
    activeSimulation = simId;
  },

  stop(simId) {
    if (activeSimulation === simId) {
      activeSimulation = null;
    }
  }
};