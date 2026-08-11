import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataLoader } from '../src/loader/DataLoader.js';
import { InMemoryStorage } from '../src/storage/InMemoryStorage.js';
import { SimulationEngine } from '../src/engine/SimulationEngine.js';
import { ScheduleWeatherManager, timeToSeconds, secondsToTime } from '../src/engine/ScheduleWeatherManager.js';
import { DestinationSelector } from '../src/engine/DestinationSelector.js';
import { SeededRNG } from '../src/utils/random.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, '../../data');

describe('Backend Milestone 3 - Simulation Engine & Clock Tests', () => {
  it('should format and parse simulation times correctly', () => {
    assert.equal(timeToSeconds('08:00'), 28800);
    assert.equal(timeToSeconds('16:20'), 58800);
    assert.equal(secondsToTime(58800), '16:20');
    assert.equal(secondsToTime(58810), '16:20');
  });

  it('should resolve active F1 schedule events and weather conditions accurately', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();

    const manager = new ScheduleWeatherManager(masterData.schedule, masterData.weather);

    assert.equal(manager.getActiveEvent(timeToSeconds('08:00')), 'ENTRY_RUSH');
    assert.equal(manager.getActiveEvent(timeToSeconds('11:00')), 'PRACTICE');
    assert.equal(manager.getActiveEvent(timeToSeconds('13:00')), 'LUNCH');
    assert.equal(manager.getActiveEvent(timeToSeconds('17:00')), 'RACE');
    assert.equal(manager.getActiveEvent(timeToSeconds('19:30')), 'EXIT_RUSH');

    assert.equal(manager.getWeatherAt(timeToSeconds('08:00')).condition, 'clear');
    assert.equal(manager.getWeatherAt(timeToSeconds('16:30')).condition, 'light_rain');

    const heavyRain = manager.getWeatherAt(timeToSeconds('17:00'));
    assert.equal(heavyRain.condition, 'heavy_rain');
    assert.equal(heavyRain.speedMultiplier, 0.70);
  });

  it('should select destinations deterministically using SeededRNG', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();

    const rng = new SeededRNG(42);
    const selector = new DestinationSelector(masterData, rng);

    const dest1 = selector.selectDestination('hardcore_fan', 'RACE');
    assert.ok(['GS_A', 'GS_B', 'GS_C', 'FAN_ZONE'].includes(dest1), `Destination ${dest1} must be valid`);

    const destLunch = selector.selectDestination('family', 'LUNCH');
    assert.ok(['FOOD_N', 'FOOD_S', 'FAN_ZONE', 'MERCH', 'GS_A', 'GS_C'].includes(destLunch));
  });

  it('should start, pause, resume, reset, and advance tick cleanly', () => {
    const storage = new InMemoryStorage();
    const loader = new DataLoader(dataPath);
    loader.loadAndHydrate(storage);

    const simEngine = new SimulationEngine(storage, '16:20');

    let state = simEngine.getState();
    assert.equal(state.isRunning, false);
    assert.equal(state.tick, 0);
    assert.equal(state.simTime, '16:20');

    state = simEngine.start();
    assert.equal(state.isRunning, true);

    state = simEngine.pause();
    assert.equal(state.isRunning, false);

    state = simEngine.resume();
    assert.equal(state.isRunning, true);

    state = simEngine.tick();
    assert.equal(state.tick, 1);
    assert.equal(state.simTime, '16:20');

    // Run 10 ticks (100 seconds)
    for (let i = 0; i < 9; i++) {
      simEngine.tick();
    }
    state = simEngine.getState();
    assert.equal(state.tick, 10);
    assert.equal(state.simTime, '16:21');

    // Test Reset
    state = simEngine.reset();
    assert.equal(state.isRunning, false);
    assert.equal(state.tick, 0);
    assert.equal(state.simTime, '16:20');
  });

  it('should advance agents along routes and update node occupancies', () => {
    const storage = new InMemoryStorage();
    const loader = new DataLoader(dataPath);
    loader.loadAndHydrate(storage);

    const simEngine = new SimulationEngine(storage, '16:20');

    // Run 60 ticks (600 seconds = 10 minutes)
    for (let i = 0; i < 60; i++) {
      simEngine.tick();
    }

    const state = simEngine.getState();
    assert.equal(state.tick, 60);
    assert.equal(state.simTime, '16:30');

    // Verify weather transition at 16:30 to light_rain
    assert.equal(state.weather.condition, 'light_rain');

    // Verify agents have moved and occupancies exist across nodes
    const nodeOccupancies = state.nodes.reduce((acc, n) => acc + n.currentOccupancy, 0);
    assert.ok(nodeOccupancies > 0, 'Total node occupancies should be greater than 0');
  });
});
