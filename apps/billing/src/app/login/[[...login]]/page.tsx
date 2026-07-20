import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="login-page">
      <SignIn path="/login" routing="path" fallbackRedirectUrl="/" signUpUrl="/login" />
    </main>
  );
}
