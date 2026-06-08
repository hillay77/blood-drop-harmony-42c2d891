import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  blood_group: z.enum(["A", "B", "AB", "O"]),
  rh: z.enum(["positive", "negative"]),
  phenotype_required: z.array(z.string().min(1).max(40)).max(10).default([]),
  message: z.string().min(1).max(320),
});

export const Route = createFileRoute("/api/public/alerts/broadcast")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return new Response("Invalid body", { status: 400 });
        const { blood_group, rh, phenotype_required, message } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find matching opted-in donors
        let q = supabaseAdmin.from("profiles").select("id, phone, phenotype_tags")
          .eq("donor_opt_in", true).eq("blood_group", blood_group).eq("rh", rh)
          .not("phone", "is", null);
        const { data: donors, error } = await q;
        if (error) return new Response(error.message, { status: 500 });

        const matches = (donors ?? []).filter((d: any) =>
          phenotype_required.length === 0 ||
          phenotype_required.every((p) => (d.phenotype_tags ?? []).includes(p))
        );

        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_FROM_NUMBER;
        const twilioReady = !!(sid && token && from);

        let queued = 0;
        for (const d of matches) {
          let status: "queued" | "sent" | "failed" = "queued";
          let error_msg: string | null = null;
          if (twilioReady && d.phone) {
            try {
              const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${btoa(`${sid}:${token}`)}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ To: d.phone, From: from!, Body: message }).toString(),
              });
              if (!res.ok) { status = "failed"; error_msg = await res.text(); }
              else status = "sent";
            } catch (e: any) { status = "failed"; error_msg = e?.message ?? "send_failed"; }
          }
          await supabaseAdmin.from("match_alerts").insert({
            recipient_profile_id: d.id, blood_group, rh,
            phenotype_required, message, status,
            sent_at: status === "sent" ? new Date().toISOString() : null,
            error_message: error_msg,
          });
          queued++;
        }

        return Response.json({ ok: true, queued, twilio_configured: twilioReady });
      },
    },
  },
});
