import { addCars, addGraph, addRoad, BLUE, centerX, centerY, createCars, DARK_GREEN, DEFAULT_REACTION_DELAY, finalizeGraph, RED, resetGraph, resetSimulation, SimulationLock, startSimulation } from "./helpers.js";

(() => {
  const SIM_ID = 3;

  const svg = d3.select("#traffic-simulation3");

  const GAME_START_DELAY = 6000;
  const PATTERN_INTRO_DELAY = 1500;
  const PATTERN_FLASH_DURATION = 500;
  const PATTERN_GAP_DURATION = 500;
  const ROUND_COMPLETE_DELAY = 1500;
  const TIME_PER_STEP = 2500;
  const USER_FLASH_DURATION = 200;
  const STARTING_SEQUENCE = 2;

  const numCars = 9;
  const maxSpeed = 0.1;
  const reactionDelay = 1200;
  const acceleration = 0.00005;

  // const cars = createCars(numCars, maxSpeed, acceleration, reactionDelay);
  const cars = createCars(numCars, maxSpeed, acceleration);
  cars[0].color = RED;
  cars[0].accel = 0.00015;

  addRoad(svg);

  const carRects = addCars(svg, cars);

  carRects
    .filter((d, i) => i === 0)
    .attr("stroke", "white")
    .attr("stroke-width", 1.25)

  const graph = addGraph(d3.select("#speed-graph3"), RED, 0.1);

  let simulationTimer = null;

  let slowDownTimer = null

  let accelerating = false;

  const button = d3.select('#restart-button3');

  let gameCleanup = null;
  let gameStartTimeout = null;

  button.on("click", buttonCallback);

  function buttonCallback() {
    const isGreen = button.classed("btn-success");

    if (isGreen) {
      SimulationLock.requestStart(SIM_ID);

      button
        .classed("btn-success", false)
        .classed("btn-danger", true)
        .text("Stop");

      // Clean up any existing game before starting new one
      if (gameCleanup) {
        gameCleanup();
        gameCleanup = null;
      }
      if (gameStartTimeout) {
        gameStartTimeout.stop();
        gameStartTimeout = null;
      }
      svg.selectAll(".game-element").remove();

      resetGraph(graph);

      startAcceleration();

      cars[0].maxSpeed = 0;
      cars.forEach((car) => {
        car.reactionDelay = DEFAULT_REACTION_DELAY;
      })
      d3.timeout(() => {
        console.log("reset")
        cars.forEach((car, i) => {
          car.reactionDelay = i === 0 ? 0 : reactionDelay;
          car.reactionTimer = reactionDelay;
        })
      }, DEFAULT_REACTION_DELAY)

      simulationTimer = startSimulation(simulationTimer, cars, carRects, graph, buttonCallback);

      gameStartTimeout = d3.timeout(() => {
        gameStartTimeout = null;
        gameCleanup = startGame();
      }, GAME_START_DELAY);
    } else {
      stopSimulation()
    }
  }

  function stopSimulation() {
    button
      .classed("btn-danger", false)
      .classed("btn-success", true)
      .text("Start");

    // Stop the game start timeout if it hasn't fired yet
    if (gameStartTimeout) {
      gameStartTimeout.stop();
      gameStartTimeout = null;
    }

    // Clean up game if it's running
    if (gameCleanup) {
      gameCleanup();
      gameCleanup = null;
    }

    finalizeGraph(graph);

    // Send data to combined chart
    if (typeof window.updateCombinedChart === 'function') {
      window.updateCombinedChart(SIM_ID, graph.history);
    }

    resetAcceleration();

    simulationTimer = resetSimulation(simulationTimer, cars, carRects);

    SimulationLock.stop(SIM_ID);
  }

  function resetAcceleration() {
    if (slowDownTimer) {
      slowDownTimer.stop();
      cars[0].maxSpeed = maxSpeed;
    }
  }

  function startAcceleration() {
    let lastTime = 0;
    slowDownTimer = d3.timer(now => {
      if (lastTime === 0) {
        lastTime = now;
        return;
      }

      const dt = now - lastTime;
      lastTime = now;

      if (accelerating) {
        const newMaxSpeed = Math.min(maxSpeed * 2, cars[0].maxSpeed + 0.0001 * dt);
        cars[0].maxSpeed = newMaxSpeed;
      } else {
        const newMaxSpeed = Math.max(0, cars[0].maxSpeed - 0.0001 * dt);
        cars[0].maxSpeed = newMaxSpeed;
      }
    })
  }

  const btn = d3.select("#accelerate-button")

  btn.on("pointerdown", function (event) {
    accelerating = true;
    event.target.setPointerCapture(event.pointerId);
  })

  btn.on("pointerup pointercancel", function (event) {
    accelerating = false;
    event.target.releasePointerCapture(event.pointerId);
  })

  SimulationLock.register(SIM_ID, stopSimulation);

  resetSimulation(simulationTimer, cars, carRects);

  //minigame

  function startGame() {
    // Remove any existing game elements
    svg.selectAll(".game-element").remove();

    const title = svg.append("text")
      .attr("class", "game-element")
      .attr("x", centerX)
      .attr("y", 125)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .text("Remember the Pattern");

    const puzzleRadius = 45;
    const colors = [
      d3.color(RED),
      d3.color(BLUE),
    ];

    const createCircle = (color, cx, cy) => {
      return svg.append("circle")
        .attr("class", "game-element")
        .attr("cx", centerX + cx)
        .attr("cy", centerY + cy)
        .attr("r", puzzleRadius)
        .attr("fill", color)
        .datum({ color })
        .style("cursor", "pointer")
        .style("pointer-events", "none")
        .on("mouseenter", function () {
          d3.select(this)
            .attr("stroke", "#000000")
            .attr("stroke-width", "2")
        })
        .on("mouseleave", function () {
          d3.select(this).attr("stroke", 'none')
        })
    }

    const circles = [
      createCircle(colors[0], -75, 0),
      createCircle(colors[1], 75, 0)
    ]

    const randomIndex = d3.randomInt(colors.length)
    const randomCircle = () => circles[randomIndex()];

    let sequence = [];

    [...Array(STARTING_SEQUENCE)].forEach(() => {
      sequence.push(randomCircle());
    })

    let userSequence = [];
    let countdownTimer = null;
    let countdownText = null;
    let gameActive = true;

    function cleanupGame() {
      gameActive = false;
      if (countdownTimer) countdownTimer.stop();
      svg.selectAll(".game-element").remove();
    }

    function stopGameLoop() {
      gameActive = false;
      if (countdownTimer) countdownTimer.stop();
      circles.forEach(c => c.style("pointer-events", "none"));
    }

    function gameLoop() {
      if (!gameActive) return;

      userSequence = [];

      title.text("Remember the Pattern")
        .attr("fill", "#000000");

      // Delay before starting the pattern flashes
      d3.timeout(() => {
        if (!gameActive) return;

        let delay = 0;

        for (const circle of sequence) {
          const { color } = circle.datum();

          d3.timeout(() => {
            if (!gameActive) return;
            circle.attr("fill", color.darker(2));
          }, delay);

          d3.timeout(() => {
            if (!gameActive) return;
            circle.attr("fill", color);
          }, delay + PATTERN_FLASH_DURATION);

          delay += PATTERN_FLASH_DURATION + PATTERN_GAP_DURATION;
        }

        // After showing pattern, enable user input
        d3.timeout(() => {
          if (!gameActive) return;
          title.text("Repeat the Pattern!");
          circles.forEach(c => c.style("pointer-events", "all"));
          startCountdown();
        }, delay);
      }, PATTERN_INTRO_DELAY);
    }

    function startCountdown() {
      if (!gameActive) return;

      // Time scales linearly based on sequence length
      const timeLimit = sequence.length * TIME_PER_STEP;

      countdownText = svg.append("text")
        .attr("class", "game-element")
        .attr("x", centerX)
        .attr("y", centerY + 100)
        .attr("text-anchor", "middle")
        .attr("font-size", "24px")
        .attr("font-weight", "bold")
        .attr("fill", RED);

      countdownTimer = d3.timer((elapsed) => {
        if (!gameActive) return;
        const remaining = Math.max(0, timeLimit - elapsed);
        const seconds = (remaining / 1000).toFixed(1);
        countdownText.text(`Time: ${seconds}s`);

        if (remaining <= 0) {
          countdownTimer.stop();
          failGame("Time's up!");
        }
      });
    }

    function failGame(message) {
      stopGameLoop();

      const level = sequence.length - STARTING_SEQUENCE + 1;
      title.text(`${message} - Reached Level ${level}`)
        .attr("fill", RED);

      if (countdownText) {
        countdownText.remove();
        countdownText = null;
      }

      // Clear the cleanup reference so buttonCallback won't remove game elements
      gameCleanup = null;

      buttonCallback(); // Stop the simulation
    }

    function nextRound() {
      if (!gameActive) return;

      if (countdownTimer) {
        countdownTimer.stop();
        countdownTimer = null;
      }
      if (countdownText) {
        countdownText.remove();
        countdownText = null;
      }
      circles.forEach(c => c.style("pointer-events", "none"));

      const level = sequence.length - STARTING_SEQUENCE + 1;
      title.text(`Level ${level} Complete!`)
        .attr("fill", DARK_GREEN);

      // Add one more step to the sequence
      sequence.push(randomCircle());

      d3.timeout(() => {
        if (!gameActive) return;
        gameLoop();
      }, ROUND_COMPLETE_DELAY);
    }

    // Handle user clicks
    circles.forEach((circle, index) => {
      circle.on("click", function () {
        if (!gameActive) return;

        const { color } = d3.select(this).datum();

        // Flash the circle
        d3.select(this).attr("fill", color.darker(2));
        d3.timeout(() => {
          d3.select(this).attr("fill", color);
        }, USER_FLASH_DURATION);

        userSequence.push(circle);

        // Check if user input matches
        const currentIndex = userSequence.length - 1;
        if (userSequence[currentIndex] !== sequence[currentIndex]) {
          failGame("Wrong pattern!");
          return;
        }

        // Check if user completed the sequence
        if (userSequence.length === sequence.length) {
          nextRound();
        }
      });
    });

    gameLoop();

    // Return cleanup function
    return cleanupGame;
  }
})();