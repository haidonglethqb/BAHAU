import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AppError } from "../../middlewares/error.middleware.js";
import type { AiSystemConfig, MaskedAiConfig } from "./ai-types.js";

export const AVAILABLE_CODEX_MODELS = [
  "gpt-6.1-sol",
  "gpt-6.1-terra",
  "gpt-4o",
  "gpt-4o-mini",
  "gemini-2.5-flash",
  "claude-sonnet-4",
];

export const AVAILABLE_GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "llama-3.3-70b-versatile",
  "qwen/qwen3-32b",
];

function getEncryptionKey(): Buffer {
  return createHash("sha256")
    .update(process.env.SESSION_SECRET || "bahau-local-ai-key-v1")
    .digest();
}

function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
  } catch {
    return "";
  }
}

function decryptSecret(encryptedStr: string): string {
  if (!encryptedStr || typeof encryptedStr !== "string" || !encryptedStr.startsWith("enc:v1:")) {
    return "";
  }
  try {
    const parts = encryptedStr.split(":");
    if (parts.length !== 5) return "";
    const ivHex = parts[2];
    const tagHex = parts[3];
    const cipherHex = parts[4];
    if (!ivHex || !tagHex || !cipherHex) return "";

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const cipherText = Buffer.from(cipherHex, "hex");

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    return decrypted.toString("utf-8");
  } catch {
    return "";
  }
}

function readSecret(envVarName: string, secretFileName: string): string {
  const directEnv = process.env[envVarName]?.trim();
  if (directEnv) return directEnv;

  const fileEnv = process.env[`${envVarName}_FILE`]?.trim();
  const candidateFiles = [fileEnv, `/run/secrets/${secretFileName}`].filter(Boolean) as string[];
  for (const filePath of candidateFiles) {
    try {
      if (existsSync(filePath)) {
        const val = readFileSync(filePath, "utf-8").trim();
        if (val) return val;
      }
    } catch {
      // Ignore unreadable secret files
    }
  }
  return "";
}

function normalizeLimit(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.min(100_000, Math.floor(num));
}

function buildDefaultConfig(): AiSystemConfig {
  return {
    provider: "CODEX",
    codexApiKey: readSecret("CODEX_API_KEY", "CODEX_API_KEY"),
    codexBaseUrl: process.env.CODEX_BASE_URL?.trim() || "https://api.modelapi.vn/v1",
    codexPrimaryModel: "gpt-6.1-sol",
    codexFallbackModel: "gpt-6.1-terra",
    groqApiKey: readSecret("GROQ_API_KEY", "GROQ_API_KEY"),
    groqPrimaryModel: "openai/gpt-oss-120b",
    temperature: 0.3,
    timeoutMs: 28000,
    defaultUserDailyLimit: null,
    userDailyLimits: {},
  };
}

