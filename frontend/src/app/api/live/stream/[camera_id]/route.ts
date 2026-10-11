
import { NextRequest } from "next/server";

const BACKEND_URL = "http://localhost:8000";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ camera_id: string }> }
) {
    const token = request.cookies.get("access_token")?.value;

    if (!token) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { camera_id } = await context.params;

    try {
        const upstream = await fetch(
            `${BACKEND_URL}/api/live/stream/${encodeURIComponent(camera_id)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
                signal: request.signal,
            }
        );

        if (!upstream.ok || !upstream.body) {
            const details = await upstream.text();
            return new Response(details || "Stream request failed", {
                status: upstream.status,
            });
        }

        return new Response(upstream.body, {
            status: upstream.status,
            headers: {
                "Content-Type":
                    upstream.headers.get("content-type") ??
                    "multipart/x-mixed-replace; boundary=frame",
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("Video stream proxy error:", error);
        return new Response("Unable to connect to video stream", {
            status: 502,
        });
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ camera_id: string }> }
) {
    const authorization = request.headers.get("authorization");

    if (!authorization?.toLowerCase().startsWith("bearer ")) {
        return new Response("Unauthorized", { status: 401 });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { camera_id } = await context.params;

    try {
        // Validate the token and ensure the user has an active account.
        const authCheck = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
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

        const response = new Response(
            JSON.stringify({ success: true }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store",
                    "Set-Cookie": [
                        `access_token=${token}`,
                        `HttpOnly`,
                        `SameSite=Strict`,
                        `Path=/api/live/stream/${encodeURIComponent(camera_id)}`,
                        `Max-Age=300`,
                        ...(request.nextUrl.protocol === "https:"
                            ? ["Secure"]
                            : []),
                    ].join("; "),
                },
            }
        );

        return response;
    } catch (error) {
        console.error("Stream authentication error:", error);

        return new Response("Unable to authenticate video stream", {
            status: 502,
        });
    }
}
