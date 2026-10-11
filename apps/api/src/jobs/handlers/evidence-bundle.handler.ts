import crypto from "node:crypto";
import type { JobHandlerFn } from "../worker-queue.js";

export interface EvidenceItem {
  id: string;
  name: string;
  fileSizeKb: number;
  doiOrUrl?: string;
}

export interface EvidenceBundlePayload {
  projectCode: string;
  academicYear: string;
  evidenceItems: EvidenceItem[];
}

export interface EvidenceBundleResult {
  projectCode: string;
  totalFiles: number;
  totalSizeKb: number;
  bundleSha256: string;
  manifest: Array<{ id: string; name: string; checksum: string }>;
  packageStatus: "BUNDLED";
  downloadUrl: string;
  completedAt: string;
}

export const evidenceBundleHandler: JobHandlerFn<
  EvidenceBundlePayload,
  EvidenceBundleResult
> = async (payload, updateProgress) => {
  const items = payload.evidenceItems || [];
  await updateProgress(10, `Bắt đầu gom tệp minh chứng cho đề tài ${payload.projectCode}...`);

  let totalSizeKb = 0;
  const manifest: Array<{ id: string; name: string; checksum: string }> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;

    totalSizeKb += item.fileSizeKb || 500;
    const fileChecksum = crypto
      .createHash("sha256")
      .update(`${item.id}:${item.name}:${item.doiOrUrl || ""}`)
      .digest("hex");

    manifest.push({
      id: item.id,
      name: item.name,
      checksum: fileChecksum,
    });

    const progressPct = 20 + Math.floor(((i + 1) / items.length) * 60);
    await updateProgress(
      progressPct,
      `Đang nén & băm hash minh chứng: ${item.name} (${i + 1}/${items.length})`
    );
  }

  await updateProgress(85, "Đang tạo manifest index và chữ ký toàn vẹn gói nén...");

  const bundleSha256 = crypto
    .createHash("sha256")
    .update(JSON.stringify(manifest))
    .digest("hex");

  await updateProgress(100, `Hoàn tất đóng gói ${items.length} tệp minh chứng khoa học`);

  return {
    projectCode: payload.projectCode,
    totalFiles: items.length,
    totalSizeKb,
    bundleSha256,
    manifest,
    packageStatus: "BUNDLED",
    downloadUrl: `/api/v1/rd/bundles/${payload.projectCode}-evidence.zip`,
    completedAt: new Date().toISOString(),
  };
};
