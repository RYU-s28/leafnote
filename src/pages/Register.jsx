import React, { useState } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";

export default function Register() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await appClient.auth.loginWithProvider("google", "/");
    } catch (err) {
      setLoading(false);
      setError(err.message || "Google sign-up failed");
    }
  };

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Use Google so your notebooks stay in your own Drive"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
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
        Firestore keeps only lightweight account metadata. Your real notebooks, pages, and attachments live inside your own Drive folder.
      </p>
    </AuthLayout>
  );
}
