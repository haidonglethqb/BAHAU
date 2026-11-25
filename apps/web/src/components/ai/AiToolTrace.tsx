"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Loader2,
} from "lucide-react";
import type { AgentToolTraceItem } from "./ai-stream-client";

interface AiToolTraceProps {
  traces: AgentToolTraceItem[];
  defaultExpanded?: boolean;
}

export function AiToolTrace({ traces, defaultExpanded = false }: AiToolTraceProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openDetailIds, setOpenDetailIds] = useState<Record<string, boolean>>({});

  if (!traces || traces.length === 0) return null;

  const hasRunning = traces.some((t) => t.status === "running");
  const hasError = traces.some((t) => t.status === "error");
  const doneCount = traces.filter((t) => t.status === "done").length;

  const toggleItem = (id: string) => {
    setOpenDetailIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mb-2.5 rounded-xl border border-slate-200/80 bg-white/80 text-xs overflow-hidden shadow-2xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasRunning ? (
            <Loader2 size={14} className="text-blue-600 animate-spin shrink-0" />
          ) : hasError ? (
            <AlertCircle size={14} className="text-rose-600 shrink-0" />
          ) : (
            <Cpu size={14} className="text-emerald-600 shrink-0" />
          )}
          <span className="font-semibold text-slate-700 truncate">
            {hasRunning
              ? `Agent đang thực thi công cụ (${doneCount}/${traces.length})...`
              : `Đã truy xuất ${traces.length} bước dữ liệu nghiệp vụ`}
          </span>
        </div>
        <span className="text-slate-400 shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {(expanded || hasRunning) && (
        <div className="border-t border-slate-100 divide-y divide-slate-100 px-3 py-1.5 bg-slate-50/50">
          {traces.map((trace) => {
            const hasPayload = Boolean(trace.input || trace.output);
            const isItemOpen = Boolean(openDetailIds[trace.id]);

            return (
              <div key={trace.id} className="py-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    {trace.status === "running" ? (
                      <Loader2
                        size={13}
                        className="mt-0.5 text-blue-600 animate-spin shrink-0"
                      />
                    ) : trace.status === "error" ? (
                      <AlertCircle
                        size={13}
                        className="mt-0.5 text-rose-600 shrink-0"
                      />
                    ) : (
                      <CheckCircle2
                        size={13}
                        className="mt-0.5 text-emerald-600 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-800">
                          {trace.label || trace.tool}
                        </span>
                        <code className="rounded bg-slate-200/70 px-1 py-0.2 font-mono text-[10px] text-slate-600">
                          {trace.tool}
                        </code>
                      </div>
                      {trace.summary && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {trace.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {typeof trace.durationMs === "number" && (
                      <span className="font-mono text-[10px] text-slate-400">
                        {trace.durationMs}ms
                      </span>
                    )}
                    {hasPayload && (
                      <button
                        type="button"
                        onClick={() => toggleItem(trace.id)}
                        className="text-[10px] font-semibold text-blue-700 hover:underline cursor-pointer"
                      >
                        {isItemOpen ? "Ẩn" : "Chi tiết"}
                      </button>
                    )}
                  </div>
                </div>

                {hasPayload && isItemOpen && (
                  <div className="mt-1.5 ml-5 rounded-lg bg-slate-900 p-2 text-[10px] font-mono text-slate-200 overflow-x-auto space-y-1">
                    {trace.input && (
                      <div>
                        <span className="text-sky-400">input: </span>
                        <span>{JSON.stringify(trace.input)}</span>
                      </div>
                    )}
                    {trace.output && (
                      <div>
                        <span className="text-emerald-400">output: </span>
                        <span>{JSON.stringify(trace.output)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
