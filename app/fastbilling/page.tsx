"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { supabase } from "../lib/supabase";

type Lang = "fr" | "en";
type Currency = "CAD" | "USD" | "EUR";
type Status = "pending" | "paid" | "late";
type FontTemplate = "modern" | "classic" | "minimal" | "bold" | "elegant";

const MicrosoftLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23" fill="none">
    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
    <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
  </svg>
);

const GoogleLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 4.94l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const TAX_RULES: Record<Currency, { label: string; lines: { name: string; rate: number }[] }> = {
  CAD: { label: "Canada (QC)", lines: [{ name: "TPS/GST", rate: 0.05 }, { name: "TVQ/QST", rate: 0.09975 }] },
  USD: { label: "États-Unis",  lines: [{ name: "Sales Tax", rate: 0.0875 }] },
  EUR: { label: "Europe",      lines: [{ name: "TVA", rate: 0.20 }] },
};

const FONT_TEMPLATES: Record<FontTemplate, { label: string; fontFamily: string; accentColor: string; headerBg: string; preview: string }> = {
  modern:  { label: "Modern",  fontFamily: "'Inter', system-ui, sans-serif",         accentColor: "#2563eb", headerBg: "#1e3a5f", preview: "M" },
  classic: { label: "Classic", fontFamily: "'Georgia', serif",                        accentColor: "#7c3aed", headerBg: "#2d1b69", preview: "C" },
  minimal: { label: "Minimal", fontFamily: "'Helvetica Neue', Arial, sans-serif",     accentColor: "#18181b", headerBg: "#18181b", preview: "m" },
  bold:    { label: "Bold",    fontFamily: "'Arial Black', sans-serif",               accentColor: "#dc2626", headerBg: "#7f1d1d", preview: "B" },
  elegant: { label: "Elegant", fontFamily: "'Palatino Linotype', serif",              accentColor: "#92400e", headerBg: "#451a03", preview: "E" },
};

const STATUS_CONFIG: Record<Status, { label: string; labelEn: string; color: string; bg: string }> = {
  pending: { label: "En attente", labelEn: "Pending", color: "#92400e", bg: "#fef3c7" },
  paid:    { label: "Payée",      labelEn: "Paid",    color: "#065f46", bg: "#d1fae5" },
  late:    { label: "En retard",  labelEn: "Overdue", color: "#991b1b", bg: "#fee2e2" },
};

const EXAMPLE_FR = `Plomberie Tremblay Inc.
123 rue des Érables, Montréal QC H2X 1Y1
info@tremblay.ca | 514 555-0000
TPS : 123456789 RT0001 | TVQ : 1234567890 TQ0001

Client : Rocky Balboa, 456 avenue Victory, Philadelphie PA 19107

Service : Réparation urgente d'un tuyau brisé, 3h de travail + pièces
Montant : 350.00 $
Statut : En attente`;

const EXAMPLE_EN = `Plomberie Tremblay Inc.
123 rue des Érables, Montréal QC H2X 1Y1
info@tremblay.ca | 514 555-0000
GST: 123456789 RT0001 | QST: 1234567890 TQ0001

Client: Rocky Balboa, 456 Victory Ave, Philadelphia PA 19107

Service: Emergency broken pipe repair, 3h labor + parts
Amount: $350.00
Status: Pending`;

const T = {
  fr: {
    tagline: "⚡ Une facture pro en 30 secondes.",
    sub: "Décris ta situation en langage naturel. L'IA génère la facture complète.",
    placeholder: EXAMPLE_FR,
    hint: "💡 Inclus : nom & adresse de ton entreprise, nom & adresse du client, description du service, montant, statut (payée / en attente / en retard). L'IA s'occupe du reste.",
    generate: "Générer la facture",
    generating: "L'IA prépare ta facture…",
    invoiceNum: "Facture N°",
    date: "Date",
    dueDate: "Échéance",
    billTo: "Facturé à",
    from: "De la part de",
    desc: "Description",
    unitPrice: "Montant HT",
    totalHT: "Sous-total HT",
    total: "Total TTC",
    paymentTerms: "Conditions de paiement",
    lateWarning: "⚠️ Facture en retard. Des pénalités peuvent s'appliquer.",
    dark: "☾", light: "☀",
  },
  en: {
    tagline: "⚡ A pro invoice in 30 seconds.",
    sub: "Describe your situation in plain language. AI generates the full invoice.",
    placeholder: EXAMPLE_EN,
    hint: "💡 Include: your company name & address, client name & address, service description, amount, status (paid / pending / overdue). AI handles the rest.",
    generate: "Generate invoice",
    generating: "AI is preparing your invoice…",
    invoiceNum: "Invoice No.",
    date: "Date",
    dueDate: "Due date",
    billTo: "Bill to",
    from: "From",
    desc: "Description",
    unitPrice: "Amount (excl. tax)",
    totalHT: "Subtotal",
    total: "Total (incl. tax)",
    paymentTerms: "Payment terms",
    lateWarning: "⚠️ This invoice is overdue. Late fees may apply.",
    dark: "☾", light: "☀",
  },
};

