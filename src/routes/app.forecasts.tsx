import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/forecasts")({
  head: () => ({ meta: [{ title: "Forecasts · Nakandulo" }] }),
  component: ForecastsPage,
});

function ForecastsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["forecasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shortage_forecasts")
        .select("id, blood_group, rh, current_units, avg_daily_consumption, projected_days_remaining, shortage_risk, computed_at, hub:hubs(name)")
        .order("projected_days_remaining", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/public/cron/refresh-forecasts", { method: "POST" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast.success("Forecasts refreshed"); qc.invalidateQueries({ queryKey: ["forecasts"] }); },
    onError: () => toast.error("Refresh failed"),
  });

  const riskVariant = (r: string) =>
    r === "critical" ? "destructive" : r === "high" ? "destructive" : r === "medium" ? "secondary" : "outline";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Shortage forecasts</h1>
          <p className="text-muted-foreground text-sm mt-1">Linear regression over 30-day consumption per hub × blood group.</p>
        </div>
        <Button onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refresh.isPending ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Per hub × blood group</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hub</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Avg / day</TableHead>
                <TableHead>Days left</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell>{f.hub?.name ?? "—"}</TableCell>
                  <TableCell className="font-medium">{f.blood_group}{f.rh === "positive" ? "+" : "-"}</TableCell>
                  <TableCell>{f.current_units}</TableCell>
                  <TableCell>{Number(f.avg_daily_consumption).toFixed(2)}</TableCell>
                  <TableCell>{Number(f.projected_days_remaining).toFixed(1)}</TableCell>
                  <TableCell><Badge variant={riskVariant(f.shortage_risk) as any}>{f.shortage_risk}</Badge></TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No forecasts yet. Click Refresh.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
