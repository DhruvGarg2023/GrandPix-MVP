import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CandidateActionGenerator } from '../src/ai/CandidateActionGenerator.js';
import { DeterministicFallbackEngine } from '../src/ai/DeterministicFallbackEngine.js';
import { HuggingFaceAdapter } from '../src/ai/HuggingFaceAdapter.js';
import { RecommendationService } from '../src/ai/RecommendationService.js';

describe('Backend Milestone 7 - Hugging Face AI Reasoning & Fallback Tests', () => {
  it('should generate candidate actions accurately based on simulation risk state', () => {
    const generator = new CandidateActionGenerator();

    // 1. Safe state test
    const safeState = { simTime: '16:20', nodes: [{ id: 'GS_A', riskScore: 0.1, riskSeverity: 'SAFE' }] };
    const safeActions = generator.generateCandidateActions(safeState, null, null);

    assert.equal(safeActions[0].actionType, 'MAINTAIN_MONITORING');
    assert.equal(safeActions[0].priority, 'LOW');

    // 2. High risk state test
    const highRiskState = {
      simTime: '17:25',
      activeEvent: 'RACE',
      weather: { condition: 'heavy_rain' },
      nodes: [
        { id: 'GS_A', riskScore: 0.2, riskSeverity: 'SAFE', densityRatio: 0.4 },
        { id: 'GS_B', riskScore: 0.78, riskSeverity: 'CRITICAL', densityRatio: 0.88, queueLength: 0 }
      ],
      edges: [{ id: 'E16', isBlocked: true }]
    };

    const riskActions = generator.generateCandidateActions(highRiskState, null, null);
    assert.equal(riskActions[0].targetNode, 'GS_B');
    assert.equal(riskActions[0].actionType, 'REROUTE_CROWD');
    assert.equal(riskActions[0].priority, 'CRITICAL');
  });

  it('should produce structured deterministic fallback recommendations when HF token is absent or API fails', async () => {
    const fallbackEngine = new DeterministicFallbackEngine();
    const candidate = {
      actionType: 'REROUTE_CROWD',
      targetNode: 'GS_B',
      priority: 'CRITICAL',
      title: 'Reroute GS_B Crowd',
      facts: {
        simTime: '17:25',
        currentDensityRatio: 0.88,
        predictedDensity10minRatio: 0.95,
        riskScore: 0.78,
        riskSeverity: 'CRITICAL',
        weather: 'heavy_rain'
      }
    };

    const result = fallbackEngine.generateFallbackRecommendation(candidate, 'Token missing');

    assert.equal(result.targetNode, 'GS_B');
    assert.equal(result.actionType, 'REROUTE_CROWD');
    assert.equal(result.priority, 'CRITICAL');
    assert.equal(result.isFallback, true);
    assert.ok(result.reasoning.includes('GS_B'));
    assert.ok(result.reasoning.includes('88.0%'));
  });

  it('should invoke fallback engine cleanly when Hugging Face adapter has no token configured', async () => {
    const adapter = new HuggingFaceAdapter('', 'mistralai/Mixtral-8x7B-Instruct-v0.1');

    const candidate = {
      actionType: 'REROUTE_CROWD',
      targetNode: 'GS_B',
      priority: 'CRITICAL',
      title: 'Reroute GS_B Crowd',
      facts: { simTime: '17:25', currentDensityRatio: 0.88, predictedDensity10minRatio: 0.95, riskScore: 0.78 }
    };

    const recommendation = await adapter.generateRecommendation(candidate);

    assert.equal(recommendation.targetNode, 'GS_B');
    assert.equal(recommendation.isFallback, true);
    assert.ok(recommendation.fallbackReason.includes('HF_TOKEN'));
  });

  it('should orchestrate recommendation generation in RecommendationService', async () => {
    const service = new RecommendationService(new HuggingFaceAdapter('')); // Empty token triggers fallback

    const simState = {
      simTime: '17:25',
      activeEvent: 'RACE',
      weather: { condition: 'heavy_rain' },
      nodes: [
        { id: 'GS_B', riskScore: 0.85, riskSeverity: 'CRITICAL', densityRatio: 0.92 }
      ],
      edges: [{ id: 'E16', isBlocked: true }]
    };

    const { recommendation, candidateActions } = await service.getRecommendation(simState, null, null);

    assert.ok(candidateActions.length > 0);
    assert.equal(recommendation.targetNode, 'GS_B');
    assert.equal(recommendation.actionType, 'REROUTE_CROWD');
    assert.equal(recommendation.isFallback, true);
  });
});
