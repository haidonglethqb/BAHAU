import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AppError } from "../../middlewares/error.middleware.js";
import { AiConfigService, aiConfigService } from "./ai-config.service.js";

function getVietnamDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export class AiQuotaService {
  private readonly dailyCounters = new Map<string, number>();
  private readonly filePath: string;

  constructor(
    private readonly configService: AiConfigService,
    filePath?: string
  ) {
    this.filePath = filePath ?? join(process.cwd(), ".data", "ai-quota.json");
    this.loadFromDisk();
  }

  reserve(userId: string): { used: number; limit: number | null } {
    const dayKey = getVietnamDateKey();
    const bucketKey = `${userId}:${dayKey}`;
    const limit = this.configService.getUserDailyLimit(userId);
    const current = this.dailyCounters.get(bucketKey) ?? 0;

    if (limit !== null && current >= limit) {
      throw new AppError(
        429,
        "AI_QUOTA_EXCEEDED",
        `Bạn đã đạt giới hạn ${limit} lượt hỏi AI hôm nay. Vui lòng thử lại vào ngày mai.`
      );
    }

    const next = current + 1;
    this.dailyCounters.set(bucketKey, next);
    this.saveToDisk();
    return { used: next, limit };
  }

  getUsage(userId: string): { used: number; limit: number | null } {
    const dayKey = getVietnamDateKey();
    const bucketKey = `${userId}:${dayKey}`;
    return {
      used: this.dailyCounters.get(bucketKey) ?? 0,
      limit: this.configService.getUserDailyLimit(userId),
    };
  }

  private loadFromDisk(): void {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const today = getVietnamDateKey();
        let hadOldEntries = false;
        if (parsed && typeof parsed === "object") {
          for (const [key, val] of Object.entries(parsed)) {
            if (typeof val === "number" && Number.isFinite(val) && val >= 0) {
              if (key.endsWith(`:${today}`)) {
                this.dailyCounters.set(key, Math.floor(val));
              } else {
                hadOldEntries = true;
              }
            }
          }
        }
        if (hadOldEntries) {
          this.saveToDisk();
        }
      }
    } catch {
      // Ignore load errors
    }
  }

  private saveToDisk(): void {
    try {
      const today = getVietnamDateKey();
      for (const key of this.dailyCounters.keys()) {
        if (!key.endsWith(`:${today}`)) {
          this.dailyCounters.delete(key);
        }
      }
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const data: Record<string, number> = {};
      for (const [k, v] of this.dailyCounters.entries()) {
        data[k] = v;
      }
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch {
      // Ignore persistence errors
    }
  }
}

export const aiQuotaService = new AiQuotaService(aiConfigService);
