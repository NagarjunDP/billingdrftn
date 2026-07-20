import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import { BillingApp } from "@/components/billing-app";

const ALLOWED_EMAILS = ["drftnclothing@gmail.com", "nagarjundp256@gmail.com"];

export default async function Home() {
  const session = await getSession();
  const user = session?.user;
  if (!user || !user.email || !ALLOWED_EMAILS.includes(user.email)) {
    redirect("/api/auth/login");
  }
  return <BillingApp />;
}
