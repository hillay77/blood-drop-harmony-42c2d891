import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ambulance } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/dispatch")({
  head: () => ({ meta: [{ title: "Emergency Dispatch · Nakandulo" }] }),
  component: DispatchPage,
});

function DispatchPage() {
  const qc = useQueryClient();

  const { data: dispatches } = useQuery({
    queryKey: ["dispatches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dispatches")
        .select("id, status, distance_km, eta_minutes, created_at, dispatched_at, delivered_at, hub:hubs(name, region), request:blood_requests(blood_group, rh, units_needed, urgency, hospital:hospitals(name, region))")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: openRequests } = useQuery({
    queryKey: ["open-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blood_requests")
        .select("id, blood_group, rh, units_needed, urgency, hospital:hospitals(name)")
        .in("status", ["pending", "matched"])
        .order("urgency", { ascending: false });
      return data ?? [];
    },
  });

  const { data: hubs } = useQuery({
    queryKey: ["hubs-list"],
    queryFn: async () => {
      const { data } = await supabase.from("hubs").select("id, name, region");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const request_id = String(form.get("request_id"));
      const hub_id = String(form.get("hub_id"));
      if (!request_id || !hub_id) throw new Error("Pick a request and a hub");
      const { error } = await supabase.from("dispatches").insert({
        request_id, hub_id, unit_ids: [], status: "pending",
        eta_minutes: Number(form.get("eta_minutes") || 30),
      });
      if (error) throw error;
      await supabase.from("blood_requests").update({ status: "matched" }).eq("id", request_id);
    },
    onSuccess: () => { toast.success("Dispatch created"); qc.invalidateQueries({ queryKey: ["dispatches"] }); qc.invalidateQueries({ queryKey: ["open-requests"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const advance = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === "in_transit") patch.dispatched_at = new Date().toISOString();
      if (status === "delivered") patch.delivered_at = new Date().toISOString();
      const { error } = await supabase.from("dispatches").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dispatches"] }),
  });

  const statusVariant = (s: string) => s === "delivered" ? "default" : s === "in_transit" ? "secondary" : s === "cancelled" ? "destructive" : "outline";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Emergency dispatch</h1>
        <p className="text-muted-foreground text-sm mt-1">Route blood units from hubs to hospitals.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>New dispatch</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1"><Label>Request</Label>
              <Select name="request_id"><SelectTrigger><SelectValue placeholder="Select request" /></SelectTrigger>
                <SelectContent>{(openRequests ?? []).map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.hospital?.name} · {r.blood_group}{r.rh === "positive" ? "+" : "-"} ×{r.units_needed} ({r.urgency})</SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Source hub</Label>
              <Select name="hub_id"><SelectTrigger><SelectValue placeholder="Select hub" /></SelectTrigger>
                <SelectContent>{(hubs ?? []).map((h: any) => <SelectItem key={h.id} value={h.id}>{h.name} · {h.region}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>ETA (minutes)</Label><Input name="eta_minutes" type="number" min={1} defaultValue={30} required /></div>
            <div className="flex items-end"><Button type="submit" disabled={create.isPending} className="w-full"><Ambulance className="h-4 w-4 mr-2" />Dispatch</Button></div>
          </form>
        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle>Active & recent dispatches</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Hospital</TableHead><TableHead>Hub</TableHead><TableHead>Blood</TableHead>
              <TableHead>ETA</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(dispatches ?? []).map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>{d.request?.hospital?.name}<div className="text-xs text-muted-foreground">{d.request?.hospital?.region}</div></TableCell>
                  <TableCell>{d.hub?.name}</TableCell>
                  <TableCell className="font-medium">{d.request?.blood_group}{d.request?.rh === "positive" ? "+" : "-"} ×{d.request?.units_needed}</TableCell>
                  <TableCell>{d.eta_minutes ?? "—"} min</TableCell>
                  <TableCell><Badge variant={statusVariant(d.status) as any}>{d.status}</Badge></TableCell>
                  <TableCell className="space-x-2">
                    {d.status === "pending" && <Button size="sm" variant="outline" onClick={() => advance.mutate({ id: d.id, status: "in_transit" })}>Start</Button>}
                    {d.status === "in_transit" && <Button size="sm" onClick={() => advance.mutate({ id: d.id, status: "delivered" })}>Deliver</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {(dispatches ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No dispatches yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
