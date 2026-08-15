import { config } from '../config/env.js';
import { AiContextBuilder } from './AiContextBuilder.js';
import { AiFallback } from './AiFallback.js';

export class AiTriggerController {
  constructor(recommendationService, socketGateway) {
    this.recService = recommendationService;
    this.socketGateway = socketGateway;
    
    this.cache = new Map(); // { hash -> { recommendation, timestamp } }
    this.sessionRequests = 0;
    this.lastAutomaticCallTime = 0;
    this.lastManualCallTime = 0;
    this.requestInProgress = false;
    
    this.debounceTimer = null;
    this.latestStateToEvaluate = null;
    
    this.maxRequestsPerSession = parseInt(process.env.MAX_AI_REQUESTS_PER_SESSION || '20', 10);
    this.automaticCooldownMs = parseInt(process.env.AI_COOLDOWN_MS || '120000', 10);
    this.manualCooldownMs = parseInt(process.env.MANUAL_AI_COOLDOWN_MS || '30000', 10);
    this.debounceMs = parseInt(process.env.AI_TRIGGER_DEBOUNCE_MS || '5000', 10);
    this.cacheTtlMs = parseInt(process.env.AI_CACHE_TTL_MS || '600000', 10);
  }

  evaluateState(simState, risksPayload, predictionsMap) {
    const { context, hash } = AiContextBuilder.buildContext(simState, risksPayload, predictionsMap) || {};
    if (!context || !hash) return;
    
    // We check if this context has a critical material state.
    const hasMaterialTrigger = context.criticalNodes.some(n => n.riskLevel === 'CRITICAL' || n.predictionBucket.startsWith('CRITICAL'));
    const isMajorEventTransition = context.event === 'EXIT_RUSH';
    const hasMajorIncident = context.incidents.length > 0;

    if (!hasMaterialTrigger && !isMajorEventTransition && !hasMajorIncident) {
      return; // No trigger
    }

    this.latestStateToEvaluate = { context, hash };
    this.latestSimState = simState;
    this.latestRisksPayload = risksPayload;
    this.latestPredictionsMap = predictionsMap;

    if (!this.debounceTimer) {
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this._processTrigger(this.latestStateToEvaluate, 'automatic');
      }, this.debounceMs);
    }
  }

  async processManualRequest(simState, risksPayload, predictionsMap) {
    const { context, hash } = AiContextBuilder.buildContext(simState, risksPayload, predictionsMap) || {};
    if (!context || !hash) throw new Error("Invalid state context");

    // Temporarily store these so processTrigger can pass them to RecommendationService
    this.latestSimState = simState;
    this.latestRisksPayload = risksPayload;
    this.latestPredictionsMap = predictionsMap;

    return await this._processTrigger({ context, hash }, 'manual');
  }

  async _processTrigger({ context, hash }, type = 'automatic') {
    if (this.requestInProgress) {
      console.log(`[AI] Request suppressed: request already in progress`);
      return null;
    }

    const now = Date.now();

    // 1. Check Cooldowns
    if (type === 'automatic') {
      if (now - this.lastAutomaticCallTime < this.automaticCooldownMs) {
        console.log(`[AI] Request suppressed: cooldown (Automatic)`);
        return null;
      }
    } else {
      if (now - this.lastManualCallTime < this.manualCooldownMs) {
        console.log(`[AI] Request suppressed: cooldown (Manual)`);
        return this.getFallbackOrCached(hash, context);
      }
    }

    // 2. Check Cache
    const cached = this.cache.get(hash);
    if (cached && (now - cached.timestamp < this.cacheTtlMs)) {
      console.log(`[AI] Request suppressed: duplicate context (Cache HIT)`);
      if (type === 'automatic') {
        this.socketGateway?.broadcastRecommendation(cached.recommendation);
      }
      return cached.recommendation;
    }

    // 3. Check Budget
    if (this.sessionRequests >= this.maxRequestsPerSession) {
      console.log(`[AI] Request suppressed: session budget exhausted`);
      const fallback = AiFallback.generateFallbackRecommendation(context);
      if (type === 'automatic') {
        this.socketGateway?.broadcastRecommendation(fallback);
      }
      return fallback;
    }

    // Proceed to call HF
    try {
      this.requestInProgress = true;
      if (type === 'automatic') this.lastAutomaticCallTime = now;
      if (type === 'manual') this.lastManualCallTime = now;
      
      console.log(`[AI] Trigger detected: ${type}. Context hash: ${hash}`);
      console.log(`[AI] Request started. Count: ${this.sessionRequests + 1}/${this.maxRequestsPerSession}`);
      
      this.sessionRequests++;
      
      const { recommendation } = await this.recService.getRecommendation(this.latestSimState, this.latestRisksPayload, this.latestPredictionsMap);
      
      console.log(`[AI] Request completed`);
      
      this.cache.set(hash, { recommendation, timestamp: Date.now() });
      
      if (type === 'automatic') {
        this.socketGateway?.broadcastRecommendation(recommendation);
      }
      return recommendation;
    } catch (err) {
      console.error(`[AI] HF Failure: ${err.message}. Using fallback.`);
      const fallback = AiFallback.generateFallbackRecommendation(context);
      if (type === 'automatic') {
        this.socketGateway?.broadcastRecommendation(fallback);
      }
      return fallback;
    } finally {
      this.requestInProgress = false;
    }
  }

  getFallbackOrCached(hash, context) {
    const cached = this.cache.get(hash);
    if (cached) return cached.recommendation;
    return AiFallback.generateFallbackRecommendation(context);
  }
}
