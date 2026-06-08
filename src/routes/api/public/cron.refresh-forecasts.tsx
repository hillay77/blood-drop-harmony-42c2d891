import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/refresh-forecasts")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Load all hubs
        const { data: hubs, error: hubErr } = await supabaseAdmin.from("hubs").select("id");
        if (hubErr) return new Response(hubErr.message, { status: 500 });

        const groups = ["A", "B", "AB", "O"] as const;
        const rhs = ["positive", "negative"] as const;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000).toISOString();

        let written = 0;
        for (const hub of hubs ?? []) {
          for (const g of groups) {
            for (const rh of rhs) {
              const { count: currentUnits } = await supabaseAdmin
                .from("blood_units")
                .select("id", { count: "exact", head: true })
                .eq("hub_id", hub.id).eq("blood_group", g).eq("rh", rh).eq("status", "available");

              const { data: snaps } = await supabaseAdmin
                .from("inventory_snapshots")
                .select("snapshot_date, units_available")
                .eq("hub_id", hub.id).eq("blood_group", g).eq("rh", rh)
                .gte("snapshot_date", thirtyDaysAgo.split("T")[0])
                .order("snapshot_date", { ascending: true });

              // Simple linear regression slope (negative = depletion)
              const xs = (snaps ?? []).map((_, i) => i);
              const ys = (snaps ?? []).map((s: any) => Number(s.units_available));
              const n = xs.length;
              let slope = 0;
              if (n > 1) {
                const mx = xs.reduce((a, b) => a + b, 0) / n;
                const my = ys.reduce((a, b) => a + b, 0) / n;
                const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
                const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0) || 1;
                slope = num / den;
              }
              const avgDaily = Math.max(0, -slope);
              const cu = currentUnits ?? 0;
              const days = avgDaily > 0.01 ? cu / avgDaily : 999;
              const risk = days < 3 ? "critical" : days < 7 ? "high" : days < 14 ? "medium" : "low";

              await supabaseAdmin.from("shortage_forecasts").insert({
                hub_id: hub.id, blood_group: g, rh,
                current_units: cu,
                avg_daily_consumption: Number(avgDaily.toFixed(3)),
                projected_days_remaining: Number(Math.min(days, 999).toFixed(2)),
                shortage_risk: risk,
              });
              written++;
            }
          }
        }
        return Response.json({ ok: true, written });
      },
    },
  },
});
