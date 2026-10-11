
import { NextRequest } from "next/server";

const BACKEND_URL = "http://localhost:8000";

export async function POST(request: NextRequest) {
    const authorization = request.headers.get("authorization");

    if (!authorization?.toLowerCase().startsWith("bearer ")) {
        return new Response("Unauthorized", { status: 401 });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const authCheck = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });

        if (!authCheck.ok) {
            return new Response("Invalid authentication", {
                status: authCheck.status,
            });
        }

        const user = await authCheck.json();

        if (!["owner", "security_head"].includes(user.role)) {
            return new Response("Insufficient permissions", {
                status: 403,
            });
        }

        const cookieParts = [
            `access_token=${token}`,
            "HttpOnly",
            "SameSite=Strict",
            "Path=/api/videos/",
            "Max-Age=300",
        ];

        if (request.nextUrl.protocol === "https:") {
            cookieParts.push("Secure");
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
                "Set-Cookie": cookieParts.join("; "),
            },
        });
    } catch (error) {
        console.error("Uploaded video authentication error:", error);

        return new Response("Unable to authenticate video", {
            status: 502,
        });
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const token = request.cookies.get("access_token")?.value;

    if (!token) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await context.params;

    if (!/^\d+$/.test(id)) {
        return new Response("Invalid video ID", { status: 400 });
    }

    try {
        const upstream = await fetch(
            `${BACKEND_URL}/api/videos/${id}/stream`,
            {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
                signal: request.signal,
            }
        );

        if (!upstream.ok || !upstream.body) {
            const details = await upstream.text();

            return new Response(details || "Video stream request failed", {
                status: upstream.status,
            });
        }

        return new Response(upstream.body, {
            status: upstream.status,
            headers: {
                "Content-Type":
                    upstream.headers.get("content-type") ??
                    "video/mp4",
                "Content-Length":
                    upstream.headers.get("content-length") ?? "",
                "Accept-Ranges":
                    upstream.headers.get("accept-ranges") ?? "none",
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("Uploaded video stream proxy error:", error);

        return new Response("Unable to connect to uploaded video stream", {
            status: 502,
        });
    }
}
