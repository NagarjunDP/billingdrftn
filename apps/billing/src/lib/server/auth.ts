import { getSession } from "@auth0/nextjs-auth0";

const ALLOWED_EMAILS = ["drftnclothing@gmail.com", "nagarjundp256@gmail.com"];

export async function requireUserId() {
  const session = await getSession();
  const user = session?.user;
  if (!user || !user.email || !ALLOWED_EMAILS.includes(user.email)) {
    throw new Error("Unauthorized");
  }
  return user.sub;
}
