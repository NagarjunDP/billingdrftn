import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { BillingApp } from "@/components/billing-app";

const ALLOWED_EMAILS = ["drftnclothing@gmail.com", "nagarjundp256@gmail.com"];

export default async function Home() {
  const session = await auth0.getSession();
  const user = session?.user;
  if (!user || !user.email || !ALLOWED_EMAILS.includes(user.email)) {
    redirect("/auth/login");
  }
  return <BillingApp />;
}
