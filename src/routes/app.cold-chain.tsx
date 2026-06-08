import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceArea, CartesianGrid } from "recharts";

export const Route = createFileRoute("/app/cold-chain")({
  head: () => ({ meta: [{ title: "Cold Chain · Nakandulo" }] }),
  component: ColdChainPage,
});

function ColdChainPage() {
  const { data } = useQuery({
    queryKey: ["cold-chain"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cold_chain_readings")
        .select("id, hub_id, storage_unit, temp_c, recorded_at, is_alert, hub:hubs(name)")
        .order("recorded_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const series = (() => {
    const map = new Map<string, { name: string; readings: any[] }>();
    (data ?? []).slice().reverse().forEach((r: any) => {
      const key = `${r.hub?.name ?? "Hub"} · ${r.storage_unit}`;
      if (!map.has(key)) map.set(key, { name: key, readings: [] });
      map.get(key)!.readings.push({ t: new Date(r.recorded_at).toLocaleString(), temp: Number(r.temp_c) });
    });
    return Array.from(map.values()).slice(0, 4);
  })();

  const alerts = (data ?? []).filter((r: any) => r.is_alert).slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Cold-chain monitoring</h1>
        <p className="text-muted-foreground text-sm mt-1">Safe range: 2°C – 6°C. Alerts trigger outside this band.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {series.map((s) => (
          <Card key={s.name}>
            <CardHeader><CardTitle className="text-base">{s.name}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={s.readings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="t" stroke="var(--color-muted-foreground)" fontSize={10} hide />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={11} domain={[0, 10]} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <ReferenceArea y1={2} y2={6} fill="var(--color-success)" fillOpacity={0.08} />
                    <Line type="monotone" dataKey="temp" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent alerts</CardTitle></CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active alerts.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{a.hub?.name} · {a.storage_unit}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.recorded_at).toLocaleString()}</div>
                  </div>
                  <Badge variant="destructive">{a.temp_c}°C</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
