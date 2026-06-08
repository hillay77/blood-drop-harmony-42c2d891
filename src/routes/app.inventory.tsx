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
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/app/inventory")({
  head: () => ({ meta: [{ title: "Blood Stock · Nakandulo" }] }),
  component: InventoryPage,
});

const GROUPS = ["A", "B", "AB", "O"];
const STATUSES = ["available", "reserved", "dispatched", "expired", "discarded"];

function InventoryPage() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_units")
        .select("id, hub_id, blood_group, rh, volume_ml, status, expires_at, collected_at, phenotype_tags, storage_unit, hub:hubs(name, region)")
        .order("expires_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const { data: hubs } = useQuery({
    queryKey: ["hubs-list"],
    queryFn: async () => (await supabase.from("hubs").select("id, name, region").order("name")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const id = form.get("id") as string;
      const payload: any = {
        hub_id: String(form.get("hub_id")),
        blood_group: String(form.get("blood_group")).toUpperCase(),
        rh: String(form.get("rh")),
        volume_ml: Number(form.get("volume_ml")),
        status: String(form.get("status")),
        expires_at: new Date(String(form.get("expires_at"))).toISOString(),
        phenotype_tags: String(form.get("phenotype_tags") || "").split(",").map((s) => s.trim()).filter(Boolean),
        storage_unit: String(form.get("storage_unit") || ""),
      };
      if (id) {
        const { error } = await supabase.from("blood_units").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blood_units").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setEdit(null); qc.invalidateQueries({ queryKey: ["inventory"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("blood_units").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["inventory"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const statusVariant = (s: string) => s === "available" ? "default" : s === "reserved" ? "secondary" : s === "expired" || s === "discarded" ? "destructive" : "outline";

  const openEdit = (u: any) => { setEdit(u); setOpen(true); };
  const openNew = () => { setEdit(null); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-display text-2xl font-bold">Blood stock management</h1>
          <p className="text-muted-foreground text-sm mt-1">FEFO-ordered. {data?.length ?? 0} units shown.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New unit</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit?.id ? "Edit blood unit" : "New blood unit"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
              {edit?.id && <input type="hidden" name="id" value={edit.id} />}
              <div className="space-y-1">
                <Label>Hub</Label>
                <Select name="hub_id" defaultValue={edit?.hub_id} required>
                  <SelectTrigger><SelectValue placeholder="Select hub" /></SelectTrigger>
                  <SelectContent>{(hubs ?? []).map((h: any) => <SelectItem key={h.id} value={h.id}>{h.name} · {h.region}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Blood group</Label>
                  <Input name="blood_group" required defaultValue={edit?.blood_group ?? "O"} placeholder="A, B, AB, or O" maxLength={2} />
                </div>
                <div className="space-y-1">
                  <Label>Rh</Label>
                  <Select name="rh" defaultValue={edit?.rh ?? "positive"} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="positive">Positive</SelectItem><SelectItem value="negative">Negative</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Volume (mL)</Label><Input name="volume_ml" type="number" min={1} defaultValue={edit?.volume_ml ?? 450} required /></div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select name="status" defaultValue={edit?.status ?? "available"} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>Expires</Label><Input name="expires_at" type="datetime-local" required defaultValue={edit?.expires_at ? new Date(edit.expires_at).toISOString().slice(0, 16) : new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 16)} /></div>
              <div className="space-y-1"><Label>Phenotype tags (comma-separated)</Label><Input name="phenotype_tags" defaultValue={(edit?.phenotype_tags ?? []).join(", ")} placeholder="C+, E-, K-" /></div>
              <div className="space-y-1"><Label>Storage unit</Label><Input name="storage_unit" defaultValue={edit?.storage_unit ?? ""} placeholder="Fridge A · Shelf 2" /></div>
              <Button type="submit" className="w-full" disabled={save.isPending}>{edit?.id ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>Units</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? <div className="p-4 text-sm text-muted-foreground">Loading…</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead><TableHead>Hub</TableHead><TableHead>Volume</TableHead>
                  <TableHead>Phenotype</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.blood_group}{u.rh === "positive" ? "+" : "-"}</TableCell>
                    <TableCell>{u.hub?.name ?? "—"}<div className="text-xs text-muted-foreground">{u.hub?.region}</div></TableCell>
                    <TableCell>{u.volume_ml} mL</TableCell>
                    <TableCell className="max-w-[180px] truncate">{(u.phenotype_tags ?? []).join(", ") || "—"}</TableCell>
                    <TableCell>{new Date(u.expires_at).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant={statusVariant(u.status) as any}>{u.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete unit?")) remove.mutate(u.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(data ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No units yet. Click "New unit" to add one.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
