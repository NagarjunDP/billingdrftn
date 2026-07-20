import { handleAuth } from "@auth0/nextjs-auth0";

export const GET = (req: any, ctx: any) => handleAuth()(req, ctx);
export const POST = (req: any, ctx: any) => handleAuth()(req, ctx);
