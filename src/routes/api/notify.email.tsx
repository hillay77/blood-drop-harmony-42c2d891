import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  to: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
});

function b64url(s: string) {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const Route = createFileRoute("/api/notify/email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
        const { to, subject, message } = parsed.data;

        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const GMAIL_KEY = process.env.GOOGLE_MAIL_API_KEY;
        if (!LOVABLE_API_KEY || !GMAIL_KEY) {
          return new Response(JSON.stringify({ error: "Gmail connector not configured" }), { status: 500 });
        }

        const raw = b64url(
          [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset="UTF-8"', "", message].join("\r\n")
        );

        const res = await fetch(
          "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": GMAIL_KEY,
            },
            body: JSON.stringify({ raw }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return new Response(JSON.stringify({ error: data }), { status: res.status });
        return Response.json({ ok: true, id: (data as any)?.id });
      },
    },
  },
});
