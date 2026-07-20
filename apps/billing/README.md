# DRFTN Billing (Standalone App)

Standalone Next.js + TypeScript GST billing app for fast counter sales.

## Isolation
- App is fully isolated under `apps/billing`
- Separate package/dependencies/config from storefront
- Netlify deploy target is this folder only

## Stack
- Next.js App Router + TypeScript
- Clerk auth (login-only public route)
- Neon Postgres + SQL migrations + DB integrity triggers
- Supabase Storage for PDFs/tag images
- PDF generation via `pdf-lib`

## Environment variables
Create `apps/billing/.env.local`:

```bash
# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database (Neon Postgres)
DATABASE_URL=postgres://...

# Billing business fields for PDF
BUSINESS_NAME=DRFTN Clothing
BUSINESS_GSTIN=

# Storage (Supabase)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=billing-documents
```

## Local setup
```bash
cd apps/billing
npm install
npm run lint
npm run test
npm run build
```

## Migrations and seed
```bash
cd apps/billing
# apply SQL from src/db/migrations/0001_billing_init.sql to Neon
npm run db:seed
```

## Netlify deployment (subdomain)
1. Create a Netlify site from repo
2. Build base directory: `apps/billing`
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables above
6. Add custom domain `billings.drftnclothing.in`

## Clerk setup
1. Create Clerk application (free tier)
2. Configure sign-in route `/login`
3. Add keys to Netlify env vars
4. Keep only `/login` public; middleware protects all other routes/APIs

## Neon setup and retention
1. Create dedicated Neon project or schema for billing
2. Run SQL migration `src/db/migrations/0001_billing_init.sql`
3. Enable/check Point-in-Time Recovery (PITR)
4. Monthly checklist:
   - [ ] PITR retained and restorable
   - [ ] Latest restore test successful
   - [ ] Invoice/PDF export archived
   - [ ] No hard-delete paths introduced

## Feature summary
- Draft sale creation
- Mobile tag scan (`accept=image/*`, `capture=environment`) with OCR abstraction
- Editable OCR confirm before add
- Quick add + desktop keyboard add flow
- Auto GST slab per line (`<=2500 => 5%`, `>2500 => 18%`)
- Inline price editing (GST slab recalculates)
- Payment confirm assigns atomic sequential invoice number via DB function
- Finalized invoice immutability enforced by DB triggers
- Deterministic server-side PDF generation and storage
- WhatsApp send link (`wa.me/91{phone}`) and `sent_at` marking
- Admin list + date filtering + CSV export
- Monthly net GST payable summary with purchase logs

## Tests included
- GST slab logic
- Phone validation
- Finalization status constraints
