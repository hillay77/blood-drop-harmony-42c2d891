import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/app/inventory")({
  head: () => ({ meta: [{ title: "Inventory · Nakandulo" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_units")
        .select("id, blood_group, rh, volume_ml, status, expires_at, phenotype_tags, hub:hubs(name, city)")
        .order("expires_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const statusVariant = (s: string) =>
    s === "available" ? "default" : s === "reserved" ? "secondary" : s === "expired" ? "destructive" : "outline";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Blood unit inventory</h1>
        <p className="text-muted-foreground text-sm mt-1">FEFO-ordered. {data?.length ?? 0} units shown.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Units</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Hub</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Phenotype</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.blood_group}{u.rh === "positive" ? "+" : "-"}</TableCell>
                    <TableCell>{u.hub?.name ?? "—"}<div className="text-xs text-muted-foreground">{u.hub?.city}</div></TableCell>
                    <TableCell>{u.volume_ml} mL</TableCell>
                    <TableCell className="max-w-[180px] truncate">{(u.phenotype_tags ?? []).join(", ") || "—"}</TableCell>
                    <TableCell>{new Date(u.expires_at).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant={statusVariant(u.status) as any}>{u.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
