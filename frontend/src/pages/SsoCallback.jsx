import { useClerk } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SsoCallback() {
  const { handleRedirectCallback } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        await handleRedirectCallback();
        navigate("/", { replace: true });
      } catch (err) {
        console.error("SSO CALLBACK ERROR:", err);

        const code = err?.errors?.[0]?.code;

        // Existing user tries signing up → Clerk throws one of these
        if (
          code === "identifier_exists" ||
          code === "form_identifier_exists" ||
          code === "email_address_exists" ||
          code === "user_already_exists"
        ) {
          navigate("/", { replace: true });
          return;
        }

        // Generic fallback for any other issue
        navigate("/", { replace: true });
      }
    };

    run();
  }, [handleRedirectCallback, navigate]);

  return null;
}
