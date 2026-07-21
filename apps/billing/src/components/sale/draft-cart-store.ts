import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { calculateInvoiceTotals, LineItemInput } from "@/lib/domain/gst";

export interface CartItem {
  id: string;
  productId?: string;
  code?: string;
  productName: string;
  hsnCode: string;
  unitPricePaise: number;
  quantity: number;
  discountPct: number;
  gstRate: number;
}

export interface BuyerInfo {
  name: string;
  phone: string;
  email: string;
  gstin: string;
  state: string; // e.g., "Karnataka"
  isInterState: boolean;
  paymentMode: "cash" | "upi" | "card" | "bank_transfer";
}

interface DraftCartState {
  invoiceId: string | null;
  items: CartItem[];
  buyerInfo: BuyerInfo;
  sellerState: string;

  // Actions
  setInvoiceId: (id: string | null) => void;
  addItem: (item: Omit<CartItem, "id">) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setBuyerInfo: (info: Partial<BuyerInfo>) => void;
  setSellerState: (state: string) => void;
  syncFromInvoice: (invoiceId: string, items: CartItem[], buyer: Partial<BuyerInfo>) => void;
}

const initialBuyerInfo: BuyerInfo = {
  name: "",
  phone: "",
  email: "",
  gstin: "",
  state: "Karnataka",
  isInterState: false,
  paymentMode: "upi",
};

export const useDraftCart = create<DraftCartState>()(
  persist(
    (set, get) => ({
      invoiceId: null,
      items: [],
      buyerInfo: initialBuyerInfo,
      sellerState: "Karnataka",

      setInvoiceId: (id) => set({ invoiceId: id }),

      addItem: (item) => {
        const id = "tmp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
        const existingIdx = get().items.findIndex(
          i => i.code && item.code && i.code.toUpperCase() === item.code.toUpperCase()
        );

        if (existingIdx >= 0) {
          // Increment qty
          const updated = [...get().items];
          updated[existingIdx].quantity += (item.quantity || 1);
          set({ items: updated });
        } else {
          set({ items: [...get().items, { ...item, id }] });
        }
      },

      updateItem: (id, updates) => {
        set({
          items: get().items.map(i => (i.id === id ? { ...i, ...updates } : i)),
        });
      },

      removeItem: (id) => {
        set({ items: get().items.filter(i => i.id !== id) });
      },

      clearCart: () => {
        set({ items: [], invoiceId: null, buyerInfo: initialBuyerInfo });
      },

      setBuyerInfo: (info) => {
        const currentBuyer = get().buyerInfo;
        const sellerState = get().sellerState;
        const newBuyer = { ...currentBuyer, ...info };

        if (info.state !== undefined) {
          newBuyer.isInterState =
            sellerState.trim().toLowerCase() !== info.state.trim().toLowerCase();
        }

        set({ buyerInfo: newBuyer });
      },

      setSellerState: (state) => set({ sellerState: state }),

      syncFromInvoice: (invoiceId, items, buyer) => {
        set({
          invoiceId,
          items,
          buyerInfo: { ...get().buyerInfo, ...buyer },
        });
      },
    }),
    {
      name: "drftn_draft_cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
