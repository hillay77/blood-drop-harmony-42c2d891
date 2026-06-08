import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplets } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · Nakandulo" }, { name: "description", content: "Sign in to the Nakandulo blood supply network." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")), password: String(f.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/app" });
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signUp({
      email: String(f.get("email")),
      password: String(f.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { display_name: String(f.get("name") || "") },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Check your email if confirmation is required.");
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
            <CardTitle>Access the network</CardTitle>
            <CardDescription>Hub staff, hospitals, admins, and donors.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-4 mt-4">
                  <div className="space-y-2"><Label htmlFor="si-email">Email</Label><Input id="si-email" name="email" type="email" required /></div>
                  <div className="space-y-2"><Label htmlFor="si-pw">Password</Label><Input id="si-pw" name="password" type="password" required /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-4 mt-4">
                  <div className="space-y-2"><Label htmlFor="su-name">Name</Label><Input id="su-name" name="name" required /></div>
                  <div className="space-y-2"><Label htmlFor="su-email">Email</Label><Input id="su-email" name="email" type="email" required /></div>
                  <div className="space-y-2"><Label htmlFor="su-pw">Password</Label><Input id="su-pw" name="password" type="password" minLength={6} required /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
