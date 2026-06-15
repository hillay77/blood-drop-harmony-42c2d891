import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  blood_group: z.enum(["A", "B", "AB", "O"]),
  rh: z.enum(["positive", "negative"]),
  phenotype_required: z.array(z.string().min(1).max(40)).max(10).default([]),
  message: z.string().min(1).max(320),
  recipients: z.array(z.string().trim().min(5).max(20)).max(50).default([]),
});

export const Route = createFileRoute("/api/public/alerts/broadcast")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return new Response("Invalid body", { status: 400 });
        const { blood_group, rh, phenotype_required, message, recipients } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: donors, error } = await supabaseAdmin
          .from("profiles")
          .select("id, phone, phenotype_tags")
          .eq("donor_opt_in", true).eq("blood_group", blood_group).eq("rh", rh)
          .not("phone", "is", null);
        if (error) return new Response(error.message, { status: 500 });

        const matches = (donors ?? []).filter((d: any) =>
          phenotype_required.length === 0 ||
          phenotype_required.every((p: string) => (d.phenotype_tags ?? []).includes(p))
        );

        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_FROM_NUMBER;
        const twilioReady = !!(sid && token && from);

        const targets: Array<{ donor_id: string | null; phone: string }> = [
          ...matches.map((d: any) => ({ donor_id: d.id as string, phone: d.phone as string })),
          ...recipients.map((p) => ({ donor_id: null, phone: p })),
        ];

        let queued = 0;
        for (const t of targets) {
          let status: "queued" | "sent" | "failed" = "queued";
          let twilio_sid: string | undefined;
          let error_message: string | undefined;
          if (twilioReady && t.phone) {
            try {
              const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${btoa(`${sid}:${token}`)}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ To: t.phone, From: from!, Body: message }).toString(),
              });
              if (!res.ok) { status = "failed"; error_message = await res.text(); }
              else { status = "sent"; const j: any = await res.json().catch(() => ({})); twilio_sid = j?.sid; }
            } catch (e: any) { status = "failed"; error_message = e?.message ?? "send_failed"; }
          }
          await supabaseAdmin.from("match_alerts").insert({
            donor_id: t.donor_id ?? undefined,
            phone: t.phone,
            message: `[${blood_group}${rh === "positive" ? "+" : "-"}${phenotype_required.length ? " · " + phenotype_required.join(",") : ""}] ${message}`,
            status,
            twilio_sid,
            error_message,
          } as any);
          queued++;
        }

        return Response.json({ ok: true, queued, matched: matches.length, direct: recipients.length, twilio_configured: twilioReady });
      },
    },
  },
});
