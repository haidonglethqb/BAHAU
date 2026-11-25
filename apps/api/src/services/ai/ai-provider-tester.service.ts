import type { TestAiConnectionInput, TestAiConnectionResult } from "@bahau/contracts";
import { AiConfigService, aiConfigService } from "./ai-config.service.js";
import { AiSsrfValidator } from "./ai-ssrf-validator.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const MODEL_NAME_REGEX = /^[a-zA-Z0-9_.:/-]{1,80}$/;

export class AiProviderTesterService {
  constructor(private readonly configService: AiConfigService) {}

  async testConnection(params: TestAiConnectionInput): Promise<TestAiConnectionResult> {
    const cfg = this.configService.getConfig();
    const targetProvider = params.provider ?? (cfg.provider === "LOCAL_ONLY" ? "CODEX" : cfg.provider);
    const targetKey =
      params.apiKey?.trim() || (targetProvider === "CODEX" ? cfg.codexApiKey : cfg.groqApiKey);
    const targetBaseUrl =
      params.baseUrl?.trim() || (targetProvider === "CODEX" ? cfg.codexBaseUrl : GROQ_BASE_URL);
    const targetModel =
      params.model?.trim() ||
      (targetProvider === "CODEX" ? cfg.codexPrimaryModel : cfg.groqPrimaryModel);

    if (!targetKey) {
      return { ok: false, error: "Chưa có API Key được cấu hình" };
    }

    if (!MODEL_NAME_REGEX.test(targetModel)) {
      return { ok: false, error: "Tên model không hợp lệ" };
    }

    const ssrfCheck = await AiSsrfValidator.validateTargetUrl(targetBaseUrl);
    if (!ssrfCheck.valid) {
      return { ok: false, error: `SSRF validation failed: ${ssrfCheck.reason}` };
    }

    const endpoint = `${targetBaseUrl.replace(/\/+$/, "")}/chat/completions`;
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);

      const response = await fetch(endpoint, {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${targetKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "user", content: "Xin chào Trợ lý AI BAHAU!" }],
          temperature: 0.3,
          max_tokens: 30,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (!response.ok) {
        const text = await response.text();
        return {
          ok: false,
          status: response.status,
          latencyMs: Date.now() - start,
          error: text.slice(0, 200),
        };
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = json.choices?.[0]?.message?.content ?? "";
      return {
        ok: true,
        status: response.status,
        latencyMs: Date.now() - start,
        model: targetModel,
        sampleReply: reply.slice(0, 150),
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export const aiProviderTesterService = new AiProviderTesterService(aiConfigService);
