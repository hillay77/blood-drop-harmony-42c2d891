import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({ meta: [{ title: "Email Notifications · Nakandulo" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const send = useMutation({
    mutationFn: async (form: FormData) => {
      const payload = {
        to: String(form.get("to") || ""),
        subject: String(form.get("subject") || ""),
        message: String(form.get("message") || ""),
      };
      const r = await fetch("/api/notify/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error?.error?.message || "Failed to send");
      return r.json();
    },
    onSuccess: () => toast.success("Email sent"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Email notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">Send a one-off email via the connected Gmail account.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>New email</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); send.mutate(new FormData(e.currentTarget)); }}
            className="space-y-3"
          >
            <div className="space-y-1"><Label>Recipient email</Label><Input name="to" type="email" required placeholder="recipient@example.com" /></div>
            <div className="space-y-1"><Label>Subject</Label><Input name="subject" required placeholder="Urgent blood match" /></div>
            <div className="space-y-1"><Label>Message</Label><Textarea name="message" required rows={6} placeholder="Type your message…" /></div>
            <Button type="submit" disabled={send.isPending}>
              <Mail className="h-4 w-4 mr-2" />{send.isPending ? "Sending…" : "Send email"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
