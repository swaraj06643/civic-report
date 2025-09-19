// src/pages/AdminLogin.tsx
import React, { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { Footer } from "@/components/Layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  email: string;
  password: string;
}

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Basic client-side validation
      if (!formData.email || !formData.password) {
        setError("Please enter both email and password.");
        setLoading(false);
        return;
      }

      // 1) Verify profile exists and is admin
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("email", formData.email)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        setError("Unable to verify account. Try again.");
        setLoading(false);
        return;
      }

      if (!profileData) {
        setError("Account not found. Please register or check the email.");
        setLoading(false);
        return;
      }

      // profileData may be typed as 'any' depending on your DB typings
      const role = (profileData as any)?.role;
      if (role !== "admin") {
        setError("This account is not an admin account.");
        setLoading(false);
        return;
      }

      // 2) Authenticate with Supabase
      // Note: supabase.auth.signInWithPassword returns { data, error } in supabase-js v2
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      } as { email: string; password: string });

      if (authError) {
        console.error("Auth error:", authError);
        setError(authError.message || "Invalid credentials.");
        setLoading(false);
        return;
      }

      // 3) Successful login -> redirect to /account (immersive page)
      navigate("/account");
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black dark:bg-dark-blue-gradient dark:text-white">
      <Header />
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Admin Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  type="email"
                  placeholder="Admin Email"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  required
                  disabled={loading}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                  required
                  disabled={loading}
                />
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing In..." : "Sign In"}
                </Button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => navigate("/reset-password")}
                    disabled={loading}
                  >
                    Forgot your password?
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminLogin;
