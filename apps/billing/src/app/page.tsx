import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BillingApp } from "@/components/billing-app";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return <BillingApp />;
}
