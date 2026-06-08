import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Droplets, AlertTriangle, Snowflake, Ambulance, Building2, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "National Dashboard · Nakandulo" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [units, requests, forecasts, alerts, hubs, hospitals, dispatches] = await Promise.all([
        supabase.from("blood_units").select("blood_group, rh, status, hub_id"),
        supabase.from("blood_requests").select("id, status, hospital:hospitals(region)"),
        supabase.from("shortage_forecasts").select("id, shortage_risk").in("shortage_risk", ["high", "critical"]),
        supabase.from("cold_chain_readings").select("id", { count: "exact", head: true }).eq("is_alert", true),
        supabase.from("hubs").select("id, name, region, capacity_units"),
        supabase.from("hospitals").select("id, region"),
        supabase.from("dispatches").select("id, status, hub_id"),
      ]);

      const allUnits = units.data ?? [];
      const available = allUnits.filter((u: any) => u.status === "available");
      const byGroup: Record<string, number> = {};
      available.forEach((u: any) => {
        const k = `${u.blood_group}${u.rh === "positive" ? "+" : "-"}`;
        byGroup[k] = (byGroup[k] ?? 0) + 1;
      });

      const hubsList = hubs.data ?? [];
      const hubStock = new Map<string, number>();
      available.forEach((u: any) => hubStock.set(u.hub_id, (hubStock.get(u.hub_id) ?? 0) + 1));
      const hubDispatchCount = new Map<string, number>();
      (dispatches.data ?? []).forEach((d: any) => hubDispatchCount.set(d.hub_id, (hubDispatchCount.get(d.hub_id) ?? 0) + 1));

      const hubReports = hubsList.map((h: any) => ({
        id: h.id, name: h.name, region: h.region,
        available: hubStock.get(h.id) ?? 0,
        capacity: h.capacity_units,
        utilization: h.capacity_units ? Math.round(((hubStock.get(h.id) ?? 0) / h.capacity_units) * 100) : 0,
        dispatches: hubDispatchCount.get(h.id) ?? 0,
      })).sort((a, b) => b.available - a.available);

      const regionAgg = new Map<string, { region: string; hubs: number; hospitals: number; units: number; requests: number }>();
      const ensure = (r: string) => { if (!regionAgg.has(r)) regionAgg.set(r, { region: r, hubs: 0, hospitals: 0, units: 0, requests: 0 }); return regionAgg.get(r)!; };
      hubsList.forEach((h: any) => { const a = ensure(h.region); a.hubs += 1; a.units += hubStock.get(h.id) ?? 0; });
      (hospitals.data ?? []).forEach((h: any) => { ensure(h.region).hospitals += 1; });
      (requests.data ?? []).forEach((r: any) => { ensure(r.hospital?.region ?? "Unknown").requests += 1; });
      const regionReports = Array.from(regionAgg.values()).sort((a, b) => b.units - a.units);

      const openRequests = (requests.data ?? []).filter((r: any) => r.status === "pending" || r.status === "matched").length;

      return {
        availableUnits: available.length,
        totalUnits: allUnits.length,
        openRequests,
        atRiskForecasts: (forecasts.data ?? []).length,
        coldChainAlerts: alerts.count ?? 0,
        hubCount: hubsList.length,
        hospitalCount: (hospitals.data ?? []).length,
        regionCount: regionAgg.size,
        byGroup: Object.entries(byGroup).map(([name, value]) => ({ name, value })),
        hubReports,
        regionReports,
      };
    },
  });

  const kpis = [
    { label: "Available Units", value: stats?.availableUnits ?? "—", icon: Droplets, tone: "text-primary" },
    { label: "Open Requests", value: stats?.openRequests ?? "—", icon: Ambulance, tone: "text-accent" },
    { label: "At-Risk Forecasts", value: stats?.atRiskForecasts ?? "—", icon: AlertTriangle, tone: "text-destructive" },
    { label: "Cold-Chain Alerts", value: stats?.coldChainAlerts ?? "—", icon: Snowflake, tone: "text-warning" },
    { label: "Regional Hubs", value: stats?.hubCount ?? "—", icon: Building2, tone: "text-primary" },
    { label: "Hospitals", value: stats?.hospitalCount ?? "—", icon: MapPin, tone: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">National operations overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Live snapshot of Uganda's blood supply network.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
        <CardHeader><CardTitle>National stock by blood group</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>National report — Regional rollup</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Region</TableHead><TableHead>Hubs</TableHead><TableHead>Hospitals</TableHead><TableHead>Stock</TableHead><TableHead>Requests</TableHead></TableRow></TableHeader>
              <TableBody>
                {(stats?.regionReports ?? []).map((r) => (
                  <TableRow key={r.region}>
                    <TableCell className="font-medium">{r.region}</TableCell>
                    <TableCell>{r.hubs}</TableCell>
                    <TableCell>{r.hospitals}</TableCell>
                    <TableCell className="font-medium text-primary">{r.units}</TableCell>
                    <TableCell>{r.requests}</TableCell>
                  </TableRow>
                ))}
                {(stats?.regionReports ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Regional hub report</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Hub</TableHead><TableHead>Region</TableHead><TableHead>Stock</TableHead><TableHead>Capacity</TableHead><TableHead>Util.</TableHead><TableHead>Disp.</TableHead></TableRow></TableHeader>
              <TableBody>
                {(stats?.hubReports ?? []).map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell className="text-muted-foreground">{h.region}</TableCell>
                    <TableCell className="font-medium text-primary">{h.available}</TableCell>
                    <TableCell>{h.capacity}</TableCell>
                    <TableCell>{h.utilization}%</TableCell>
                    <TableCell>{h.dispatches}</TableCell>
                  </TableRow>
                ))}
                {(stats?.hubReports ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hubs yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
