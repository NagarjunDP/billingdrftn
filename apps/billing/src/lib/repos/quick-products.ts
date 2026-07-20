import { sql } from "@/db/client";

export type QuickProductRow = {
  id: string;
  code: string;
  name: string;
  price: string;
  created_at: string;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export async function saveQuickProduct(code: string, name: string, price: number) {
  const [product] = await sql`
    INSERT INTO quick_products (code, name, price)
    VALUES (${code.trim().toUpperCase()}, ${name.trim()}, ${round2(price)})
    ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name, price = EXCLUDED.price
    RETURNING *
  `;
  return product as QuickProductRow;
}

export async function getQuickProductByCode(code: string) {
  const [product] = await sql`
    SELECT * FROM quick_products WHERE code = ${code.trim().toUpperCase()}
  `;
  return (product || null) as QuickProductRow | null;
}

export async function listQuickProducts() {
  const products = await sql`
    SELECT * FROM quick_products ORDER BY code ASC
  `;
  return products as unknown as QuickProductRow[];
}

export async function deleteQuickProduct(id: string) {
  await sql`
    DELETE FROM quick_products WHERE id = ${id}
  `;
}
