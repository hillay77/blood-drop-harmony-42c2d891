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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/app/requests")({
  head: () => ({ meta: [{ title: "Hospital Requests · Nakandulo" }] }),
  component: RequestsPage,
});

const URGENCIES = ["routine", "urgent", "critical"];
const STATUSES = ["pending", "matched", "fulfilled", "cancelled"];

function RequestsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);

  const { data: requests } = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_requests")
        .select("id, hospital_id, blood_group, rh, units_needed, urgency, status, patient_reference, notes, created_at, hospital:hospitals(name, region)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function upsertHospitalByName(name: string, region: string): Promise<string> {
    const trimmed = name.trim();
    const { data: found } = await supabase.from("hospitals").select("id").ilike("name", trimmed).limit(1).maybeSingle();
    if (found?.id) return found.id;
    const { data: created, error } = await supabase.from("hospitals").insert({
      name: trimmed, region: region.trim() || "Central", lat: 0.3163, lng: 32.5822,
    }).select("id").single();
    if (error) throw error;
    return created.id;
  }

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const id = form.get("id") as string;
      const hospital_name = String(form.get("hospital_name") || "").trim();
      const region = String(form.get("region") || "Central");
      if (!hospital_name) throw new Error("Hospital name is required");
      const hospital_id = await upsertHospitalByName(hospital_name, region);
      const bg = String(form.get("blood_group") || "").toUpperCase().trim();
      if (!["A", "B", "AB", "O"].includes(bg)) throw new Error("Blood group must be A, B, AB, or O");
      const payload: any = {
        hospital_id,
        blood_group: bg,
        rh: String(form.get("rh")),
        units_needed: Number(form.get("units_needed")),
        urgency: String(form.get("urgency")),
        patient_reference: String(form.get("patient_reference") || ""),
        notes: String(form.get("notes") || ""),
      };
      if (id) {
        payload.status = String(form.get("status"));
        const { error } = await supabase.from("blood_requests").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user) throw new Error("You must be signed in to create a request");
        payload.requester_id = u.user.id;
        const { error } = await supabase.from("blood_requests").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setEdit(null); qc.invalidateQueries({ queryKey: ["requests"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("blood_requests").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["requests"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const urgencyVariant = (u: string) => u === "critical" ? "destructive" : u === "urgent" ? "default" : "secondary";
  const openEdit = (r: any) => { setEdit({ ...r, hospital_name: r.hospital?.name ?? "", region: r.hospital?.region ?? "Central" }); setOpen(true); };
  const openNew = () => { setEdit(null); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-display text-2xl font-bold">Hospital blood requests</h1>
          <p className="text-muted-foreground text-sm mt-1">Type hospital and blood group directly. New hospitals are added on the fly.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New request</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit?.id ? "Edit request" : "Submit a blood request"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
              {edit?.id && <input type="hidden" name="id" value={edit.id} />}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2"><Label>Hospital name</Label><Input name="hospital_name" required defaultValue={edit?.hospital_name ?? ""} placeholder="Mulago National Referral Hospital" /></div>
                <div className="space-y-1"><Label>Region</Label><Input name="region" defaultValue={edit?.region ?? "Central"} placeholder="Central / Western / Eastern / Northern" /></div>
                <div className="space-y-1"><Label>Patient reference</Label><Input name="patient_reference" defaultValue={edit?.patient_reference ?? ""} placeholder="PT-2026-0042" /></div>
                <div className="space-y-1"><Label>Blood group</Label><Input name="blood_group" required defaultValue={edit?.blood_group ?? "O"} placeholder="A, B, AB, or O" maxLength={2} /></div>
                <div className="space-y-1">
                  <Label>Rh</Label>
                  <Select name="rh" defaultValue={edit?.rh ?? "positive"} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="positive">Positive</SelectItem><SelectItem value="negative">Negative</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Units needed</Label><Input name="units_needed" type="number" min={1} defaultValue={edit?.units_needed ?? 1} required /></div>
                <div className="space-y-1">
                  <Label>Urgency</Label>
                  <Select name="urgency" defaultValue={edit?.urgency ?? "urgent"} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{URGENCIES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {edit?.id && (
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select name="status" defaultValue={edit?.status ?? "pending"} required>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-1"><Label>Notes</Label><Input name="notes" defaultValue={edit?.notes ?? ""} placeholder="Optional clinical context" /></div>
              <Button type="submit" className="w-full" disabled={save.isPending}>{edit?.id ? "Update request" : "Submit request"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hospital</TableHead><TableHead>Group</TableHead><TableHead>Units</TableHead>
                <TableHead>Urgency</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(requests ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.hospital?.name}<div className="text-xs text-muted-foreground">{r.hospital?.region}</div></TableCell>
                  <TableCell className="font-medium">{r.blood_group}{r.rh === "positive" ? "+" : "-"}</TableCell>
                  <TableCell>{r.units_needed}</TableCell>
                  <TableCell><Badge variant={urgencyVariant(r.urgency) as any}>{r.urgency}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete request?")) remove.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {(requests ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No requests yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
