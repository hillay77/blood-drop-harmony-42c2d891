import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password · Nakandulo" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from URL hash automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  async function update(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.auth.updateUser({ password: String(f.get("password")) });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <Droplets className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Nakandulo</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>{ready ? "Enter a new password for your account." : "Validating reset link…"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={update} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="np">New password</Label><Input id="np" name="password" type="password" minLength={6} required disabled={!ready} /></div>
              <Button type="submit" className="w-full" disabled={loading || !ready}>{loading ? "Updating…" : "Update password"}</Button>
              <Link to="/auth" className="block text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
