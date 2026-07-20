import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { BillingApp } from "@/components/billing-app";

const ALLOWED_EMAILS = ["drftnclothing@gmail.com", "nagarjundp256@gmail.com"];

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const session = await auth0.getSession();
    const user = session?.user;
    if (!user || !user.email || !ALLOWED_EMAILS.includes(user.email)) {
      redirect("/auth/login");
    }
    return <BillingApp />;
  } catch (error: any) {
    if (error.message === "NEXT_REDIRECT" || (error.digest && error.digest.startsWith("NEXT_REDIRECT"))) {
      throw error;
    }
    if (error.message === "DYNAMIC_SERVER_USAGE" || (error.digest && error.digest.startsWith("DYNAMIC_SERVER_USAGE")) || error.message?.includes("Dynamic server usage")) {
      throw error;
    }
    console.error("Home Server Component Error:", error);
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "600px", margin: "auto", lineHeight: "1.5" }}>
        <h1 style={{ color: "#dc2626", fontSize: "1.8rem", borderBottom: "2px solid #fee2e2", paddingBottom: "0.5rem" }}>Server Component Render Error</h1>
        <p style={{ fontWeight: "bold", color: "#b91c1c" }}>An error occurred while loading the home page:</p>
        <pre style={{ background: "#f1f5f9", padding: "1rem", borderRadius: "4px", border: "1px solid #cbd5e1", overflowX: "auto" }}>
          {error.message || error.toString()}
        </pre>
        <h3 style={{ marginTop: "1.5rem" }}>Recommended Troubleshooting:</h3>
        <p>Ensure that all required environment variables (including <code>DATABASE_URL</code> and Auth0 credentials) are correctly configured in your Netlify Dashboard and that you triggered a fresh deploy afterwards.</p>
      </main>
    );
  }
}
