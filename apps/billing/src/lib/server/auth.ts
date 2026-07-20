import { auth, currentUser } from "@clerk/nextjs/server";

const ALLOWED_EMAILS = ["drftnclothing@gmail.com", "nagarjundp256@gmail.com"];

export async function requireUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  if (!email || !ALLOWED_EMAILS.includes(email)) {
    throw new Error("Unauthorized");
  }

  return userId;
}
