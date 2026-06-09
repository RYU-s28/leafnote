import React, { useState } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { LogIn, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await appClient.auth.loginWithProvider("google", "/");
    } catch (err) {
      setError(err.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Sign in with Google so LeafNote can sync to your Drive"
      footer={
        <>
          First time here?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Use Google to start
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting to Google...
          </>
        ) : (
          <>
            <GoogleIcon className="w-5 h-5 mr-2" />
            Continue with Google
          </>
        )}
      </Button>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center leading-6">
        LeafNote uses the minimum Drive scope needed to create and manage files inside your LeafNote folder.
      </p>

      <p className="text-xs text-center text-muted-foreground mt-6">
        Need help with an older password-based account? <Link to="/forgot-password" className="text-primary hover:underline">Read the migration note</Link>
      </p>
    </AuthLayout>
  );
}
