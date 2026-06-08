import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, AlertTriangle, Snowflake, Ambulance } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard · Nakandulo" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [units, requests, forecasts, alerts] = await Promise.all([
        supabase.from("blood_units").select("id, blood_group, rh, status", { count: "exact" }).eq("status", "available"),
        supabase.from("blood_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "matched"]),
        supabase.from("shortage_forecasts").select("id, blood_group, rh, projected_days_remaining, shortage_risk").in("shortage_risk", ["high", "critical"]),
        supabase.from("cold_chain_readings").select("id", { count: "exact", head: true }).eq("is_alert", true),
      ]);
      const byGroup: Record<string, number> = {};
      (units.data ?? []).forEach((u) => {
        const k = `${u.blood_group}${u.rh === "positive" ? "+" : "-"}`;
        byGroup[k] = (byGroup[k] ?? 0) + 1;
      });
      return {
        availableUnits: units.count ?? (units.data ?? []).length,
        openRequests: requests.count ?? 0,
        atRiskForecasts: (forecasts.data ?? []).length,
        coldChainAlerts: alerts.count ?? 0,
        byGroup: Object.entries(byGroup).map(([name, value]) => ({ name, value })),
      };
    },
  });

  const kpis = [
    { label: "Available Units", value: stats?.availableUnits ?? "—", icon: Droplets, tone: "text-primary" },
    { label: "Open Requests", value: stats?.openRequests ?? "—", icon: Ambulance, tone: "text-accent" },
    { label: "At-Risk Forecasts", value: stats?.atRiskForecasts ?? "—", icon: AlertTriangle, tone: "text-destructive" },
    { label: "Cold-Chain Alerts", value: stats?.coldChainAlerts ?? "—", icon: Snowflake, tone: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Operations overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Live snapshot across all hubs and hospitals.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${tone}`} />
            </CardHeader>
            <CardContent><div className="text-3xl font-display font-bold">{value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Available units by blood group</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.byGroup ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
