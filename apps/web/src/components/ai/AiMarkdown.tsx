"use client";

import React, { useMemo } from "react";

interface AiMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Tokenizes inline markdown: **bold**, *italic*, `code`, and [label](url).
 * Safe JSX rendering without dangerouslySetInnerHTML.
 */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  // Regex matches:
  // 1. Code: `...`
  // 2. Bold: **...**
  // 3. Italic: *...*
  // 4. Link: [...](...)
  const inlineRegex = /(`([^`]+)`)|(\*\*((?:[^*]|\*(?!\*))+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\))/;

  while (remaining.length > 0) {
    const match = remaining.match(inlineRegex);
    if (!match || match.index === undefined) {
      nodes.push(remaining);
      break;
    }

    // Push text before the match
    if (match.index > 0) {
      nodes.push(remaining.slice(0, match.index));
    }

    const matchedStr = match[0];

    if (match[1]) {
      // Inline code
      nodes.push(
        <code
          key={`code-${keyIndex++}`}
          className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[11px] text-slate-800"
        >
          {match[2]}
        </code>
      );
    } else if (match[3]) {
      // Bold
      nodes.push(
        <strong key={`bold-${keyIndex++}`} className="font-bold text-slate-900">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      // Italic
      nodes.push(
        <em key={`italic-${keyIndex++}`} className="italic text-slate-800">
          {match[6]}
        </em>
      );
    } else if (match[7]) {
      // Link
      const label = match[8];
      const href = match[9];
      nodes.push(
        <a
          key={`link-${keyIndex++}`}
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="font-medium text-blue-700 underline hover:text-blue-900"
        >
          {label}
        </a>
      );
    }

    remaining = remaining.slice(match.index + matchedStr.length);
  }

  return nodes;
}

interface TableData {
  headers: string[];
  rows: string[][];
}

function parseTableRows(lines: string[]): TableData | null {
  if (lines.length < 2) return null;

  const parseRow = (line: string) => {
    const trimmed = line.trim();
    const withoutEdges = trimmed.replace(/^\|/, "").replace(/\|$/, "");
    return withoutEdges.split("|").map((cell) => cell.trim());
  };

  const isSeparator = (line: string) => {
    return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(line.trim());
  };

  if (!isSeparator(lines[1])) {
    return null;
  }

  const headers = parseRow(lines[0]);
  const rows: string[][] = [];

  for (let i = 2; i < lines.length; i++) {
    if (lines[i].trim().length === 0) continue;
    rows.push(parseRow(lines[i]));
  }

  return { headers, rows };
}

export function AiMarkdown({ content, className = "" }: AiMarkdownProps) {
  const elements = useMemo(() => {
    if (!content) return null;

    const lines = content.split(/\r?\n/);
    const nodes: React.ReactNode[] = [];
    let i = 0;
    let blockIndex = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 1. Code blocks: ```...```
      if (line.trim().startsWith("```")) {
        const lang = line.trim().slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // skip closing ```

        nodes.push(
          <div
            key={`code-block-${blockIndex++}`}
            className="my-2.5 overflow-hidden rounded-xl border border-slate-300 bg-slate-900 text-slate-100 shadow-xs"
          >
            {lang && (
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 py-1 font-mono text-[10px] text-slate-400">
                <span>{lang}</span>
              </div>
            )}
            <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-slate-100">
              <code>{codeLines.join("\n")}</code>
            </pre>
          </div>
        );
        continue;
      }

      // 2. Markdown Tables: contiguous lines starting and ending with |
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const tableLines: string[] = [];
        while (
          i < lines.length &&
          lines[i].trim().startsWith("|") &&
          lines[i].trim().endsWith("|")
        ) {
          tableLines.push(lines[i]);
          i++;
        }

        const tableData = parseTableRows(tableLines);
        if (tableData) {
          nodes.push(
            <div
              key={`table-${blockIndex++}`}
              className="my-3 overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-2xs"
            >
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100">
                    {tableData.headers.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200 last:border-r-0"
                      >
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tableData.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3 py-2 text-slate-700 border-r border-slate-100 last:border-r-0"
                        >
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        } else {
          // If not a valid table, render the lines as normal paragraphs
          for (const tblLine of tableLines) {
            nodes.push(
              <p key={`p-${blockIndex++}`} className="my-1">
                {renderInline(tblLine)}
              </p>
            );
          }
          continue;
        }
      }

      // 3. Headings: #, ##, ###
      if (line.startsWith("### ")) {
        nodes.push(
          <h4
            key={`h3-${blockIndex++}`}
            className="mt-3 mb-1 text-xs font-bold uppercase tracking-wider text-slate-900"
          >
            {renderInline(line.slice(4))}
          </h4>
        );
        i++;
        continue;
      }
      if (line.startsWith("## ")) {
        nodes.push(
          <h3
            key={`h2-${blockIndex++}`}
            className="mt-3.5 mb-1.5 text-sm font-bold text-slate-950"
          >
            {renderInline(line.slice(3))}
          </h3>
        );
        i++;
        continue;
      }
      if (line.startsWith("# ")) {
        nodes.push(
          <h2
            key={`h1-${blockIndex++}`}
            className="mt-4 mb-2 text-base font-extrabold text-slate-950"
          >
            {renderInline(line.slice(2))}
          </h2>
        );
        i++;
        continue;
      }

      // 4. Bullet lists: - item or * item
      if (/^[-*]\s+/.test(line.trim())) {
        const listItems: string[] = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^[-*]\s+/, ""));
          i++;
        }
        nodes.push(
          <ul
            key={`ul-${blockIndex++}`}
            className="my-2 space-y-1 pl-4 list-disc text-slate-800"
          >
            {listItems.map((item, lIdx) => (
              <li key={lIdx} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // 5. Numbered lists: 1. item
      if (/^\d+\.\s+/.test(line.trim())) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
          i++;
        }
        nodes.push(
          <ol
            key={`ol-${blockIndex++}`}
            className="my-2 space-y-1 pl-4 list-decimal text-slate-800"
          >
            {listItems.map((item, lIdx) => (
              <li key={lIdx} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // 6. Blockquote: > ...
      if (line.startsWith("> ")) {
        nodes.push(
          <blockquote
            key={`quote-${blockIndex++}`}
            className="my-2 border-l-4 border-indigo-400 bg-indigo-50/50 pl-3 py-1 italic text-indigo-950 rounded-r"
          >
            {renderInline(line.slice(2))}
          </blockquote>
        );
        i++;
        continue;
      }

      // 7. Empty line
      if (line.trim().length === 0) {
        i++;
        continue;
      }

      // 8. Regular paragraph line
      nodes.push(
        <p key={`p-${blockIndex++}`} className="my-1.5 leading-relaxed text-slate-800">
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return nodes;
  }, [content]);

  return <div className={`space-y-0.5 text-xs sm:text-sm ${className}`}>{elements}</div>;
}
