"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Store, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const INDIAN_STATES = [
  { name: "Karnataka", code: "29" },
  { name: "Maharashtra", code: "27" },
  { name: "Tamil Nadu", code: "33" },
  { name: "Delhi", code: "07" },
  { name: "Telangana", code: "36" },
  { name: "Gujarat", code: "24" },
  { name: "Kerala", code: "32" },
  { name: "West Bengal", code: "19" },
  { name: "Uttar Pradesh", code: "09" },
  { name: "Rajasthan", code: "08" },
  { name: "Punjab", code: "03" },
  { name: "Haryana", code: "06" },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [storeName, setStoreName] = useState("DRFTN Clothing");
  const [legalName, setLegalName] = useState("DRFTN Clothing");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Karnataka");
  const [stateCode, setStateCode] = useState("29");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("DRFTN");
  const [currentFY, setCurrentFY] = useState("25-26");
  const [currentSequence, setCurrentSequence] = useState(0);
  const [termsFooter, setTermsFooter] = useState(
    "Thank you for shopping with DRFTN Clothing. All sales are final. GST paid as applicable."
  );

  const loadSettings = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/settings");
      if (r.ok) {
        const d = await r.json();
        if (d.settings) {
          const s = d.settings;
          setStoreName(s.storeName || "DRFTN Clothing");
          setLegalName(s.legalName || "DRFTN Clothing");
          setGstin(s.gstin || "");
          setAddress(s.address || "");
          setCity(s.city || "");
          setState(s.state || "Karnataka");
          setStateCode(s.stateCode || "29");
          setPincode(s.pincode || "");
          setPhone(s.phone || "");
          setEmail(s.email || "");
          setInvoicePrefix(s.invoicePrefix || "DRFTN");
          setCurrentFY(s.currentFY || "25-26");
          setCurrentSequence(s.currentSequence || 0);
          if (s.termsFooter) setTermsFooter(s.termsFooter);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleStateChange = (selectedStateName: string) => {
    setState(selectedStateName);
    const found = INDIAN_STATES.find(s => s.name === selectedStateName);
    if (found) setStateCode(found.code);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          legalName,
          gstin: gstin.trim().toUpperCase(),
          address,
          city,
          state,
          stateCode,
          pincode,
          phone,
          email,
          invoicePrefix: invoicePrefix.trim().toUpperCase(),
          currentFY,
          currentSequence: Number(currentSequence),
          termsFooter,
        }),
      });

      if (r.ok) {
        toast.success("Store settings updated!");
      } else {
        toast.error("Failed to update settings");
      }
    } catch {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Settings className="text-[var(--accent)]" /> Store Profile & GST Settings
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Configure company legal details, GSTIN, registered state, and invoice numbering sequence
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Profile */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border)] pb-2">
            <Store size={16} className="text-[var(--accent)]" /> Company Legal Identity
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Store Brand Name
              </label>
              <input
                className="field h-10 text-sm font-bold"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Legal Entity Name
              </label>
              <input
                className="field h-10 text-sm"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Company GSTIN
              </label>
              <input
                className="field h-10 text-sm font-mono font-bold uppercase tracking-wider"
                placeholder="Paste your 15-digit GSTIN"
                value={gstin}
                onChange={e => setGstin(e.target.value.toUpperCase())}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Registered Home State (for CGST/SGST vs IGST)
              </label>
              <select
                className="field h-10 text-xs font-semibold"
                value={state}
                onChange={e => handleStateChange(e.target.value)}
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.name}>
                    {s.name} (Code {s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Store Registered Address
              </label>
              <input
                className="field h-10 text-xs"
                placeholder="Street address, building, locality"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                City / Pincode
              </label>
              <div className="flex gap-2">
                <input
                  className="field h-10 text-xs flex-1"
                  placeholder="City"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
                <input
                  className="field h-10 text-xs w-24 font-mono"
                  placeholder="Pincode"
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Numbering Sequence */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border)] pb-2">
            <FileText size={16} className="text-[var(--accent)]" /> Invoice Numbering & Financial Year Rule
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Invoice Prefix
              </label>
              <input
                className="field h-10 text-xs font-mono font-bold uppercase"
                value={invoicePrefix}
                onChange={e => setInvoicePrefix(e.target.value.toUpperCase())}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Financial Year (FY)
              </label>
              <input
                className="field h-10 text-xs font-mono font-bold"
                value={currentFY}
                onChange={e => setCurrentFY(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Current Sequence Counter
              </label>
              <input
                type="number"
                className="field h-10 text-xs font-mono font-bold"
                value={currentSequence}
                onChange={e => setCurrentSequence(Number(e.target.value))}
              />
            </div>
          </div>

          <p className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] p-2.5 rounded-lg border border-[var(--border-soft)]">
            💡 Invoice Format Preview: <strong className="text-[var(--accent)] font-mono">{invoicePrefix}/{currentFY}/{String(currentSequence + 1).padStart(4, "0")}</strong>
          </p>

          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
              Invoice Footer Terms & Conditions
            </label>
            <textarea
              className="field p-3 text-xs h-20"
              value={termsFooter}
              onChange={e => setTermsFooter(e.target.value)}
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button type="submit" className="btn-success h-12 px-6 text-sm font-bold shadow-lg" disabled={saving}>
            {saving ? <div className="spinner" /> : <><Save size={16} /> Save Settings</>}
          </button>
        </div>
      </form>
    </div>
  );
}