export class AiConfigService {
  private config: AiSystemConfig;
  private readonly configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath ?? join(process.cwd(), ".data", "ai-config.json");
    this.config = this.loadConfig();
  }

  getConfig(): AiSystemConfig {
    return { ...this.config, userDailyLimits: { ...this.config.userDailyLimits } };
  }

  getMaskedConfig(): MaskedAiConfig {
    return {
      provider: this.config.provider,
      codexApiKeyMasked: this.maskKey(this.config.codexApiKey),
      hasCodexApiKey: Boolean(this.config.codexApiKey),
      codexBaseUrl: this.config.codexBaseUrl,
      codexPrimaryModel: this.config.codexPrimaryModel,
      codexFallbackModel: this.config.codexFallbackModel,
      groqApiKeyMasked: this.maskKey(this.config.groqApiKey),
      hasGroqApiKey: Boolean(this.config.groqApiKey),
      groqPrimaryModel: this.config.groqPrimaryModel,
      temperature: this.config.temperature,
      timeoutMs: this.config.timeoutMs,
      defaultUserDailyLimit: this.config.defaultUserDailyLimit,
    };
  }

  getUserDailyLimit(userId: string): number | null {
    const override = this.config.userDailyLimits[userId];
    return typeof override === "number" && Number.isFinite(override) && override >= 0
      ? override
      : this.config.defaultUserDailyLimit;
  }

  getCustomUserLimit(userId: string): number | null {
    const override = this.config.userDailyLimits[userId];
    return typeof override === "number" && Number.isFinite(override) && override >= 0
      ? override
      : null;
  }

  setUserDailyLimit(userId: string, rawLimit: unknown): number | null {
    const limit = normalizeLimit(rawLimit);
    const nextMap = { ...this.config.userDailyLimits };
    if (limit === null) {
      delete nextMap[userId];
    } else {
      nextMap[userId] = limit;
    }
    this.config = { ...this.config, userDailyLimits: nextMap };
    this.saveConfig(this.config);
    return limit;
  }

  setDefaultUserDailyLimit(rawLimit: unknown): number | null {
    const limit = normalizeLimit(rawLimit);
    this.config = { ...this.config, defaultUserDailyLimit: limit };
    this.saveConfig(this.config);
    return limit;
  }

  updateConfig(updates: Partial<AiSystemConfig>): AiSystemConfig {
    const next: AiSystemConfig = {
      ...this.config,
      userDailyLimits: { ...this.config.userDailyLimits },
    };

    if (updates.provider) next.provider = updates.provider;
    if (updates.codexApiKey !== undefined && updates.codexApiKey.trim()) {
      next.codexApiKey = updates.codexApiKey.trim();
    }
    if (updates.codexBaseUrl !== undefined && updates.codexBaseUrl.trim()) {
      const candidateUrl = updates.codexBaseUrl.trim();
      let parsed: URL;
      try {
        parsed = new URL(candidateUrl);
      } catch {
        throw new AppError(400, "INVALID_AI_CONFIG", "Base URL không đúng định dạng URL hợp lệ.");
      }
      if (parsed.protocol !== "https:") {
        throw new AppError(400, "INVALID_AI_CONFIG", "Base URL bắt buộc sử dụng giao thức HTTPS.");
      }
      next.codexBaseUrl = candidateUrl;
    }
    if (updates.codexPrimaryModel) next.codexPrimaryModel = updates.codexPrimaryModel.trim();
    if (updates.codexFallbackModel) next.codexFallbackModel = updates.codexFallbackModel.trim();
    if (updates.groqApiKey !== undefined && updates.groqApiKey.trim()) {
      next.groqApiKey = updates.groqApiKey.trim();
    }
    if (updates.groqPrimaryModel) next.groqPrimaryModel = updates.groqPrimaryModel.trim();
    if (typeof updates.temperature === "number" && Number.isFinite(updates.temperature)) {
      next.temperature = updates.temperature;
    }
    if (typeof updates.timeoutMs === "number" && Number.isFinite(updates.timeoutMs)) {
      next.timeoutMs = updates.timeoutMs;
    }
    if (updates.defaultUserDailyLimit !== undefined) {
      next.defaultUserDailyLimit = normalizeLimit(updates.defaultUserDailyLimit);
    }

    this.config = next;
    this.saveConfig(this.config);
    return this.getConfig();
  }

  private loadConfig(): AiSystemConfig {
    const baseDefaults = buildDefaultConfig();
    try {
      if (existsSync(this.configPath)) {
        const rawContent = readFileSync(this.configPath, "utf-8");
        const parsed = JSON.parse(rawContent) as Record<string, unknown>;
        const hadPlaintext = "codexApiKey" in parsed || "groqApiKey" in parsed;

        // Strip persisted plaintext keys even if an external file manually included them
        delete parsed.codexApiKey;
        delete parsed.groqApiKey;

        const savedCodexKey =
          typeof parsed.codexApiKeyEnc === "string"
            ? decryptSecret(parsed.codexApiKeyEnc)
            : "";
        const savedGroqKey =
          typeof parsed.groqApiKeyEnc === "string"
            ? decryptSecret(parsed.groqApiKeyEnc)
            : "";

        const effectiveCodexKey = savedCodexKey || baseDefaults.codexApiKey;
        const effectiveGroqKey = savedGroqKey || baseDefaults.groqApiKey;

        delete parsed.codexApiKeyEnc;
        delete parsed.groqApiKeyEnc;

        const rawLimits =
          parsed.userDailyLimits && typeof parsed.userDailyLimits === "object"
            ? (parsed.userDailyLimits as Record<string, unknown>)
            : {};
        const cleanLimits: Record<string, number> = {};
        for (const [uid, val] of Object.entries(rawLimits)) {
          const norm = normalizeLimit(val);
          if (norm !== null) cleanLimits[uid] = norm;
        }

        const resolvedConfig: AiSystemConfig = {
          ...baseDefaults,
          ...(parsed as Partial<AiSystemConfig>),
          codexApiKey: effectiveCodexKey,
          groqApiKey: effectiveGroqKey,
          defaultUserDailyLimit:
            parsed.defaultUserDailyLimit !== undefined
              ? normalizeLimit(parsed.defaultUserDailyLimit)
              : null,
          userDailyLimits: cleanLimits,
        };

        if (hadPlaintext) {
          this.saveConfig(resolvedConfig);
        }

        return resolvedConfig;
      }
    } catch {
      // Fallback to defaults if config file is corrupt
    }
    return baseDefaults;
  }

  private saveConfig(cfg: AiSystemConfig): void {
    try {
      const dir = dirname(this.configPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const { codexApiKey: _codex, groqApiKey: _groq, ...sanitized } = cfg;
      const toSave: Record<string, unknown> = { ...sanitized };
      if (cfg.codexApiKey) {
        toSave.codexApiKeyEnc = encryptSecret(cfg.codexApiKey);
      }
      if (cfg.groqApiKey) {
        toSave.groqApiKeyEnc = encryptSecret(cfg.groqApiKey);
      }
      writeFileSync(this.configPath, JSON.stringify(toSave, null, 2), "utf-8");
    } catch {
      // Ignore disk persistence errors so runtime config update still succeeds
    }
  }

  private maskKey(key: string): string {
    if (!key) return "";
    return key.length <= 8 ? "****" : `${key.slice(0, 7)}...${key.slice(-4)}`;
  }
}

export const aiConfigService = new AiConfigService();
