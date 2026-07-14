"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginActionState } from "@/app/(auth)/connexion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authDiagnostic } from "@/lib/auth/diagnostics";
import { getSafeReturnPath } from "@/lib/auth/redirects";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Connexion..." : "Continuer"}
    </Button>
  );
}

export function LoginForm({ returnPath }: { returnPath: string }) {
  const [state, formAction] = useActionState<LoginActionState, FormData>(loginAction, {});
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  async function startGoogleOAuth() {
    setGooglePending(true);
    setGoogleError(null);

    const safeReturnPath = getSafeReturnPath(returnPath);
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("retour", safeReturnPath);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      authDiagnostic("GOOGLE_OAUTH_INIT_FAILED", { reason: "provider_init_failed" });
      setGoogleError("La connexion Google a échoué. Réessayez ou utilisez votre mot de passe.");
      setGooglePending(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={startGoogleOAuth}
        disabled={googlePending}
      >
        {googlePending ? "Connexion Google..." : "Continuer avec Google"}
      </Button>
      {googleError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {googleError}
        </p>
      ) : null}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="grid gap-5">
        <input type="hidden" name="returnPath" value={returnPath} />
        <div className="grid gap-2">
          <Label htmlFor="email">Adresse email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@parfum.ci"
            autoComplete="email"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {state.error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <LoginButton />
      </form>
    </div>
  );
}
