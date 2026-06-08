import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listUsers, createUser, setUserRole, deleteUser } from "@/lib/admin-users.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, UserPlus, Plus, Pencil } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings · Nakandulo" }] }),
  component: SettingsPage,
});

const ROLES = [
  { value: "admin", label: "System Admin" },
  { value: "hub_staff", label: "Hub Officer" },
  { value: "hospital_requester", label: "Hospital Requester" },
  { value: "dispatch_coordinator", label: "Dispatch Coordinator" },
  { value: "donor", label: "Donor" },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage users, roles, hubs and hospitals.</p>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users & roles</TabsTrigger>
          <TabsTrigger value="hubs">Blood hubs</TabsTrigger>
          <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="pt-4"><UsersPanel /></TabsContent>
        <TabsContent value="hubs" className="pt-4"><LocationsPanel kind="hubs" /></TabsContent>
        <TabsContent value="hospitals" className="pt-4"><LocationsPanel kind="hospitals" /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listUsers);
  const createFn = useServerFn(createUser);
  const setRoleFn = useServerFn(setUserRole);
  const delFn = useServerFn(deleteUser);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn(),
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => createFn({
      data: {
        email: String(form.get("email")),
        password: String(form.get("password")),
        role: String(form.get("role")) as any,
        display_name: String(form.get("display_name") || ""),
      },
    }),
    onSuccess: () => { toast.success("User created"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRole = useMutation({
    mutationFn: async (v: { user_id: string; role: string }) => setRoleFn({ data: { user_id: v.user_id, role: v.role as any } }),
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (user_id: string) => delFn({ data: { user_id } }),
    onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Create user</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); (e.currentTarget as HTMLFormElement).reset(); }} className="grid gap-3 sm:grid-cols-5">
            <div className="space-y-1"><Label>Email</Label><Input name="email" type="email" required placeholder="officer@health.go.ug" /></div>
            <div className="space-y-1"><Label>Display name</Label><Input name="display_name" placeholder="Jane Nakato" /></div>
            <div className="space-y-1"><Label>Password</Label><Input name="password" type="password" minLength={8} required /></div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select name="role" defaultValue="hub_staff" required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><Button type="submit" disabled={create.isPending} className="w-full"><UserPlus className="h-4 w-4 mr-2" />Create</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All users</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {error ? <div className="p-4 text-sm text-destructive">{(error as any).message}</div> : isLoading ? <div className="p-4 text-sm text-muted-foreground">Loading…</div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead>Change role</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(users ?? []).map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}<div className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</div></TableCell>
                    <TableCell className="space-x-1">{u.roles.length ? u.roles.map((r: string) => <Badge key={r} variant="secondary">{roleLabel(r)}</Badge>) : <span className="text-muted-foreground text-xs">No role</span>}</TableCell>
                    <TableCell>
                      <Select defaultValue={u.roles[0] ?? "donor"} onValueChange={(v) => updateRole.mutate({ user_id: u.id, role: v })}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${u.email}?`)) remove.mutate(u.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
                {(users ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No users yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LocationsPanel({ kind }: { kind: "hubs" | "hospitals" }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any | null>(null);

  const { data: rows } = useQuery({
    queryKey: [kind],
    queryFn: async () => {
      const { data, error } = await supabase.from(kind).select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const payload: any = {
        name: String(form.get("name")),
        region: String(form.get("region")),
        address: String(form.get("address") || ""),
        lat: Number(form.get("lat") || 0),
        lng: Number(form.get("lng") || 0),
        contact_phone: String(form.get("contact_phone") || ""),
      };
      if (kind === "hubs") payload.capacity_units = Number(form.get("capacity_units") || 500);
      const id = form.get("id") as string;
      if (id) {
        const { error } = await supabase.from(kind).update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(kind).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); setEdit(null); qc.invalidateQueries({ queryKey: [kind] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from(kind).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: [kind] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="capitalize">{kind}</CardTitle>
        <Button size="sm" onClick={() => setEdit({})}><Plus className="h-4 w-4 mr-2" />Add</Button>
      </CardHeader>
      <CardContent>
        {edit && (
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }} className="grid gap-3 sm:grid-cols-3 mb-6 p-4 border border-border rounded-md bg-muted/30">
            {edit.id && <input type="hidden" name="id" value={edit.id} />}
            <div className="space-y-1"><Label>Name</Label><Input name="name" required defaultValue={edit.name || ""} placeholder="Mulago National Referral Hospital" /></div>
            <div className="space-y-1"><Label>Region</Label><Input name="region" required defaultValue={edit.region || ""} placeholder="Central" /></div>
            <div className="space-y-1"><Label>Phone</Label><Input name="contact_phone" defaultValue={edit.contact_phone || ""} placeholder="+256..." /></div>
            <div className="space-y-1 sm:col-span-3"><Label>Address</Label><Input name="address" defaultValue={edit.address || ""} placeholder="Kampala, Uganda" /></div>
            <div className="space-y-1"><Label>Latitude</Label><Input name="lat" type="number" step="0.0001" defaultValue={edit.lat ?? 0.3163} /></div>
            <div className="space-y-1"><Label>Longitude</Label><Input name="lng" type="number" step="0.0001" defaultValue={edit.lng ?? 32.5822} /></div>
            {kind === "hubs" && <div className="space-y-1"><Label>Capacity (units)</Label><Input name="capacity_units" type="number" defaultValue={edit.capacity_units ?? 500} /></div>}
            <div className="sm:col-span-3 flex gap-2"><Button type="submit" disabled={save.isPending}>Save</Button><Button type="button" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
          </form>
        )}
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Region</TableHead><TableHead>Phone</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {(rows ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.region}</TableCell>
                <TableCell className="text-muted-foreground">{r.contact_phone || "—"}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${r.name}?`)) remove.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
