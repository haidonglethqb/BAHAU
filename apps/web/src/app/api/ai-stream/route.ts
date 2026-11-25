import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiUrl = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:4000"
  ).replace(/\/+$/, "");

  const targetUrl = `${apiUrl}/api/v1/ai/chat/stream`;

  const forwardHeaders: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") || "application/json",
    Accept: "text/event-stream",
  };

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    forwardHeaders["Authorization"] = authHeader;
  }

  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    forwardHeaders["Cookie"] = cookieHeader;
  }

  try {
    const bodyText = await req.text();

    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: bodyText,
      cache: "no-store",
    });

    const contentType =
      upstream.headers.get("content-type") || "text/event-stream; charset=utf-8";

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Không thể kết nối máy chủ API cho luồng AI streaming.";
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "AI_STREAM_PROXY_ERROR",
          message,
        },
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "private, no-store",
        },
      }
    );
  }
}
