import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BillingApp } from "@/components/billing-app";

const ALLOWED_EMAILS = ["drftnclothing@gmail.com", "nagarjundp256@gmail.com"];

export const dynamic = "force-dynamic";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  if (!email || !ALLOWED_EMAILS.includes(email)) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "600px", margin: "auto", marginTop: "4rem", textAlign: "center", lineHeight: "1.6" }}>
        <h1 style={{ color: "#dc2626", fontSize: "2rem", marginBottom: "1rem" }}>Access Denied</h1>
        <p style={{ fontSize: "1.1rem", color: "#475569" }}>
          Your email address (<strong>{email ?? "unknown"}</strong>) is not authorized to access this dashboard.
        </p>
        <p style={{ marginTop: "1rem" }}>
          Please contact the administrator or sign in with an authorized account.
        </p>
      </main>
    );
  }

  return <BillingApp />;
}
