import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports · Nakandulo" }] }),
  component: ReportsPage,
});

const COLORS = ["var(--color-primary)", "var(--color-accent)", "var(--color-warning)", "var(--color-destructive)", "var(--color-muted-foreground)"];

function ReportsPage() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [units, requests, dispatches, alerts, hubs] = await Promise.all([
        supabase.from("blood_units").select("blood_group, rh, status, hub_id"),
        supabase.from("blood_requests").select("urgency, status, created_at"),
        supabase.from("dispatches").select("status, created_at"),
        supabase.from("match_alerts").select("status, sent_at"),
        supabase.from("hubs").select("id, name"),
      ]);
      const hubMap = new Map((hubs.data ?? []).map((h: any) => [h.id, h.name]));
      const stockByHub: Record<string, number> = {};
      (units.data ?? []).filter((u: any) => u.status === "available").forEach((u: any) => {
        const name = hubMap.get(u.hub_id) ?? "Unknown";
        stockByHub[name] = (stockByHub[name] ?? 0) + 1;
      });
      const reqByStatus: Record<string, number> = {};
      (requests.data ?? []).forEach((r: any) => { reqByStatus[r.status] = (reqByStatus[r.status] ?? 0) + 1; });
      const dispByStatus: Record<string, number> = {};
      (dispatches.data ?? []).forEach((d: any) => { dispByStatus[d.status] = (dispByStatus[d.status] ?? 0) + 1; });
      return {
        stockByHub: Object.entries(stockByHub).map(([name, value]) => ({ name, value })),
        reqByStatus: Object.entries(reqByStatus).map(([name, value]) => ({ name, value })),
        dispByStatus: Object.entries(dispByStatus).map(([name, value]) => ({ name, value })),
        totals: {
          units: (units.data ?? []).length,
          requests: (requests.data ?? []).length,
          dispatches: (dispatches.data ?? []).length,
          alerts: (alerts.data ?? []).length,
        },
      };
    },
  });

  const totals = data?.totals;

  const sections = (): { name: string; rows: any[] }[] => [
    { name: "Totals", rows: [{ metric: "Total units", value: totals?.units ?? 0 }, { metric: "Total requests", value: totals?.requests ?? 0 }, { metric: "Dispatches", value: totals?.dispatches ?? 0 }, { metric: "SMS alerts", value: totals?.alerts ?? 0 }] },
    { name: "Stock by hub", rows: data?.stockByHub ?? [] },
    { name: "Requests by status", rows: data?.reqByStatus ?? [] },
    { name: "Dispatches by status", rows: data?.dispByStatus ?? [] },
  ];

  function exportCSV() {
    const lines: string[] = [];
    sections().forEach((s) => {
      lines.push(s.name);
      if (s.rows.length) {
        const keys = Object.keys(s.rows[0]);
        lines.push(keys.join(","));
        s.rows.forEach((r: any) => lines.push(keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")));
      }
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `nakandulo-reports-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function exportXLSX() {
    const wb = XLSX.utils.book_new();
    sections().forEach((s) => {
      const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ info: "no data" }]);
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
    });
    XLSX.writeFile(wb, `nakandulo-reports-${Date.now()}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Nakandulo Aggregation Reports", 14, 16);
    doc.setFontSize(10); doc.text(new Date().toLocaleString(), 14, 22);
    let y = 30;
    sections().forEach((s) => {
      const head = s.rows.length ? [Object.keys(s.rows[0])] : [["info"]];
      const body = s.rows.length ? s.rows.map((r: any) => Object.values(r).map((v) => String(v ?? ""))) : [["no data"]];
      autoTable(doc, { startY: y, head, body, headStyles: { fillColor: [30, 41, 59] }, didDrawPage: () => { doc.setFontSize(12); doc.text(s.name, 14, y - 4); } });
      y = (doc as any).lastAutoTable.finalY + 12;
    });
    doc.save(`nakandulo-reports-${Date.now()}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Aggregation reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Nationwide rollups across hubs, requests, dispatches, and alerts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportXLSX}><Download className="h-4 w-4 mr-2" />Excel</Button>
          <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total units", v: totals?.units },
          { label: "Total requests", v: totals?.requests },
          { label: "Dispatches", v: totals?.dispatches },
          { label: "SMS alerts", v: totals?.alerts },
        ].map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">{k.label}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-display font-bold">{k.v ?? "—"}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Available stock by hub</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.stockByHub ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Requests by status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.reqByStatus ?? []} dataKey="value" nameKey="name" outerRadius={90} label>
                    {(data?.reqByStatus ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Dispatch throughput</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.dispByStatus ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
