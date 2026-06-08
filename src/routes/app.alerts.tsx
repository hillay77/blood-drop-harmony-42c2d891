import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Radio } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/alerts")({
  head: () => ({ meta: [{ title: "SMS Alerts · Nakandulo" }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const qc = useQueryClient();
  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("match_alerts")
        .select("id, phenotype_required, blood_group, rh, status, message, sent_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const broadcast = useMutation({
    mutationFn: async (form: FormData) => {
      const payload = {
        blood_group: form.get("blood_group"),
        rh: form.get("rh"),
        phenotype_required: String(form.get("phenotype") || "").split(",").map((s) => s.trim()).filter(Boolean),
        message: String(form.get("message")),
      };
      const r = await fetch("/api/public/alerts/broadcast", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (res: any) => { toast.success(`Queued ${res?.queued ?? 0} alert(s)`); qc.invalidateQueries({ queryKey: ["alerts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const statusVariant = (s: string) => s === "sent" || s === "delivered" ? "default" : s === "failed" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Rare-phenotype SMS alerts</h1>
        <p className="text-muted-foreground text-sm mt-1">Broadcast match calls to opted-in donors via Twilio.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>New broadcast</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); broadcast.mutate(new FormData(e.currentTarget)); }} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Blood group</Label><Input name="blood_group" placeholder="O" defaultValue="O" /></div>
            <div className="space-y-2"><Label>Rh</Label><Input name="rh" placeholder="negative" defaultValue="negative" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Phenotype tags (comma)</Label><Input name="phenotype" placeholder="Bombay, Kell-" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Message</Label><Input name="message" placeholder="Urgent match needed at Manila Central Hub" required /></div>
            <div className="sm:col-span-2"><Button type="submit" disabled={broadcast.isPending}><Radio className="h-4 w-4 mr-2" />{broadcast.isPending ? "Broadcasting…" : "Send broadcast"}</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent alerts</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Phenotype</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(alerts ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.blood_group}{a.rh === "positive" ? "+" : "-"}</TableCell>
                  <TableCell className="text-sm">{(a.phenotype_required ?? []).join(", ") || "—"}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{a.message}</TableCell>
                  <TableCell><Badge variant={statusVariant(a.status) as any}>{a.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(a.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {(alerts ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No alerts yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
