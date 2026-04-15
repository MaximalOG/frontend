import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Landing page after Google/Discord OAuth redirect.
 * URL: /oauth-callback?token=xxx&user=...
 * Stores token + user, then redirects to dashboard.
 */
const OAuthCallback = () => {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const { setUserFromOAuth } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const userRaw = params.get("user");
    const error = params.get("error");

    if (error || !token || !userRaw) {
      navigate("/login?error=oauth_failed", { replace: true });
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw));
      setUserFromOAuth(token, user);
      navigate("/dashboard", { replace: true });
    } catch {
      navigate("/login?error=oauth_failed", { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
