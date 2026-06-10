import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { roles, loading: rolesLoading } = useRoles(user?.id);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user || rolesLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  // Donor-only access: no admin/hub/hospital/dispatch role assigned
  const staffRoles = ["admin", "hub_staff", "hospital_requester", "dispatch_coordinator"];
  const isStaff = roles.some((r) => staffRoles.includes(r));

  if (!isStaff) {
    return <DonorScreen email={user.email} />;
  }

  return <AppShell email={user.email} roles={roles}><Outlet /></AppShell>;
}

function DonorScreen({ email }: { email?: string | null }) {
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl flex items-center justify-center gap-2">
            <Droplets className="h-5 w-5 text-primary" /> Welcome, Donor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Thank you for joining Nakandulo. Your account ({email}) has <strong>donor access</strong>.
            You will be notified by SMS when your blood type or phenotype is needed.
          </p>
          <p className="text-sm text-muted-foreground">
            Need staff access? Contact your System Administrator to be assigned a role
            (Hub Officer, Hospital Requester, Dispatch Coordinator, or Admin).
          </p>
          <Button variant="outline" className="w-full" onClick={signOut}>Sign out</Button>
        </CardContent>
      </Card>
    </div>
  );
}
