import { Auth0Client } from "@auth0/nextjs-auth0/server";

let appBaseUrl = process.env.APP_BASE_URL;
if (appBaseUrl) {
  // Clean up trailing "http:443" from copy-paste typos
  if (appBaseUrl.endsWith("http:443")) {
    appBaseUrl = appBaseUrl.slice(0, -8);
  }
  // Trim any trailing slashes
  appBaseUrl = appBaseUrl.replace(/\/+$/, "");
}

export const auth0 = new Auth0Client({
  appBaseUrl: appBaseUrl,
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
});
