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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/app/requests")({
  head: () => ({ meta: [{ title: "Requests · Nakandulo" }] }),
  component: RequestsPage,
});

function RequestsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: requests } = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_requests")
        .select("id, blood_group, rh, units_needed, urgency, status, patient_reference, created_at, hospital:hospitals(name, city)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: hospitals } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => {
      const { data } = await supabase.from("hospitals").select("id, name");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("blood_requests").insert({
        hospital_id: String(form.get("hospital_id")),
        blood_group: form.get("blood_group") as any,
        rh: form.get("rh") as any,
        units_needed: Number(form.get("units_needed")),
        urgency: form.get("urgency") as any,
        patient_reference: String(form.get("patient_reference") || ""),
        notes: String(form.get("notes") || ""),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Request submitted"); setOpen(false); qc.invalidateQueries({ queryKey: ["requests"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const urgencyVariant = (u: string) => u === "critical" ? "destructive" : u === "urgent" ? "default" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-display text-2xl font-bold">Blood requests</h1>
          <p className="text-muted-foreground text-sm mt-1">Hospital requests with FEFO matching.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New request</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit a blood request</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Hospital</Label>
                <Select name="hospital_id" required>
                  <SelectTrigger><SelectValue placeholder="Select hospital" /></SelectTrigger>
                  <SelectContent>{(hospitals ?? []).map((h: any) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Blood group</Label>
                  <Select name="blood_group" defaultValue="O" required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["A","B","AB","O"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rh</Label>
                  <Select name="rh" defaultValue="positive" required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="positive">Positive</SelectItem><SelectItem value="negative">Negative</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Units needed</Label><Input type="number" name="units_needed" min={1} defaultValue={1} required /></div>
                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select name="urgency" defaultValue="urgent" required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="routine">Routine</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Patient reference</Label><Input name="patient_reference" /></div>
              <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Submitting…" : "Submit request"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hospital</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(requests ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.hospital?.name}<div className="text-xs text-muted-foreground">{r.hospital?.city}</div></TableCell>
                  <TableCell className="font-medium">{r.blood_group}{r.rh === "positive" ? "+" : "-"}</TableCell>
                  <TableCell>{r.units_needed}</TableCell>
                  <TableCell><Badge variant={urgencyVariant(r.urgency) as any}>{r.urgency}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(r.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {(requests ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No requests yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
