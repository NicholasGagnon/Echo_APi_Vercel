"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Lang = "fr" | "en";
type Currency = "CAD" | "USD" | "EUR";
type Status = "pending" | "paid" | "late";
type FontTemplate = "modern" | "classic" | "minimal" | "bold" | "elegant";

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
    devise: "Devise",
    status: "Statut",
    template: "Style",
    generate: "Générer la facture",
    generating: "L'IA prépare ta facture…",
    exportDocx: "⬇ DOCX",
    exportPdf: "⬇ PDF",
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
    connected: "Connecté", myAccount: "Mon compte", logout: "Se déconnecter",
    signin: "Se connecter", signup: "Créer un compte",
    modalSignin: "🛸 Connexion", modalSignup: "🛸 Créer un compte",
    submitSignin: "Se connecter", submitSignup: "Créer mon compte",
    switchToSignup: "Pas de compte ? Créer", switchToSignin: "Déjà un compte ?",
    donTitle: "Soutenir FastBilling", donDesc: "Outil gratuit. Un don maintient le service en ligne.",
    donBtn: "Faire un don ▼", donClose: "Fermer ▲",
    dark: "☾", light: "☀",
  },
  en: {
    tagline: "⚡ A pro invoice in 30 seconds.",
    sub: "Describe your situation in plain language. AI generates the full invoice.",
    placeholder: EXAMPLE_EN,
    hint: "💡 Include: your company name & address, client name & address, service description, amount, status (paid / pending / overdue). AI handles the rest.",
    devise: "Currency",
    status: "Status",
    template: "Style",
    generate: "Generate invoice",
    generating: "AI is preparing your invoice…",
    exportDocx: "⬇ DOCX",
    exportPdf: "⬇ PDF",
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
    connected: "Connected", myAccount: "My account", logout: "Sign out",
    signin: "Sign in", signup: "Create account",
    modalSignin: "🛸 Sign In", modalSignup: "🛸 Create Account",
    submitSignin: "Sign in", submitSignup: "Create my account",
    switchToSignup: "No account? Create one", switchToSignin: "Already have an account?",
    donTitle: "Support FastBilling", donDesc: "Free tool. A donation keeps it running.",
    donBtn: "Donate ▼", donClose: "Close ▲",
    dark: "☾", light: "☀",
  },
};

