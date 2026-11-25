import { callToolCompletion } from "./agent-gateway-client.js";
import { AiConfigService, aiConfigService } from "./ai-config.service.js";
import { AiSsrfValidator } from "./ai-ssrf-validator.js";
import type {
  AiSystemConfig,
  CandidateSpec,
  LlmToolMessage,
  LlmToolStepResult,
} from "./ai-types.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_ENDPOINT = `${GROQ_BASE_URL}/chat/completions`;
const GROQ_FALLBACK_MODEL = "llama-3.3-70b-versatile";

export class AiGatewayService {
  private readonly configService: AiConfigService;

  constructor(configService?: AiConfigService) {
    this.configService = configService ?? aiConfigService;
  }

  async executeToolStep(
    messages: LlmToolMessage[],
    tools: unknown[],
    onProgress?: (message: string) => void,
    onTextDelta?: (text: string) => void
  ): Promise<LlmToolStepResult> {
    const config = this.configService.getConfig();
    if (config.provider === "LOCAL_ONLY") {
      throw new Error("Configured to use Local Deterministic fallback");
    }

    const candidates = this.buildCandidates(config);
    if (candidates.length === 0) {
      throw new Error("No AI provider API key configured");
    }

    const errors: string[] = [];
    for (let tier = 0; tier < candidates.length; tier++) {
      const candidate = candidates[tier];
      if (!candidate) continue;
      if (tier > 0) {
        onProgress?.("Đang thử lại bằng mô hình AI dự phòng...");
      }

      try {
        const ssrfCheck = await AiSsrfValidator.validateTargetUrl(candidate.endpoint);
        if (!ssrfCheck.valid) {
          throw new Error(`SSRF validation failed: ${ssrfCheck.reason}`);
        }

        const res = await callToolCompletion(
          candidate,
          messages,
          tools,
          config.temperature,
          onProgress,
          onTextDelta
        );
        return {
          ...res,
          modelUsed: candidate.id,
          fallbackTier: tier + 1,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Tier ${tier + 1} (${candidate.id}) failed: ${msg}`);
      }
    }

    throw new Error(`All failover models exhausted: ${errors.join("; ")}`);
  }

  private buildCandidates(cfg: AiSystemConfig): CandidateSpec[] {
    const list: CandidateSpec[] = [];
    const codexEndpoint = `${cfg.codexBaseUrl.replace(/\/+$/, "")}/chat/completions`;

    if (cfg.provider === "CODEX") {
      if (cfg.codexApiKey) {
        list.push({
          id: cfg.codexPrimaryModel,
          endpoint: codexEndpoint,
          apiKey: cfg.codexApiKey,
          timeoutMs: cfg.timeoutMs,
        });
        if (cfg.codexFallbackModel && cfg.codexFallbackModel !== cfg.codexPrimaryModel) {
          list.push({
            id: cfg.codexFallbackModel,
            endpoint: codexEndpoint,
            apiKey: cfg.codexApiKey,
            timeoutMs: Math.min(cfg.timeoutMs, 15_000),
          });
        }
      }
      if (cfg.groqApiKey) {
        list.push({
          id: cfg.groqPrimaryModel,
          endpoint: GROQ_ENDPOINT,
          apiKey: cfg.groqApiKey,
          timeoutMs: Math.min(cfg.timeoutMs, 12_000),
        });
      }
    } else if (cfg.provider === "GROQ") {
      if (cfg.groqApiKey) {
        list.push({
          id: cfg.groqPrimaryModel,
          endpoint: GROQ_ENDPOINT,
          apiKey: cfg.groqApiKey,
          timeoutMs: Math.min(cfg.timeoutMs, 12_000),
        });
        if (cfg.groqPrimaryModel !== GROQ_FALLBACK_MODEL) {
          list.push({
            id: GROQ_FALLBACK_MODEL,
            endpoint: GROQ_ENDPOINT,
            apiKey: cfg.groqApiKey,
            timeoutMs: Math.min(cfg.timeoutMs, 10_000),
          });
        }
      }
      if (cfg.codexApiKey) {
        list.push({
          id: cfg.codexPrimaryModel,
          endpoint: codexEndpoint,
          apiKey: cfg.codexApiKey,
          timeoutMs: cfg.timeoutMs,
        });
      }
    }

    return list;
  }
}

export const aiGatewayService = new AiGatewayService(aiConfigService);
