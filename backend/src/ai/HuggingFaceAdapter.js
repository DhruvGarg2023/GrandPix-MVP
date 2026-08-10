import { HfInference } from '@huggingface/inference';
import { config } from '../config/env.js';
import { DeterministicFallbackEngine } from './DeterministicFallbackEngine.js';

/**
 * HuggingFaceAdapter formats prompts and calls HF Serverless Router API with resilient fallback protection.
 */
export class HuggingFaceAdapter {
  constructor(token = config.hfToken, model = config.hfModel) {
    this.token = token;
    this.model = model || 'Qwen/Qwen2.5-Coder-32B-Instruct';
    this.fallbackEngine = new DeterministicFallbackEngine();
    this.timeoutMs = 8000;
  }

  async generateRecommendation(candidateAction) {
    if (!candidateAction) {
      return this.fallbackEngine.generateFallbackRecommendation({
        actionType: 'MAINTAIN_MONITORING',
        targetNode: 'VENUE',
        priority: 'LOW'
      }, 'No candidate action provided');
    }

    if (!this.token || this.token.trim() === '' || this.token.includes('YOUR_HF_TOKEN') || this.token.includes('hf_xxx')) {
      return this.fallbackEngine.generateFallbackRecommendation(
        candidateAction,
        'HF_TOKEN is missing or not configured in backend/.env'
      );
    }

    const facts = candidateAction.facts || {};

    const systemPrompt = `You are an expert F1 Circuit Operations AI Advisor.
Analyze the following venue crowd simulation facts:
- Target Zone: ${candidateAction.targetNode}
- Recommended Action: ${candidateAction.actionType}
- Priority Level: ${candidateAction.priority}
- Current Time: ${facts.simTime || '17:25'}
- Active Event: ${facts.activeEvent || 'RACE'}
- Weather Condition: ${facts.weather || 'heavy_rain'}
- Current Density Ratio: ${facts.currentDensityRatio ? (facts.currentDensityRatio * 100).toFixed(1) + '%' : 'N/A'}
- 10-Min Predicted Density: ${facts.predictedDensity10minRatio ? (facts.predictedDensity10minRatio * 100).toFixed(1) + '%' : 'N/A'}
- Risk Score & Severity: ${facts.riskScore} (${facts.riskSeverity})

Provide a concise 2-sentence operational explanation explaining WHY this recommendation is necessary.
Respond strictly in JSON format: {"title": "short title", "reasoning": "two sentence explanation"}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let responseText = null;
      let lastError = null;

      // Primary Endpoint: Hugging Face Serverless Auto Router API
      try {
        const routerRes = await fetch('https://router.huggingface.co/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: 'user', content: systemPrompt }],
            max_tokens: 200,
            temperature: 0.3
          }),
          signal: controller.signal
        });

        if (routerRes.ok) {
          const routerData = await routerRes.json();
          responseText = routerData?.choices?.[0]?.message?.content || null;
        } else {
          const errBody = await routerRes.text().catch(() => '');
          lastError = `HF Router API returned ${routerRes.status}: ${errBody || routerRes.statusText}`;
        }
      } catch (routerErr) {
        lastError = routerErr.message;
      }

      // SDK Fallback Endpoint if router fails
      if (!responseText) {
        try {
          const hf = new HfInference(this.token.trim());
          const sdkRes = await hf.textGeneration({
            model: this.model,
            inputs: systemPrompt,
            parameters: { max_new_tokens: 150, temperature: 0.3, return_full_text: false }
          }, { signal: controller.signal });

          responseText = sdkRes?.generated_text?.trim() || null;
        } catch (sdkErr) {
          if (!lastError) lastError = sdkErr.message;
        }
      }

      clearTimeout(timeoutId);

      if (responseText) {
        // Attempt JSON parsing from LLM output
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.reasoning) {
              return {
                id: `rec_${Date.now()}`,
                timestamp: facts.simTime || new Date().toISOString(),
                actionType: candidateAction.actionType,
                targetNode: candidateAction.targetNode,
                priority: candidateAction.priority,
                title: parsed.title || candidateAction.title,
                reasoning: parsed.reasoning,
                isFallback: false
              };
            }
          } catch (e) {
            // Continuation fallback
          }
        }

        // If LLM returned raw explanation text without JSON wrapper
        if (responseText.length > 10) {
          return {
            id: `rec_${Date.now()}`,
            timestamp: facts.simTime || new Date().toISOString(),
            actionType: candidateAction.actionType,
            targetNode: candidateAction.targetNode,
            priority: candidateAction.priority,
            title: candidateAction.title,
            reasoning: responseText.replace(/[\{\}"]/g, '').trim(),
            isFallback: false
          };
        }
      }

      throw new Error(lastError || 'HF output could not be retrieved or parsed');

    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[HuggingFaceAdapter] HF Inference call failed (${err.message}). Using deterministic fallback.`);
      return this.fallbackEngine.generateFallbackRecommendation(candidateAction, `HF API Error: ${err.message}`);
    }
  }
}