const DONATION_PLANS = [
  { name: "Avantage",  nameEn: "Advantage", amount: "$5.99",  plan: "basic",   desc: "Un café",          descEn: "A coffee" },
  { name: "Premium",   nameEn: "Premium",   amount: "$9.99",  plan: "premium", desc: "Vrai soutien",     descEn: "Real support" },
  { name: "Ultra",     nameEn: "Ultra",     amount: "$19.99", plan: "ultra",   desc: "Généreux 💛",      descEn: "Generous 💛" },
  { name: "Fondateur", nameEn: "Founder",   amount: "$99",    plan: "founder", desc: "Tu crois en nous", descEn: "You believe in us" },
];

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
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Lang>("fr");
  const [showLang, setShowLang] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [donOpen, setDonOpen] = useState(false);
  const [donLoading, setDonLoading] = useState<string | null>(null);
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  const [freeText, setFreeText] = useState("");
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [status, setStatus] = useState<Status>("pending");
  const [fontTemplate, setFontTemplate] = useState<FontTemplate>("modern");
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = T[lang];
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
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUser(data.user); });
    const { data: l } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    // Restaurer le brouillon après redirection OAuth
    const draft = localStorage.getItem("fb_draft");
    if (draft) { setFreeText(draft); localStorage.removeItem("fb_draft"); }
    return () => l.subscription.unsubscribe();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeText.trim()) return;

    setLoading(true); setInvoice(null);

    const now = new Date();
    const dateStr = now.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA");
    const due = new Date(now); due.setDate(due.getDate() + 30);
    const dueStr = due.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA");
    const numero = `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*9000)+1000)}`;

    try {
      const res = await fetch(`${api}/1/generate-invoice`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeText, currency, status, lang, numero, dateStr, dueStr }),
      });
      const data = await res.json();

      const montantHT = parseFloat(data.montantHT) || 0;
      const lignesTaxes = taxRule.lines.map(l => ({ ...l, amount: montantHT * l.rate }));
      const totalTTC = montantHT + lignesTaxes.reduce((s, l) => s + l.amount, 0);

      setInvoice({
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
      });
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

    // DOCX — reste via Flask
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

  const handleDon = async (plan: string) => {
    setDonLoading(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId: user?.id || "guest_don", userEmail: user?.email || "don@echosai.ca", currency: "CAD" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { alert("Erreur Stripe."); } finally { setDonLoading(null); }
  };

  const saveBeforeRedirect = () => { if (freeText.trim()) localStorage.setItem("fb_draft", freeText); };
  const handleGoogle    = async () => { saveBeforeRedirect(); await supabase.auth.signInWithOAuth({ provider: "google",  options: { redirectTo: `${window.location.origin}/fastbilling`, scopes: "openid profile email", queryParams: { prompt: "select_account" } } }); };
  const handleMicrosoft = async () => { saveBeforeRedirect(); await supabase.auth.signInWithOAuth({ provider: "azure",   options: { redirectTo: `${window.location.origin}/fastbilling`, scopes: "openid profile email User.Read" } }); };
  const handleLogout    = async () => { await supabase.auth.signOut(); setUser(null); setShowUserMenu(false); };

  // ── SAUVEGARDE SUPABASE ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!invoice) return;
    if (!user) {
      setEmailMode("signin");
      setAuthError(null);
      setAuthSuccess(lang === "fr"
        ? "Connecte-toi pour sauvegarder tes factures."
        : "Sign in to save your invoices.");
      setShowEmailModal(true);
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
      setSavedMsg(lang === "fr" ? "✅ Facture sauvegardée !" : "✅ Invoice saved!");
      setTimeout(() => setSavedMsg(null), 3000);
      loadHistory();
    } catch (e: any) {
      setSavedMsg(lang === "fr" ? "❌ Erreur de sauvegarde." : "❌ Save failed.");
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

  const handleLoadInvoice = (row: any) => {
    setInvoice(row.data);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteInvoice = async (id: string) => {
    await supabase.from("invoices").delete().eq("id", id).eq("user_id", user?.id);
    loadHistory();
  };

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(null); setAuthSuccess(null);
    if (emailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      if (error) setAuthError(error.message); else { setShowEmailModal(false); router.push("/fastbilling"); }
    } else {
      const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { emailRedirectTo: `${window.location.origin}/fastbilling` } });
      if (error) setAuthError(error.message);
      else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) setAuthError("Compte existant.");
      else setAuthSuccess(lang === "fr" ? "Vérifiez votre boîte mail !" : "Check your inbox!");
    }
  };

  const btn = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    width: "100%", padding: "8px 10px", border: `1px solid ${bord}`,
    borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 600,
    background: surf2, color: txt, ...extra,
  });

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
            <div style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, display: "inline-block", marginBottom: 8 }}>{lang === "fr" ? st.label : st.labelEn}</div>
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

  return (
    <div style={{ background: bg, color: txt, minHeight: "100dvh", fontFamily: "'Inter', system-ui, sans-serif", transition: "background .3s, color .3s" }}>
      <div className="fb-layout" style={{ display: "grid", gridTemplateColumns: "180px 1fr 180px", maxWidth: 1200, margin: "0 auto", padding: "0 10px", minHeight: "100dvh" }}>

        {/* COL GAUCHE */}
        <aside className="fb-col-left" style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 10, paddingRight: 10 }}>
          {[
            { href: "https://echosai.ca/avis",    src: "/avis.png",     label: "AVIS PRODUITS →", bg: acc, color: "#fff" },
            { href: "https://echosai.ca/welcome", src: "/pub.jpg",      label: "ECHO AI →",       bg: "#18181b", color: "#fff" },
            { href: "https://echosai.ca/1/hall",  src: "/affinity.jpg", label: "AFFINITY HALL →", bg: surf2, color: muted },
            { href: "https://echosai.ca/2/talk",  src: "/commun.png",   label: "", bg: "transparent", color: "#fff" },
          ].map((p, i) => (
            <a key={i} href={p.href} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", borderRadius: 12, overflow: "hidden", border: `1px solid ${bord}` }}
              onMouseEnter={e => (e.currentTarget.style.opacity = ".9")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              <img src={p.src} alt="" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: i === 0 ? 999 : 70 }} />
              {p.label && <div style={{ background: p.bg, color: p.color, textAlign: "center", fontSize: 9, fontWeight: 800, padding: "4px 0", letterSpacing: 1 }}>{p.label}</div>}
            </a>
          ))}
        </aside>

        {/* CENTRE */}
        <div className="fb-col-centre" style={{ display: "flex", flexDirection: "column", padding: "14px 14px 10px" }}>
          <div style={{ marginBottom: 14 }}>
            <h1 style={{ fontWeight: 900, fontSize: 22, letterSpacing: -.5, lineHeight: 1.15, marginBottom: 3 }}>{t.tagline}</h1>
            <p style={{ fontSize: 12, color: muted }}>{t.sub}</p>
          </div>

          {/* Pubs mobile */}
          <div className="fb-mobile-pubs" style={{ display: "none", gap: 8, marginBottom: 12 }}>
            <a href="https://echosai.ca/avis" target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "block", borderRadius: 10, overflow: "hidden", border: `1px solid ${bord}`, textDecoration: "none" }}>
              <img src="/avis.png" alt="" style={{ width: "100%", display: "block", maxHeight: 75, objectFit: "cover" }} />
              <div style={{ background: acc, color: "#fff", textAlign: "center", fontSize: 9, fontWeight: 800, padding: "4px 0" }}>AVIS →</div>
            </a>
            <a href="https://echosai.ca/2/talk" target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "block", borderRadius: 10, overflow: "hidden", border: `1px solid ${bord}`, textDecoration: "none" }}>
              <img src="/commun.png" alt="" style={{ width: "100%", display: "block", maxHeight: 75, objectFit: "cover" }} />
            </a>
          </div>

          <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>

            {/* Hint */}
            <div style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 10, padding: "10px 13px", fontSize: 11, color: muted, lineHeight: 1.6 }}>
              {t.hint}
            </div>

            {/* Champ unique */}
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              required
              rows={10}
              placeholder={t.placeholder}
              style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 11, padding: "12px 14px", fontSize: 12, color: txt, outline: "none", resize: "vertical", fontFamily: "monospace", lineHeight: 1.7 }}
              onFocus={e => (e.target.style.borderColor = acc)}
              onBlur={e => (e.target.style.borderColor = bord)}
            />

            {/* Devise + Statut + Style */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}
                style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 9, padding: "7px 10px", fontSize: 12, color: txt, cursor: "pointer", outline: "none" }}>
                <option value="CAD">🇨🇦 CAD</option>
                <option value="USD">🇺🇸 USD</option>
                <option value="EUR">🇪🇺 EUR</option>
              </select>

              <select value={status} onChange={e => setStatus(e.target.value as Status)}
                style={{ background: STATUS_CONFIG[status].bg, border: `1px solid ${bord}`, borderRadius: 9, padding: "7px 10px", fontSize: 12, color: STATUS_CONFIG[status].color, cursor: "pointer", outline: "none", fontWeight: 700 }}>
                <option value="pending">{lang === "fr" ? "En attente" : "Pending"}</option>
                <option value="paid">{lang === "fr" ? "Payée" : "Paid"}</option>
                <option value="late">{lang === "fr" ? "En retard" : "Overdue"}</option>
              </select>

              {(Object.entries(FONT_TEMPLATES) as [FontTemplate, typeof FONT_TEMPLATES[FontTemplate]][]).map(([key, val]) => (
                <button key={key} type="button" onClick={() => setFontTemplate(key)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: `2px solid ${fontTemplate === key ? acc : bord}`, background: fontTemplate === key ? (dark ? "#2d2b28" : "#fff8f2") : surf2, cursor: "pointer", fontSize: 11, fontWeight: fontTemplate === key ? 700 : 500, color: fontTemplate === key ? acc : txt }}>
                  <span style={{ fontFamily: val.fontFamily, fontSize: 13, fontWeight: 900, color: val.accentColor }}>{val.preview}</span>
                  {val.label}
                </button>
              ))}
            </div>

            <button type="submit" disabled={loading}
              style={{ background: loading ? muted : acc, color: "#fff", border: "none", borderRadius: 11, padding: "12px 0", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                    {t.generating}
                  </span>
                : t.generate}
            </button>
          </form>

          {invoice && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: .8 }}>Aperçu — {invoice.numero}</div>
                <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                  <button onClick={() => user ? handleExport("docx") : setShowAuthPopup(true)}
                    style={{ background: user ? "#2563eb" : muted, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: user ? 1 : .7 }}
                    title={!user ? (lang === "fr" ? "Connexion requise" : "Sign in required") : ""}>
                    {user ? t.exportDocx : `🔒 ${lang === "fr" ? "DOCX" : "DOCX"}`}
                  </button>
                  <button onClick={() => user ? handleExport("pdf") : setShowAuthPopup(true)}
                    style={{ background: user ? "#dc2626" : muted, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: user ? 1 : .7 }}
                    title={!user ? (lang === "fr" ? "Connexion requise" : "Sign in required") : ""}>
                    {user ? t.exportPdf : `🔒 ${lang === "fr" ? "PDF" : "PDF"}`}
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ background: saving ? muted : "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "…" : "💾"}
                  </button>
                  {savedMsg && <span style={{ fontSize: 11, color: savedMsg.startsWith("✅") ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{savedMsg}</span>}
                </div>
              </div>
              <div style={{ position: "relative" }}>
              {renderInvoice()}
              {/* Overlay freemium sur le bas */}
              {!user && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: `linear-gradient(to bottom, transparent, ${dark?"rgba(26,25,23,.97)":"rgba(240,236,228,.97)"})`, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 20, borderRadius: "0 0 12px 12px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: acc, marginBottom: 4 }}>
                      🔒 {lang === "fr" ? "Connecte-toi pour exporter" : "Sign in to export"}
                    </div>
                    <div style={{ fontSize: 11, color: muted, marginBottom: 10 }}>
                      {lang === "fr" ? "PDF · DOCX · Sauvegarde automatique" : "PDF · DOCX · Auto-save"}
                    </div>
                    <button onClick={() => setShowAuthPopup(true)}
                      style={{ background: acc, color: "#fff", border: "none", borderRadius: 9, padding: "9px 22px", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 12px rgba(224,123,57,.4)" }}>
                      {lang === "fr" ? "Créer un compte gratuit →" : "Create a free account →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          )}

          <div style={{ marginTop: "auto", paddingTop: 10, fontSize: 10, color: muted, opacity: .5, textAlign: "center" }}>© FastBilling · echosai.ca/fastbilling
          <a href="mailto:support@echosai.ca"
            style={{ color: muted, textDecoration: "none", fontSize: 10, opacity: .6, display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 12 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}>
            ✉ support
          </a></div>
        </div>

        {/* COL DROITE */}
        <aside className="fb-col-right" style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8, paddingLeft: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setDark(d => !d)} style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13, color: muted, fontWeight: 700 }}>{dark ? t.light : t.dark}</button>
            <div style={{ position: "relative", flex: 1 }}>
              <button onClick={() => setShowLang(v => !v)} style={{ width: "100%", background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 11, color: txt, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{lang === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"}</span><span style={{ fontSize: 8, opacity: .6 }}>{showLang ? "▲" : "▼"}</span>
              </button>
              {showLang && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 9, overflow: "hidden", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}>
                  {(["fr", "en"] as Lang[]).map(l => (
                    <button key={l} onClick={() => { setLang(l); setShowLang(false); }} style={{ width: "100%", padding: "8px 10px", fontSize: 11, background: lang === l ? surf2 : "transparent", color: lang === l ? acc : txt, border: "none", cursor: "pointer", fontWeight: lang === l ? 700 : 500, textAlign: "left" }}>
                      {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {user && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowUserMenu(v => !v)} style={{ width: "100%", background: "#16a34a", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#86efac", display: "inline-block" }} />
                {t.connected}<span style={{ marginLeft: "auto", fontSize: 8, opacity: .7 }}>{showUserMenu ? "▲" : "▼"}</span>
              </button>
              {showUserMenu && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 9, overflow: "hidden", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}>
                  <a href="/account" style={{ display: "block", padding: "8px 12px", fontSize: 11, color: txt, textDecoration: "none", fontWeight: 600, borderBottom: `1px solid ${bord}` }} onMouseEnter={e => (e.currentTarget.style.background = surf2)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>👤 {t.myAccount}</a>
                  <button onClick={handleLogout} style={{ width: "100%", padding: "8px 12px", fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textAlign: "left" }} onMouseEnter={e => (e.currentTarget.style.background = surf2)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>↩ {t.logout}</button>
                </div>
              )}
            </div>
          )}

          <div style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 11, overflow: "hidden" }}>
            <div style={{ padding: "10px 12px 8px" }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>☕ {t.donTitle}</div>
              <div style={{ fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 10 }}>{t.donDesc}</div>
              <button onClick={() => setDonOpen(d => !d)} style={{ width: "100%", background: acc, color: "#fff", border: "none", borderRadius: 9, padding: "10px 0", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{donOpen ? t.donClose : t.donBtn}</button>
            </div>
            {donOpen && (
              <div style={{ borderTop: `1px solid ${bord}`, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                {DONATION_PLANS.map(d => (
                  <button key={d.plan} onClick={() => handleDon(d.plan)} disabled={donLoading === d.plan}
                    style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 7, padding: "7px 9px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: donLoading === d.plan ? .6 : 1, color: txt }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = acc)} onMouseLeave={e => (e.currentTarget.style.borderColor = bord)}>
                    <div><div style={{ fontSize: 13, fontWeight: 700 }}>{lang === "fr" ? d.name : d.nameEn}</div><div style={{ fontSize: 10, color: muted }}>{lang === "fr" ? d.desc : d.descEn}</div></div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: acc }}>{d.amount}</div>
                  </button>
                ))}
                <div style={{ fontSize: 9, color: muted, textAlign: "center" }}>🔒 Stripe</div>
              </div>
            )}
          </div>

          {!user && (
            <div style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 11, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 1 }}>Compte Echo</div>
              <button onClick={handleGoogle} style={{ ...btn({ background: "#fff", border: "1px solid #e5e7eb", color: "#374151" }) }}>
                <svg width="13" height="13" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
                Google
              </button>
              <button onClick={handleMicrosoft} style={{ ...btn({ background: dark ? "#2d2b28" : "#1a1917", border: "none", color: "#fff" }) }}>
                <svg width="13" height="13" viewBox="0 0 23 23" fill="none"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
                Microsoft
              </button>
              <button onClick={() => { setEmailMode("signin"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); }} style={{ ...btn({ background: "#0ea5e9", border: "none", color: "#fff" }) }}>✉ {t.signin}</button>
              <button onClick={() => { setEmailMode("signup"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); }} style={{ ...btn() }}>✦ {t.signup}</button>
            </div>
          )}
        {/* HISTORIQUE */}
          {user && (
            <div style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 11, overflow: "hidden" }}>
              <button onClick={() => { setShowHistory(h => !h); if (!showHistory) loadHistory(); }}
                style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: txt, fontWeight: 700, fontSize: 12 }}>
                <span>📋 {lang === "fr" ? "Mes factures" : "My invoices"}</span>
                <span style={{ fontSize: 9, color: muted }}>{showHistory ? "▲" : "▼"}</span>
              </button>
              {showHistory && (
                <div style={{ borderTop: `1px solid ${bord}`, maxHeight: 280, overflowY: "auto" }}>
                  {loadingHistory && <div style={{ padding: "10px 12px", fontSize: 11, color: muted }}>Chargement…</div>}
                  {!loadingHistory && history.length === 0 && (
                    <div style={{ padding: "10px 12px", fontSize: 11, color: muted }}>{lang === "fr" ? "Aucune facture sauvegardée." : "No saved invoices."}</div>
                  )}
                  {history.map((row) => (
                    <div key={row.id} style={{ padding: "8px 12px", borderBottom: `1px solid ${bord}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.data?.emetteur || row.id}
                        </div>
                        <div style={{ fontSize: 10, color: muted }}>{row.id}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => handleLoadInvoice(row)}
                          style={{ background: acc, color: "#fff", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          ↩
                        </button>
                        <button onClick={() => handleDeleteInvoice(row.id)}
                          style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* BARRE MOBILE */}
      <div className="fb-mobile-bar" style={{ "--surf": dark ? "#242220" : "#fffdf9", "--bord": dark ? "#3a3835" : "#e2ddd5" } as React.CSSProperties}>

        {/* Dark */}
        <button onClick={() => setDark(d => !d)}
          style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "8px 11px", fontSize: 14, color: muted, fontWeight: 700, cursor: "pointer" }}>
          {dark ? t.light : t.dark}
        </button>

        {/* Langue */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowLang(v => !v)}
            style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "8px 11px", fontSize: 12, color: txt, fontWeight: 700, cursor: "pointer" }}>
            {lang === "fr" ? "🇫🇷" : "🇬🇧"} {showLang ? "▲" : "▼"}
          </button>
          {showLang && (
            <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 9, overflow: "hidden", zIndex: 200, minWidth: 130, boxShadow: "0 -4px 16px rgba(0,0,0,.15)" }}>
              {(["fr", "en"] as Lang[]).map(l => (
                <button key={l} onClick={() => { setLang(l); setShowLang(false); }}
                  style={{ width: "100%", padding: "10px 13px", fontSize: 12, background: lang === l ? surf2 : "transparent", color: lang === l ? acc : txt, border: "none", cursor: "pointer", fontWeight: lang === l ? 700 : 500, textAlign: "left" }}>
                  {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Don café — gros bouton central */}
        <div style={{ position: "relative", flex: 1, display: "flex", justifyContent: "center" }}>
          <button onClick={() => setDonOpen(d => !d)}
            style={{ background: acc, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(224,123,57,.4)" }}>
            ☕ {lang === "fr" ? "Don café" : "Buy coffee"}
          </button>
          {donOpen && (
            <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: surf, border: `1px solid ${bord}`, borderRadius: 14, padding: "14px", zIndex: 300, boxShadow: "0 -4px 28px rgba(0,0,0,.18)", minWidth: 260 }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", color: txt }}>
                ☕ {lang === "fr" ? "Soutenir FastBilling" : "Support FastBilling"}
                <button onClick={() => setDonOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 16, lineHeight: 1 }}>✕</button>
              </div>
              {DONATION_PLANS.map(d => (
                <button key={d.plan} onClick={() => { handleDon(d.plan); setDonOpen(false); }} disabled={donLoading === d.plan}
                  style={{ width: "100%", background: surf2, border: `1px solid ${bord}`, borderRadius: 9, padding: "9px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7, color: txt, opacity: donLoading === d.plan ? .6 : 1 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{lang === "fr" ? d.name : d.nameEn}</div>
                    <div style={{ fontSize: 10, color: muted }}>{lang === "fr" ? d.desc : d.descEn}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: acc }}>{d.amount}</div>
                </button>
              ))}
              <div style={{ fontSize: 10, color: muted, textAlign: "center", marginTop: 4 }}>🔒 Stripe</div>
            </div>
          )}
        </div>

        {/* Connexion / Compte */}
        {user ? (
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowUserMenu(v => !v)}
              style={{ background: "#16a34a", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#86efac", display: "inline-block" }} />
              {t.connected}
            </button>
            {showUserMenu && (
              <div style={{ position: "absolute", bottom: "calc(100% + 6px)", right: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 10, overflow: "hidden", zIndex: 200, minWidth: 150, boxShadow: "0 -4px 16px rgba(0,0,0,.15)" }}>
                <a href="/account" style={{ display: "block", padding: "9px 13px", fontSize: 12, color: txt, textDecoration: "none", fontWeight: 600, borderBottom: `1px solid ${bord}` }}>👤 {t.myAccount}</a>
                <button onClick={handleLogout} style={{ width: "100%", padding: "9px 13px", fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textAlign: "left" }}>↩ {t.logout}</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowUserMenu(v => !v)}
              style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, color: txt, fontWeight: 700, cursor: "pointer" }}>
              {t.signin} {showUserMenu ? "▲" : "▼"}
            </button>
            {showUserMenu && (
              <div style={{ position: "absolute", bottom: "calc(100% + 6px)", right: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 12, padding: "12px", zIndex: 200, minWidth: 200, boxShadow: "0 -4px 20px rgba(0,0,0,.15)", display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Google */}
                <button onClick={() => { handleGoogle(); setShowUserMenu(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#374151" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
                  Google
                </button>
                {/* Microsoft */}
                <button onClick={() => { handleMicrosoft(); setShowUserMenu(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "#1a1917", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#fff" }}>
                  <svg width="14" height="14" viewBox="0 0 23 23" fill="none"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
                  Microsoft
                </button>
                {/* Email */}
                <button onClick={() => { setEmailMode("signin"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); setShowUserMenu(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "#0ea5e9", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#fff" }}>
                  ✉ {t.signin}
                </button>
                <button onClick={() => { setEmailMode("signup"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); setShowUserMenu(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: surf2, border: `1px solid ${bord}`, borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, color: txt }}>
                  ✦ {t.signup}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── POPUP AUTH ──────────────────────────────────────────────────────── */}
      {showAuthPopup && (
        <div onClick={() => setShowAuthPopup(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(6px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 20, padding: "28px 28px 22px", width: 320, display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
            <button onClick={() => setShowAuthPopup(false)} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>✕</button>
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: txt, marginBottom: 4 }}>
                {lang === "fr" ? "Connecte-toi pour générer" : "Sign in to generate"}
              </div>
              <div style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>
                {lang === "fr"
                  ? "Un compte gratuit suffit. Tes factures sont sauvegardées."
                  : "A free account is enough. Your invoices are saved."}
              </div>
            </div>
            <button onClick={() => { handleGoogle(); setShowAuthPopup(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#374151", width: "100%" }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
              {lang === "fr" ? "Continuer avec Google" : "Continue with Google"}
            </button>
            <button onClick={() => { handleMicrosoft(); setShowAuthPopup(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: dark ? "#2d2b28" : "#1a1917", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff", width: "100%" }}>
              <svg width="16" height="16" viewBox="0 0 23 23" fill="none"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
              {lang === "fr" ? "Continuer avec Microsoft" : "Continue with Microsoft"}
            </button>
            <button onClick={() => { setEmailMode("signin"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); setShowAuthPopup(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#0ea5e9", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff", width: "100%" }}>
              ✉ {lang === "fr" ? "Se connecter par email" : "Sign in with email"}
            </button>
            <button onClick={() => { setEmailMode("signup"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); setShowAuthPopup(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: surf2, border: `1px solid ${bord}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: txt, width: "100%" }}>
              ✦ {lang === "fr" ? "Créer un compte gratuit" : "Create a free account"}
            </button>
            <div style={{ fontSize: 10, color: muted, textAlign: "center" }}>
              {lang === "fr" ? "Gratuit · Aucune carte requise" : "Free · No card required"}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EMAIL */}
      {showEmailModal && (
        <div onClick={() => setShowEmailModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 16, padding: "22px 26px", width: 300, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{emailMode === "signin" ? t.modalSignin : t.modalSignup}</div>
              <button onClick={() => setShowEmailModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 16 }}>✕</button>
            </div>
            {authError   && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#b91c1c" }}>⚠️ {authError}</div>}
            {authSuccess && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#15803d" }}>✓ {authSuccess}</div>}
            <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <input type="email" placeholder="nom@domaine.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "8px 11px", fontSize: 12, color: txt, outline: "none" }} />
              <input type="password" placeholder="••••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "8px 11px", fontSize: 12, color: txt, outline: "none" }} />
              <button type="submit" style={{ background: acc, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{emailMode === "signin" ? t.submitSignin : t.submitSignup}</button>
            </form>
            <button onClick={() => { setEmailMode(emailMode === "signin" ? "signup" : "signin"); setAuthError(null); setAuthSuccess(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 10, textDecoration: "underline" }}>{emailMode === "signin" ? t.switchToSignup : t.switchToSignin}</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea, input, select { font-family: inherit; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #c4bfb8; border-radius: 3px; }
        @media (max-width: 768px) {
          .fb-layout { grid-template-columns: 1fr !important; }
          .fb-col-left, .fb-col-right { display: none !important; }
          .fb-col-centre { padding: 12px 14px 80px !important; }
          .fb-mobile-bar { display: flex !important; }
          .fb-mobile-pubs { display: flex !important; }
        }
        @media (min-width: 769px) { .fb-mobile-bar { display: none !important; } }
        .fb-mobile-bar {
          position: fixed; bottom: 0; left: 0; right: 0; display: none;
          background: var(--surf, #fffdf9); border-top: 1px solid var(--bord, #e2ddd5);
          padding: 8px 14px 12px; gap: 8px; z-index: 50;
          align-items: center; justify-content: space-between;
        }
      `}</style>
    </div>
  );
}