const PRICES: Record<Currency, { amount: string; symbol: string }> = {
  CAD: { amount: "3.99", symbol: "CA$" },
  USD: { amount: "3.99", symbol: "US$" },
  EUR: { amount: "3.99", symbol: "€" },
};

interface InvoiceData {
  numero: string; date: string; echeance: string;
  emetteur: string; adresseEmetteur: string; emailEmetteur: string; telEmetteur: string;
  neq: string; numTPS: string; numTVQ: string;
  client: string; adresseClient: string; telClient: string; emailClient: string;
  description: string; montantHT: number; currency: Currency; status: Status;
  lignesTaxes: { name: string; rate: number; amount: number }[];
  totalTTC: number; conditions: string; notes: string;
}

export default function FastBillingPage() {
  const { lang: globalLang, setLang: setGlobalLang } = useApp();
  const fr = globalLang === "fr";
  const router = useRouter();

  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userTier, setUserTier] = useState<string>("free");

  // Devise & Stripe Premium
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Auth Modals
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // FastBilling Core
  const [freeText, setFreeText] = useState("");
  const [status, setStatus] = useState<Status>("pending");
  const [fontTemplate, setFontTemplate] = useState<FontTemplate>("modern");
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);
  const t = T[globalLang];
  const tmpl = FONT_TEMPLATES[fontTemplate];
  const taxRule = TAX_RULES[currency];

  const bg    = dark ? "#1a1917" : "#f0ece4";
  const surf  = dark ? "#242220" : "#fffdf9";
  const surf2 = dark ? "#2d2b28" : "#f5f1e8";
  const bord  = dark ? "#3a3835" : "#e2ddd5";
  const txt   = dark ? "#f0ece4" : "#1a1917";
  const muted = dark ? "#8a8680" : "#7a7570";
  const acc   = "#e07b39";
  const cs    = currency === "EUR" ? "€" : "$";
  const fmt   = (n: number) => `${cs}${n.toFixed(2)}`;
  const api   = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  useEffect(() => {
    let sid = localStorage.getItem("fb_session_id");
    if (!sid) { sid = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`; localStorage.setItem("fb_session_id", sid); }
    setSessionId(sid);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        verifierStatutUser(session.user.id);
      } else {
        setUser(null);
        setUserTier("free");
      }
    });

    const draft = localStorage.getItem("fb_draft");
    if (draft) { setFreeText(draft); localStorage.removeItem("fb_draft"); }

    return () => subscription.unsubscribe();
  }, []);

  const verifierStatutUser = async (uid: string) => {
    try {
      const { data: cData } = await supabase.from("contenu_quotas").select("tier").eq("user_id", uid).maybeSingle();
      if (cData?.tier && cData.tier !== "free" && cData.tier !== "connected_free") {
        setUserTier(cData.tier); return;
      }
      const { data: wData } = await supabase.from("world_quotas").select("tier").eq("user_id", uid).maybeSingle();
      if (wData?.tier && wData.tier !== "free" && wData.tier !== "connected_free") {
        setUserTier(wData.tier); return;
      }
      setUserTier("free");
    } catch { setUserTier("free"); }
  };

  const handleStripeCheckout = async () => {
    if (!user) {
      setShowPremiumModal(false);
      setShowSignInModal(true);
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-site2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "world_advantage",
          currency: currency.toUpperCase(),
          userId: user.id,
          userEmail: user.email,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(fr ? "Erreur de redirection vers la caisse." : "Checkout redirection error.");
      }
    } catch {
      alert(fr ? "Impossible d'initier le paiement." : "Unable to initiate payment.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeText.trim()) return;

    setLoading(true); setInvoice(null);

    const now = new Date();
    const dateStr = now.toLocaleDateString(fr ? "fr-CA" : "en-CA");
    const due = new Date(now); due.setDate(due.getDate() + 30);
    const dueStr = due.toLocaleDateString(fr ? "fr-CA" : "en-CA");
    const numero = `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*9000)+1000)}`;

    try {
      const res = await fetch(`${api}/1/generate-invoice`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeText, currency, status, lang: globalLang, numero, dateStr, dueStr }),
      });
      const data = await res.json();

      const montantHT = parseFloat(data.montantHT) || 0;
      const lignesTaxes = taxRule.lines.map(l => ({ ...l, amount: montantHT * l.rate }));
      const totalTTC = montantHT + lignesTaxes.reduce((s, l) => s + l.amount, 0);

      const inv: InvoiceData = {
        numero, date: dateStr, echeance: dueStr,
        emetteur: data.emetteur || "Mon Entreprise",
        adresseEmetteur: data.adresseEmetteur || "",
        emailEmetteur: data.emailEmetteur || "",
        telEmetteur: data.telEmetteur || "",
        neq: data.neq || "", numTPS: data.numTPS || "", numTVQ: data.numTVQ || "",
        client: data.client || "Client",
        adresseClient: data.adresseClient || "",
        telClient: data.telClient || "",
        emailClient: data.emailClient || "",
        description: data.description || "",
        montantHT, currency, status,
        lignesTaxes, totalTTC,
        conditions: data.conditions || "",
        notes: data.notes || "",
      };
      setInvoice(inv);
      try {
        await supabase.from("invoices").upsert({
          id: inv.numero,
          user_id: user?.id || null,
          session_id: sessionId || localStorage.getItem("fb_session_id"),
          data: inv,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      } catch (e) {
        console.log("[FastBilling] Sauvegarde Supabase échouée:", e);
      }
    } catch {
      setInvoice(null);
    } finally { setLoading(false); }
  };

  const handleExport = async (format: "docx" | "pdf") => {
    if (!invoice) return;

    if (format === "pdf") {
      try {
        const { default: jsPDF } = await import("jspdf");
        const { default: html2canvas } = await import("html2canvas");
        if (!invoiceRef.current) return;
        const canvas = await html2canvas(invoiceRef.current, {
          scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`facture-${invoice.numero}.pdf`);
      } catch (err) {
        alert("Erreur PDF. Réessaie.");
      }
      return;
    }

    if (!invoiceRef.current) return;
    try {
      const res = await fetch(`${api}/export`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, html: invoiceRef.current.innerHTML, title: `Facture ${invoice.numero}` }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `facture-${invoice.numero}.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Erreur export DOCX."); }
  };

  const handleSave = async () => {
    if (!invoice) return;
    if (!user) {
      setShowSignInModal(true);
      return;
    }
    setSaving(true); setSavedMsg(null);
    try {
      const { error } = await supabase.from("invoices").upsert({
        id: invoice.numero,
        user_id: user.id,
        data: invoice,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (error) throw error;
      setSavedMsg(fr ? "✅ Facture sauvegardée !" : "✅ Invoice saved!");
      setTimeout(() => setSavedMsg(null), 3000);
      loadHistory();
    } catch {
      setSavedMsg(fr ? "❌ Erreur de sauvegarde." : "❌ Save failed.");
    } finally { setSaving(false); }
  };

  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, data, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (!error && data) setHistory(data);
    } catch {}
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const handleGoogleConnect = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/fastbilling`, scopes: "openid profile email", queryParams: { prompt: "select_account" } },
    });
  };

  const handleMicrosoftConnect = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: `${window.location.origin}/fastbilling`, scopes: "openid profile email User.Read" },
    });
  };

  const renderInvoice = () => {
    if (!invoice) return null;
    const st = STATUS_CONFIG[invoice.status];
    return (
      <div ref={invoiceRef} style={{ background: "#fff", color: "#18181b", fontFamily: tmpl.fontFamily, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
        <div style={{ background: tmpl.headerBg, color: "#fff", padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{invoice.emetteur}</div>
            {invoice.adresseEmetteur && <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>{invoice.adresseEmetteur}</div>}
            {invoice.emailEmetteur && <div style={{ fontSize: 11, opacity: .75 }}>✉ {invoice.emailEmetteur}</div>}
            {invoice.telEmetteur && <div style={{ fontSize: 11, opacity: .75 }}>📞 {invoice.telEmetteur}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, display: "inline-block", marginBottom: 8 }}>{fr ? st.label : st.labelEn}</div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: .9, marginBottom: 4 }}>{t.invoiceNum} {invoice.numero}</div>
            <div style={{ fontSize: 11, opacity: .7 }}>{t.date} : {invoice.date}</div>
            <div style={{ fontSize: 11, opacity: .7 }}>{t.dueDate} : {invoice.echeance}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ padding: "16px 28px", borderRight: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{t.from}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{invoice.emetteur}</div>
            {invoice.adresseEmetteur && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>{invoice.adresseEmetteur}</div>}
            {invoice.emailEmetteur && <div style={{ fontSize: 11, color: "#6b7280" }}>✉ {invoice.emailEmetteur}</div>}
            {invoice.telEmetteur && <div style={{ fontSize: 11, color: "#6b7280" }}>📞 {invoice.telEmetteur}</div>}
            {(invoice.neq || invoice.numTPS || invoice.numTVQ) && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: "#f9fafb", borderRadius: 6, fontSize: 10, color: "#6b7280", lineHeight: 1.8 }}>
                {invoice.neq    && <div>NEQ : {invoice.neq}</div>}
                {invoice.numTPS && <div>TPS/GST : {invoice.numTPS}</div>}
                {invoice.numTVQ && <div>TVQ/QST : {invoice.numTVQ}</div>}
              </div>
            )}
          </div>
          <div style={{ padding: "16px 28px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{t.billTo}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{invoice.client}</div>
            {invoice.adresseClient && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{invoice.adresseClient}</div>}
            {invoice.telClient && <div style={{ fontSize: 11, color: "#6b7280" }}>📞 {invoice.telClient}</div>}
            {invoice.emailClient && <div style={{ fontSize: 11, color: "#6b7280" }}>✉ {invoice.emailClient}</div>}
          </div>
        </div>

        <div style={{ padding: "18px 28px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tmpl.accentColor}` }}>
                <th style={{ textAlign: "left", padding: "6px 0", color: tmpl.accentColor, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{t.desc}</th>
                <th style={{ textAlign: "right", padding: "6px 0", color: tmpl.accentColor, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{t.unitPrice}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "14px 0", lineHeight: 1.6, color: "#374151", borderBottom: "1px solid #f3f4f6" }}>{invoice.description}</td>
                <td style={{ textAlign: "right", padding: "14px 0", fontWeight: 600, borderBottom: "1px solid #f3f4f6" }}>{fmt(invoice.montantHT)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 48, fontSize: 12, color: "#6b7280" }}>
              <span>{t.totalHT}</span><span style={{ fontWeight: 600, color: "#374151", minWidth: 80, textAlign: "right" }}>{fmt(invoice.montantHT)}</span>
            </div>
            {invoice.lignesTaxes.map((lt, i) => (
              <div key={i} style={{ display: "flex", gap: 48, fontSize: 12, color: "#6b7280" }}>
                <span>{lt.name} ({(lt.rate * 100).toFixed(lt.rate === 0.09975 ? 3 : 0)}%)</span>
                <span style={{ fontWeight: 600, color: "#374151", minWidth: 80, textAlign: "right" }}>{fmt(lt.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 48, fontSize: 16, fontWeight: 900, color: tmpl.accentColor, marginTop: 8, paddingTop: 8, borderTop: `2px solid ${tmpl.accentColor}` }}>
              <span>{t.total}</span><span style={{ minWidth: 80, textAlign: "right" }}>{fmt(invoice.totalTTC)}</span>
            </div>
          </div>

          {invoice.conditions && (
            <div style={{ marginTop: 18, padding: "10px 14px", background: "#f0f9ff", borderRadius: 8, fontSize: 11, color: "#0369a1", lineHeight: 1.6, borderLeft: `3px solid ${tmpl.accentColor}` }}>
              <div style={{ fontWeight: 700, marginBottom: 3, fontSize: 10, textTransform: "uppercase", letterSpacing: .8 }}>{t.paymentTerms}</div>
              {invoice.conditions}
            </div>
          )}
          {invoice.notes && <div style={{ marginTop: 10, padding: "10px 14px", background: "#f9fafb", borderRadius: 8, fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>{invoice.notes}</div>}
          {invoice.status === "late" && <div style={{ marginTop: 14, padding: "10px 14px", background: "#fee2e2", borderRadius: 8, fontSize: 11, color: "#991b1b", fontWeight: 600 }}>{t.lateWarning}</div>}
        </div>

        <div style={{ background: "#f9fafb", borderTop: "1px solid #f3f4f6", padding: "10px 28px", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>Généré par FastBilling · echosai.ca/fastbilling</div>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>{cs} {currency} · {taxRule.label}</div>
        </div>
      </div>
    );
  };

  const isPaidTier = userTier && userTier !== "free" && userTier !== "connected_free";

  return (
    <div style={{ background: bg, color: txt, minHeight: "100dvh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── HEADER BLANC UNIFIÉ AVEC BOUTON RETOUR AUX OUTILS BRILLANT ── */}
      <header className="border-b border-zinc-100 bg-white text-zinc-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center relative">
          
          <div className="flex items-center gap-6">
            <Link href="/outil" className="text-sm font-mono font-black tracking-[0.25em] text-zinc-900 uppercase">
              ECHOSAI
            </Link>
            
            <Link
              href="/outil"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all hover:scale-105 active:scale-95"
            >
              <span>⚡</span>
              <span>{fr ? "RETOUR AUX OUTILS" : "BACK TO TOOLS"}</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono relative">
            
            {/* SÉLECTEUR DE DEVISE */}
            <div className="flex border border-zinc-300 rounded-lg overflow-hidden font-mono text-[10px] bg-zinc-100">
              {(["CAD", "USD", "EUR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-1 font-bold transition-colors ${currency === c ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"}`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* BADGE PREMIUM OU BOUTON DE VENTE */}
            {isPaidTier ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-950/30 text-emerald-400 font-mono shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-[11px] uppercase tracking-wider">
                  {fr ? "✓ PLAN PREMIUM ACTIF" : "✓ PREMIUM ACTIVE"}
                </span>
              </div>
            ) : (
              <div 
                onClick={() => setShowPremiumModal(true)} 
                className="cursor-pointer flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-zinc-900 text-white shadow-lg hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
              >
                <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm animate-pulse">
                  ★ ECHOAI PREMIUM ({PRICES[currency].symbol}{PRICES[currency].amount})
                </span>
              </div>
            )}

            {/* LANGUES */}
            <div className="flex border border-zinc-200 rounded-lg overflow-hidden font-mono text-[10px]">
              <button onClick={() => setGlobalLang("fr")} className={`px-2 py-1 ${fr ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400"}`}>FR</button>
              <button onClick={() => setGlobalLang("en")} className={`px-2 py-1 ${!fr ? "bg-zinc-900 text-white font-bold" : "bg-zinc-50 text-zinc-400"}`}>EN</button>
            </div>

            {/* THEME TOGGLE */}
            <button onClick={() => setDark(d => !d)} className="px-2.5 py-1 border border-zinc-300 rounded-lg text-zinc-700 font-bold bg-zinc-100 hover:bg-zinc-200">
              {dark ? "☀" : "☾"}
            </button>

            {/* PROFIL & CONNEXION */}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200 font-mono">
                  🟢 {user.email}
                </span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-[11px] text-red-500 hover:text-red-700 transition-colors uppercase font-bold"
                >
                  [ {fr ? "Déconnexion" : "Sign Out"} ]
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSignInModal(true)}
                className="px-4 py-2 border border-zinc-900 text-zinc-900 rounded-xl hover:bg-zinc-900 hover:text-white transition-all font-bold tracking-tight shadow-sm"
              >
                {fr ? "Connexion" : "Sign In"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── ZONE CENTRALE FASTBILLING ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px 60px" }}>
        
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:8 }}>
            <img src="/echo1.png" alt="Echo AI" style={{ width:32, height:32, borderRadius:8, objectFit:"cover" }} />
            <h1 style={{ fontWeight: 900, fontSize: "clamp(22px,3.8vw,30px)", letterSpacing: -.5, lineHeight: 1.15 }}>{t.tagline}</h1>
          </div>
          <p style={{ fontSize: 13, color: muted }}>{t.sub}</p>
        </div>

        {/* FORMULAIRE DE CRÉATION DE FACTURE */}
        <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>

          <div style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: muted, lineHeight: 1.6 }}>
            {t.hint}
          </div>

          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            required
            rows={9}
            placeholder={t.placeholder}
            style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 12, padding: "14px", fontSize: 12, color: txt, outline: "none", resize: "vertical", fontFamily: "monospace", lineHeight: 1.7 }}
            onFocus={e => (e.target.style.borderColor = acc)}
            onBlur={e => (e.target.style.borderColor = bord)}
          />

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}
              style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 9, padding: "8px 12px", fontSize: 12, color: txt, cursor: "pointer", outline: "none", fontWeight: 700 }}>
              <option value="CAD">🇨🇦 CAD</option>
              <option value="USD">🇺🇸 USD</option>
              <option value="EUR">🇪🇺 EUR</option>
            </select>

            <select value={status} onChange={e => setStatus(e.target.value as Status)}
              style={{ background: STATUS_CONFIG[status].bg, border: `1px solid ${bord}`, borderRadius: 9, padding: "8px 12px", fontSize: 12, color: STATUS_CONFIG[status].color, cursor: "pointer", outline: "none", fontWeight: 700 }}>
              <option value="pending">{fr ? "En attente" : "Pending"}</option>
              <option value="paid">{fr ? "Payée" : "Paid"}</option>
              <option value="late">{fr ? "En retard" : "Overdue"}</option>
            </select>

            {(Object.entries(FONT_TEMPLATES) as [FontTemplate, typeof FONT_TEMPLATES[FontTemplate]][]).map(([key, val]) => (
              <button key={key} type="button" onClick={() => setFontTemplate(key)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `2px solid ${fontTemplate === key ? acc : bord}`, background: fontTemplate === key ? (dark ? "#2d2b28" : "#fff8f2") : surf2, cursor: "pointer", fontSize: 11, fontWeight: fontTemplate === key ? 700 : 500, color: fontTemplate === key ? acc : txt }}>
                <span style={{ fontFamily: val.fontFamily, fontSize: 13, fontWeight: 900, color: val.accentColor }}>{val.preview}</span>
                {val.label}
              </button>
            ))}
          </div>

          <button type="submit" disabled={loading}
            style={{ background: loading ? muted : acc, color: "#fff", border: "none", borderRadius: 12, padding: "14px 0", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 15px rgba(224,123,57,.3)" }}>
            {loading
              ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                  {t.generating}
                </span>
              : t.generate}
          </button>
        </form>

        {/* FACTURE GÉNÉRÉE */}
        {invoice && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: .8 }}>Aperçu — {invoice.numero}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => user ? handleExport("pdf") : setShowSignInModal(true)}
                  style={{ background: user ? "#dc2626" : muted, color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {user ? "⬇ PDF" : `🔒 PDF`}
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{ background: saving ? muted : "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "…" : "💾 Sauvegarder"}
                </button>
                {savedMsg && <span style={{ fontSize: 12, color: savedMsg.startsWith("✅") ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{savedMsg}</span>}
              </div>
            </div>

            <div style={{ position: "relative" }}>
              {renderInvoice()}
              {!user && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: `linear-gradient(to bottom, transparent, ${dark?"rgba(26,25,23,.97)":"rgba(240,236,228,.97)"})`, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 24, borderRadius: "0 0 12px 12px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: acc, marginBottom: 4 }}>
                      🔒 {fr ? "Connecte-toi pour exporter" : "Sign in to export"}
                    </div>
                    <div style={{ fontSize: 12, color: muted, marginBottom: 12 }}>
                      {fr ? "PDF · DOCX · Sauvegarde automatique" : "PDF · DOCX · Auto-save"}
                    </div>
                    <button onClick={() => setShowSignInModal(true)}
                      style={{ background: acc, color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 12px rgba(224,123,57,.4)" }}>
                      {fr ? "Créer un compte gratuit →" : "Create a free account →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORIQUE DE FACTURES */}
        {user && (
          <div style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 12, overflow: "hidden", marginTop: 24 }}>
            <button onClick={() => { setShowHistory(h => !h); if (!showHistory) loadHistory(); }}
              style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: txt, fontWeight: 700, fontSize: 13 }}>
              <span>📋 {fr ? "Mes factures enregistrées" : "My saved invoices"}</span>
              <span style={{ fontSize: 10, color: muted }}>{showHistory ? "▲" : "▼"}</span>
            </button>
            {showHistory && (
              <div style={{ borderTop: `1px solid ${bord}`, maxHeight: 300, overflowY: "auto" }}>
                {loadingHistory && <div style={{ padding: "12px", fontSize: 12, color: muted }}>Chargement…</div>}
                {!loadingHistory && history.length === 0 && (
                  <div style={{ padding: "12px", fontSize: 12, color: muted }}>{fr ? "Aucune facture sauvegardée." : "No saved invoices."}</div>
                )}
                {history.map((row) => (
                  <div key={row.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${bord}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.data?.emetteur || row.id}
                      </div>
                      <div style={{ fontSize: 10, color: muted }}>{row.id}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setInvoice(row.data); setShowHistory(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        style={{ background: acc, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        ↩ Voir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── MODALE OFFRE UNIFIÉE ECHOAI PREMIUM (3,99$) ── */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99999] p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100 text-center relative">
            <button type="button" onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm p-1 cursor-pointer">✕</button>

            <div className="text-4xl mb-3">⚡</div>
            <h2 className="text-lg font-black text-white uppercase font-mono mb-1">
              {fr ? "Abonnement EchoAI Premium" : "EchoAI Premium Subscription"}
            </h2>
            <p className="text-xs text-zinc-400 mb-4 font-sans">
              {fr
                ? "Débloquez l'accès illimité à l'ensemble des modules d'intelligence artificielle."
                : "Unlock unlimited access to all artificial intelligence modules."}
            </p>

            <div className="flex justify-center gap-2 mb-4 font-mono text-xs">
              {(["CAD", "USD", "EUR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                    currency === c
                      ? "bg-amber-500 text-zinc-950 border-amber-400"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  {c} ({PRICES[c].symbol})
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-amber-400 font-bold text-xs font-mono uppercase">★ ECHOAI PREMIUM</span>
                <span className="text-white font-black text-sm font-mono">
                  {PRICES[currency].symbol}{PRICES[currency].amount}/{fr ? "mois" : "mo"}
                </span>
              </div>
              <ul className="text-zinc-300 text-xs space-y-2 font-mono">
                <li className="flex items-center gap-2 text-emerald-400">✓ <strong>Accès Illimité</strong> à tous les outils EchoAI</li>
                <li className="flex items-center gap-2 text-emerald-400">✓ Génération haute vitesse prioritaire</li>
                <li className="flex items-center gap-2 text-zinc-400">✓ Sauvegarde permanente de vos projets</li>
              </ul>
            </div>

            <button
              onClick={handleStripeCheckout}
              disabled={isCheckoutLoading}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 transition-all shadow-[0_0_25px_rgba(245,158,11,0.3)] cursor-pointer disabled:opacity-50"
            >
              {isCheckoutLoading
                ? (fr ? "CHARGEMENT DE STRIPE..." : "LOADING STRIPE...")
                : (fr ? `Activer EchoAI Premium (${PRICES[currency].symbol}${PRICES[currency].amount}/mois)` : `Activate EchoAI Premium (${PRICES[currency].symbol}${PRICES[currency].amount}/mo)`)}
            </button>
          </div>
        </div>
      )}

      {/* ── MODALE CONNEXION ── */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold">{fr ? "Connexion Requise" : "Authentication Required"}</h2>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {fr ? "Connectez-vous pour exporter et sauvegarder vos factures." : "Sign in to export and save your invoices."}
                </p>
              </div>
              <button type="button" onClick={() => setShowSignInModal(false)} className="text-zinc-400 hover:text-white text-sm p-1 cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button type="button" onClick={handleGoogleConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                <GoogleLogo /><span className="text-white text-[9px] font-bold">GOOGLE</span>
              </button>
              <button type="button" onClick={handleMicrosoftConnect} className="flex items-center justify-center gap-2 px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 cursor-pointer">
                <MicrosoftLogo /><span className="text-white text-[9px] font-bold">MICROSOFT</span>
              </button>
            </div>

            <div className="h-px bg-zinc-900 my-3" />

            <div className="space-y-3">
              <input
                type="email"
                placeholder="nom@domaine.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
              />
              <input
                type="password"
                placeholder="••••••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
              />
              {authError && <p className="text-red-400 text-xs font-mono">⚠️ {authError}</p>}

              <button
                onClick={async () => {
                  setAuthError(null);
                  const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
                  if (error) setAuthError(error.message);
                  else setShowSignInModal(false);
                }}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                {fr ? "Se connecter" : "Log in"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea, input, select { font-family: inherit; }
      `}</style>
    </div>
  );
}