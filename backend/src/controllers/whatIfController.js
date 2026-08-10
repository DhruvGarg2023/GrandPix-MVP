import { WhatIfSandboxEngine } from '../whatif/WhatIfSandboxEngine.js';

export class WhatIfController {
  constructor(simEngine, storage) {
    this.simEngine = simEngine;
    this.storage = storage;
    this.sandboxEngine = new WhatIfSandboxEngine(simEngine, storage);
  }

  runWhatIfScenario = async (req, res) => {
    const body = req.body || {};

    try {
      const result = await this.sandboxEngine.runScenario(body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'What-If Sandbox execution failed', message: err.message });
    }
  };
}
