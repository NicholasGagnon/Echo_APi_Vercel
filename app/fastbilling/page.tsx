"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Lang = "fr" | "en";
type Currency = "CAD" | "USD" | "EUR";
type Status = "pending" | "paid" | "late";
type FontTemplate = "modern" | "classic" | "minimal" | "bold" | "elegant";

// ── TAXES PAR DEVISE ────────────────────────────────────────────────────────
const TAX_RULES: Record<Currency, { label: string; lines: { name: string; rate: number }[] }> = {
  CAD: { label: "Canada", lines: [{ name: "TPS", rate: 0.05 }, { name: "TVQ", rate: 0.09975 }] },
  USD: { label: "États-Unis", lines: [{ name: "Sales Tax", rate: 0.0875 }] },
  EUR: { label: "France / Europe", lines: [{ name: "TVA", rate: 0.20 }] },
};

// ── TEMPLATES VISUELS ───────────────────────────────────────────────────────
const FONT_TEMPLATES: Record<FontTemplate, { label: string; fontFamily: string; accentColor: string; headerBg: string; preview: string }> = {
  modern:   { label: "Modern",   fontFamily: "'Inter', system-ui, sans-serif",        accentColor: "#2563eb", headerBg: "#1e3a5f", preview: "M" },
  classic:  { label: "Classic",  fontFamily: "'Georgia', 'Times New Roman', serif",   accentColor: "#7c3aed", headerBg: "#2d1b69", preview: "C" },
  minimal:  { label: "Minimal",  fontFamily: "'Helvetica Neue', Arial, sans-serif",   accentColor: "#18181b", headerBg: "#18181b", preview: "m" },
  bold:     { label: "Bold",     fontFamily: "'Arial Black', 'Helvetica', sans-serif", accentColor: "#dc2626", headerBg: "#7f1d1d", preview: "B" },
  elegant:  { label: "Elegant",  fontFamily: "'Palatino Linotype', 'Palatino', serif", accentColor: "#92400e", headerBg: "#451a03", preview: "E" },
};

const STATUS_CONFIG: Record<Status, { label: string; labelEn: string; color: string; bg: string }> = {
  pending: { label: "En attente",  labelEn: "Pending",    color: "#92400e", bg: "#fef3c7" },
  paid:    { label: "Payée",       labelEn: "Paid",       color: "#065f46", bg: "#d1fae5" },
  late:    { label: "En retard",   labelEn: "Overdue",    color: "#991b1b", bg: "#fee2e2" },
};

const T = {
  fr: {
    tagline: "Une facture pro en 30 secondes.",
    sub: "Décris ta prestation, choisis ton style. L'IA fait le reste.",
    descLabel: "Description de la prestation",
    descPh: "Ex : Développement site web, 3 pages + intégration — avril 2026",
    emetteur: "Votre nom / entreprise",
    client: "Nom du client",
    montant: "Montant HT",
    devise: "Devise",
    taxes: "Taxes incluses automatiquement",
    status: "Statut",
    template: "Style de facture",
    generate: "Générer la facture",
    generating: "Génération en cours…",
    exportDocx: "⬇ DOCX",
    exportPdf: "⬇ PDF",
    preview: "Aperçu",
    total: "Total TTC",
    invoiceNum: "Facture N°",
    date: "Date",
    dueDate: "Échéance",
    billTo: "Facturé à",
    from: "De la part de",
    desc: "Description",
    unitPrice: "Prix unitaire",
    subtotal: "Sous-total HT",
    totalHT: "Total HT",
    connected: "Connecté",
    myAccount: "Mon compte",
    logout: "Se déconnecter",
    signin: "Se connecter",
    signup: "Créer un compte",
    modalSignin: "🛸 Connexion",
    modalSignup: "🛸 Créer un compte",
    submitSignin: "Se connecter",
    submitSignup: "Créer mon compte",
    switchToSignup: "Pas de compte ? Créer",
    switchToSignin: "Déjà un compte ? Se connecter",
    dark: "☾", light: "☀",
    donTitle: "Soutenir FastBilling",
    donDesc: "Outil gratuit. Un don maintient le service en ligne.",
    donBtn: "Faire un don ▼",
    donClose: "Fermer ▲",
  },
  en: {
    tagline: "A pro invoice in 30 seconds.",
    sub: "Describe your service, pick a style. AI does the rest.",
    descLabel: "Service description",
    descPh: "Ex: Website development, 3 pages + integration — April 2026",
    emetteur: "Your name / company",
    client: "Client name",
    montant: "Amount (before tax)",
    devise: "Currency",
    taxes: "Taxes calculated automatically",
    status: "Status",
    template: "Invoice style",
    generate: "Generate invoice",
    generating: "Generating…",
    exportDocx: "⬇ DOCX",
    exportPdf: "⬇ PDF",
    preview: "Preview",
    total: "Total (incl. tax)",
    invoiceNum: "Invoice No.",
    date: "Date",
    dueDate: "Due date",
    billTo: "Bill to",
    from: "From",
    desc: "Description",
    unitPrice: "Unit price",
    subtotal: "Subtotal",
    totalHT: "Subtotal (excl. tax)",
    connected: "Connected",
    myAccount: "My account",
    logout: "Sign out",
    signin: "Sign in",
    signup: "Create account",
    modalSignin: "🛸 Sign In",
    modalSignup: "🛸 Create Account",
    submitSignin: "Sign in",
    submitSignup: "Create my account",
    switchToSignup: "No account? Create one",
    switchToSignin: "Already have an account?",
    dark: "☾", light: "☀",
    donTitle: "Support FastBilling",
    donDesc: "Free tool. A donation keeps it running.",
    donBtn: "Donate ▼",
    donClose: "Close ▲",
  },
};

const DONATION_PLANS = [
  { name: "Avantage",  nameEn: "Advantage", amount: "$5.99",  plan: "basic",   desc: "Un café",          descEn: "A coffee" },
  { name: "Premium",   nameEn: "Premium",   amount: "$9.99",  plan: "premium", desc: "Vrai soutien",     descEn: "Real support" },
  { name: "Ultra",     nameEn: "Ultra",     amount: "$19.99", plan: "ultra",   desc: "Généreux 💛",      descEn: "Generous 💛" },
  { name: "Fondateur", nameEn: "Founder",   amount: "$99",    plan: "founder", desc: "Tu crois en nous", descEn: "You believe in us" },
];

interface InvoiceData {
  numero: string;
  date: string;
  echeance: string;
  emetteur: string;
  client: string;
  description: string;
  montantHT: number;
  currency: Currency;
  status: Status;
  lignesTaxes: { name: string; rate: number; amount: number }[];
  totalTTC: number;
  notes: string;
}

export default function FastBillingPage() {
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Lang>("fr");
  const [showLang, setShowLang] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [donOpen, setDonOpen] = useState(false);
  const [donLoading, setDonLoading] = useState<string | null>(null);

  // Champs facture
  const [description, setDescription] = useState("");
  const [emetteur, setEmetteur] = useState("");
  const [client, setClient] = useState("");
  const [montant, setMontant] = useState("");
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [status, setStatus] = useState<Status>("pending");
  const [fontTemplate, setFontTemplate] = useState<FontTemplate>("modern");
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = T[lang];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUser(data.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const tmpl = FONT_TEMPLATES[fontTemplate];
  const taxRule = TAX_RULES[currency];

  // ── TOKENS ──────────────────────────────────────────────────────────────────
  const bg    = dark ? "#1a1917" : "#f0ece4";
  const surf  = dark ? "#242220" : "#fffdf9";
  const surf2 = dark ? "#2d2b28" : "#f5f1e8";
  const bord  = dark ? "#3a3835" : "#e2ddd5";
  const txt   = dark ? "#f0ece4" : "#1a1917";
  const muted = dark ? "#8a8680" : "#7a7570";
  const acc   = "#e07b39";

  const currencySymbol = currency === "EUR" ? "€" : "$";
  const formatAmount = (n: number) => `${currencySymbol}${n.toFixed(2)}`;

  // ── GÉNÉRATION ──────────────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !montant) return;
    setLoading(true); setError(null); setInvoice(null);

    const montantHT = parseFloat(montant) || 0;
    const lignesTaxes = taxRule.lines.map(l => ({ ...l, amount: montantHT * l.rate }));
    const totalTaxes = lignesTaxes.reduce((s, l) => s + l.amount, 0);
    const totalTTC = montantHT + totalTaxes;
    const now = new Date();
    const dateStr = now.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA");
    const due = new Date(now); due.setDate(due.getDate() + 30);
    const dueStr = due.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA");
    const numero = `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*9000)+1000)}`;

    // Appel API Flask via site2
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
    try {
      const res = await fetch(`${apiBase}/1/generate-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description, emetteur, client, montantHT, currency,
          status, lang, taxRule, totalTTC, numero, dateStr, dueStr,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setInvoice({
        numero,
        date: dateStr,
        echeance: dueStr,
        emetteur: data.emetteur || emetteur || "Mon Entreprise",
        client: data.client || client || "Client",
        description: data.description || description,
        montantHT,
        currency,
        status,
        lignesTaxes,
        totalTTC,
        notes: data.notes || "",
      });
    } catch (err: any) {
      // Fallback local sans IA
      setInvoice({
        numero, date: dateStr, echeance: dueStr,
        emetteur: emetteur || "Mon Entreprise",
        client: client || "Client",
        description, montantHT, currency, status,
        lignesTaxes, totalTTC, notes: "",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── EXPORT ──────────────────────────────────────────────────────────────────
  const handleExport = async (format: "docx" | "pdf") => {
    if (!invoice || !invoiceRef.current) return;
    const html = invoiceRef.current.innerHTML;
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
    try {
      const res = await fetch(`${apiBase}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, html, title: `Facture ${invoice.numero}` }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `facture-${invoice.numero}.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Erreur export, réessaie."); }
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

  const handleGoogle    = async () => { await supabase.auth.signInWithOAuth({ provider: "google",  options: { redirectTo: `${window.location.origin}/fastbilling`, scopes: "openid profile email", queryParams: { prompt: "select_account" } } }); };
  const handleMicrosoft = async () => { await supabase.auth.signInWithOAuth({ provider: "azure",   options: { redirectTo: `${window.location.origin}/fastbilling`, scopes: "openid profile email User.Read" } }); };
  const handleLogout    = async () => { await supabase.auth.signOut(); setUser(null); setShowUserMenu(false); };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(null); setAuthSuccess(null);
    if (emailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setAuthError(error.message); else { setShowEmailModal(false); router.push("/fastbilling"); }
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/fastbilling` } });
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

  // ── RENDU FACTURE ───────────────────────────────────────────────────────────
  const renderInvoice = () => {
    if (!invoice) return null;
    const st = STATUS_CONFIG[invoice.status];
    const stLabel = lang === "fr" ? st.label : st.labelEn;

    return (
      <div ref={invoiceRef} style={{ background: "#fff", color: "#18181b", fontFamily: tmpl.fontFamily, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
        {/* Header */}
        <div style={{ background: tmpl.headerBg, color: "#fff", padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -.5 }}>{invoice.emetteur}</div>
            <div style={{ fontSize: 11, opacity: .7, marginTop: 3 }}>{t.invoiceNum} {invoice.numero}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, display: "inline-block", marginBottom: 6 }}>{stLabel}</div>
            <div style={{ fontSize: 11, opacity: .7 }}>{t.date} : {invoice.date}</div>
            <div style={{ fontSize: 11, opacity: .7 }}>{t.dueDate} : {invoice.echeance}</div>
          </div>
        </div>

        {/* Émetteur → Client */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ padding: "18px 28px", borderRight: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{t.from}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{invoice.emetteur}</div>
          </div>
          <div style={{ padding: "18px 28px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{t.billTo}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{invoice.client}</div>
          </div>
        </div>

        {/* Tableau */}
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
                <td style={{ padding: "12px 0", lineHeight: 1.5, color: "#374151", borderBottom: "1px solid #f3f4f6" }}>{invoice.description}</td>
                <td style={{ textAlign: "right", padding: "12px 0", fontWeight: 600, borderBottom: "1px solid #f3f4f6" }}>{formatAmount(invoice.montantHT)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totaux */}
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 40, fontSize: 12, color: "#6b7280" }}>
              <span>{t.totalHT}</span><span style={{ fontWeight: 600, color: "#374151" }}>{formatAmount(invoice.montantHT)}</span>
            </div>
            {invoice.lignesTaxes.map((lt, i) => (
              <div key={i} style={{ display: "flex", gap: 40, fontSize: 12, color: "#6b7280" }}>
                <span>{lt.name} ({(lt.rate * 100).toFixed(lt.rate === 0.09975 ? 3 : 0)}%)</span>
                <span style={{ fontWeight: 600, color: "#374151" }}>{formatAmount(lt.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 40, fontSize: 15, fontWeight: 900, color: tmpl.accentColor, marginTop: 6, paddingTop: 6, borderTop: `2px solid ${tmpl.accentColor}` }}>
              <span>{t.total}</span><span>{formatAmount(invoice.totalTTC)}</span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div style={{ marginTop: 20, padding: "12px 14px", background: "#f9fafb", borderRadius: 8, fontSize: 11, color: "#6b7280", lineHeight: 1.6, borderLeft: `3px solid ${tmpl.accentColor}` }}>
              {invoice.notes}
            </div>
          )}

          {/* Pied */}
          {invoice.status === "late" && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#fee2e2", borderRadius: 8, fontSize: 11, color: "#991b1b", fontWeight: 600 }}>
              {lang === "fr" ? "⚠️ Cette facture est en retard de paiement. Des pénalités peuvent s'appliquer." : "⚠️ This invoice is overdue. Late fees may apply."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: "#f9fafb", borderTop: "1px solid #f3f4f6", padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>Généré par FastBilling · echosai.ca/fastbilling</div>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>{currencySymbol} {currency} · {taxRule.label}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: bg, color: txt, minHeight: "100dvh", fontFamily: "'Inter', system-ui, sans-serif", transition: "background .3s, color .3s" }}>
      <div className="fb-layout" style={{ display: "grid", gridTemplateColumns: "180px 1fr 180px", maxWidth: 1200, margin: "0 auto", padding: "0 10px", minHeight: "100dvh" }}>

        {/* ── COL GAUCHE : pubs ─────────────────────────────────────────────── */}
        <aside className="fb-col-left" style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 10, paddingRight: 10 }}>
          <a href="https://echosai.ca/avis" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", borderRadius: 12, overflow: "hidden", border: `1px solid ${bord}` }}
            onMouseEnter={e => (e.currentTarget.style.opacity = ".9")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <img src="/avis.png" alt="Anti-Bullshit Reviews" style={{ width: "100%", display: "block" }} />
            <div style={{ background: acc, color: "#fff", textAlign: "center", fontSize: 9, fontWeight: 800, padding: "5px 0", letterSpacing: 1 }}>
              AVIS PRODUITS →
            </div>
          </a>
          <a href="https://echosai.ca/welcome" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", borderRadius: 12, overflow: "hidden", border: `1px solid ${bord}` }}
            onMouseEnter={e => (e.currentTarget.style.opacity = ".9")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <img src="/pub.jpg" alt="Echo AI" style={{ width: "100%", display: "block" }} />
            <div style={{ background: "#18181b", color: "#fff", textAlign: "center", fontSize: 9, fontWeight: 800, padding: "5px 0", letterSpacing: 1 }}>
              ECHO AI →
            </div>
          </a>
          <a href="https://echosai.ca/1/hall" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", borderRadius: 12, overflow: "hidden", border: `1px solid ${bord}` }}
            onMouseEnter={e => (e.currentTarget.style.opacity = ".9")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <img src="/affinity.jpg" alt="Affinity Hall" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 70 }} />
            <div style={{ background: surf2, color: muted, textAlign: "center", fontSize: 9, fontWeight: 600, padding: "4px 0" }}>AFFINITY HALL →</div>
          </a>

          <a href="https://echosai.ca/2/talk" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", borderRadius: 12, overflow: "hidden", border: `1px solid ${bord}` }}
            onMouseEnter={e => (e.currentTarget.style.opacity = ".9")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <img src="/commun.png" alt="Commun" style={{ width: "100%", display: "block", objectFit: "cover" }} />
          </a>
        </aside>

        {/* ── CENTRE ────────────────────────────────────────────────────────── */}
        <div className="fb-col-centre" style={{ display: "flex", flexDirection: "column", padding: "14px 14px 10px" }}>

          {/* Accroche */}
          <div style={{ marginBottom: 14 }}>
            <h1 style={{ fontWeight: 900, fontSize: 22, letterSpacing: -.5, lineHeight: 1.15, marginBottom: 3 }}>⚡ {t.tagline}</h1>
            <p style={{ fontSize: 12, color: muted }}>{t.sub}</p>
          </div>

          {/* Pubs mobile */}
          <div className="fb-mobile-pubs" style={{ display: "none", gap: 8, marginBottom: 12 }}>
            <a href="https://echosai.ca/avis" target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: "block", borderRadius: 10, overflow: "hidden", border: `1px solid ${bord}`, textDecoration: "none" }}>
              <img src="/avis.png" alt="Avis" style={{ width: "100%", display: "block", maxHeight: 75, objectFit: "cover" }} />
              <div style={{ background: acc, color: "#fff", textAlign: "center", fontSize: 9, fontWeight: 800, padding: "4px 0" }}>AVIS →</div>
            </a>
            <a href="https://echosai.ca/welcome" target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: "block", borderRadius: 10, overflow: "hidden", border: `1px solid ${bord}`, textDecoration: "none" }}>
              <img src="/pub.jpg" alt="Echo AI" style={{ width: "100%", display: "block", maxHeight: 75, objectFit: "cover", objectPosition: "top" }} />
              <div style={{ background: "#18181b", color: "#fff", textAlign: "center", fontSize: 9, fontWeight: 800, padding: "4px 0" }}>ECHO AI →</div>
            </a>
          </div>
          <a href="https://echosai.ca/2/talk" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", borderRadius: 10, overflow: "hidden", border: `1px solid ${bord}`, textDecoration: "none", marginBottom: 10 }}>
            <img src="/commun.png" alt="Commun" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 60 }} />
          </a>

          {/* Formulaire */}
          <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>

            {/* Description */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>{t.descLabel}</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} required placeholder={t.descPh} rows={2}
                style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 10, padding: "9px 12px", fontSize: 12, color: txt, outline: "none", resize: "none", fontFamily: "inherit" }}
                onFocus={e => (e.target.style.borderColor = acc)} onBlur={e => (e.target.style.borderColor = bord)} />
            </div>

            {/* Ligne 2 : émetteur + client */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>{t.emetteur}</label>
                <input value={emetteur} onChange={e => setEmetteur(e.target.value)} placeholder="Votre nom" type="text"
                  style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 9, padding: "8px 11px", fontSize: 12, color: txt, outline: "none" }}
                  onFocus={e => (e.target.style.borderColor = acc)} onBlur={e => (e.target.style.borderColor = bord)} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>{t.client}</label>
                <input value={client} onChange={e => setClient(e.target.value)} placeholder="Nom client" type="text"
                  style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 9, padding: "8px 11px", fontSize: 12, color: txt, outline: "none" }}
                  onFocus={e => (e.target.style.borderColor = acc)} onBlur={e => (e.target.style.borderColor = bord)} />
              </div>
            </div>

            {/* Ligne 3 : montant + devise + statut */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>{t.montant}</label>
                <input value={montant} onChange={e => setMontant(e.target.value)} placeholder="0.00" type="number" min="0" step="0.01" required
                  style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 9, padding: "8px 11px", fontSize: 12, color: txt, outline: "none" }}
                  onFocus={e => (e.target.style.borderColor = acc)} onBlur={e => (e.target.style.borderColor = bord)} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>{t.devise}</label>
                <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}
                  style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 9, padding: "8px 10px", fontSize: 12, color: txt, cursor: "pointer", outline: "none" }}>
                  <option value="CAD">🇨🇦 CAD</option>
                  <option value="USD">🇺🇸 USD</option>
                  <option value="EUR">🇪🇺 EUR</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>{t.status}</label>
                <select value={status} onChange={e => setStatus(e.target.value as Status)}
                  style={{ background: STATUS_CONFIG[status].bg, border: `1px solid ${bord}`, borderRadius: 9, padding: "8px 10px", fontSize: 12, color: STATUS_CONFIG[status].color, cursor: "pointer", outline: "none", fontWeight: 700 }}>
                  <option value="pending">{lang === "fr" ? "En attente" : "Pending"}</option>
                  <option value="paid">{lang === "fr" ? "Payée" : "Paid"}</option>
                  <option value="late">{lang === "fr" ? "En retard" : "Overdue"}</option>
                </select>
              </div>
            </div>

            {/* Aperçu taxes */}
            {montant && (
              <div style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 9, padding: "9px 12px", fontSize: 11, color: muted, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <span>📊 {taxRule.label} :</span>
                {taxRule.lines.map((l, i) => (
                  <span key={i}><strong style={{ color: txt }}>{l.name}</strong> {(l.rate*100).toFixed(l.rate===0.09975?3:0)}% = <strong style={{ color: acc }}>{formatAmount((parseFloat(montant)||0)*l.rate)}</strong></span>
                ))}
                <span style={{ marginLeft: "auto", fontWeight: 800, color: txt, fontSize: 13 }}>{t.total} : {formatAmount((parseFloat(montant)||0) + taxRule.lines.reduce((s,l)=>s+(parseFloat(montant)||0)*l.rate,0))}</span>
              </div>
            )}

            {/* Choix de style */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>{t.template}</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(Object.entries(FONT_TEMPLATES) as [FontTemplate, typeof FONT_TEMPLATES[FontTemplate]][]).map(([key, val]) => (
                  <button key={key} type="button" onClick={() => setFontTemplate(key)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `2px solid ${fontTemplate === key ? acc : bord}`, background: fontTemplate === key ? (dark ? "#2d2b28" : "#fff8f2") : surf2, cursor: "pointer", fontSize: 11, fontWeight: fontTemplate === key ? 700 : 500, color: fontTemplate === key ? acc : txt }}>
                    <span style={{ fontFamily: val.fontFamily, fontSize: 14, fontWeight: 900, color: val.accentColor }}>{val.preview}</span>
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <div style={{ padding: "7px 11px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 9, fontSize: 11, color: "#b91c1c" }}>⚠️ {error}</div>}

            <button type="submit" disabled={loading}
              style={{ background: loading ? muted : acc, color: "#fff", border: "none", borderRadius: 11, padding: "11px 0", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", transition: "background .2s" }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                  {t.generating}
                </span>
              ) : t.generate}
            </button>
          </form>

          {/* Aperçu facture */}
          {invoice && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: .8 }}>
                  {t.preview} — {invoice.numero}
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button onClick={() => handleExport("docx")}
                    style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {t.exportDocx}
                  </button>
                  <button onClick={() => handleExport("pdf")}
                    style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {t.exportPdf}
                  </button>
                </div>
              </div>
              {renderInvoice()}
            </div>
          )}

          <div style={{ marginTop: "auto", paddingTop: 10, fontSize: 10, color: muted, opacity: .5, textAlign: "center" }}>
            © FastBilling · echosai.ca/fastbilling
          </div>
        </div>

        {/* ── COL DROITE : contrôles ─────────────────────────────────────────── */}
        <aside className="fb-col-right" style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8, paddingLeft: 10 }}>

          {/* Dark + Lang */}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setDark(d => !d)}
              style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13, color: muted, fontWeight: 700 }}>
              {dark ? t.light : t.dark}
            </button>
            <div style={{ position: "relative", flex: 1 }}>
              <button onClick={() => setShowLang(v => !v)}
                style={{ width: "100%", background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 11, color: txt, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{lang === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"}</span>
                <span style={{ fontSize: 8, opacity: .6 }}>{showLang ? "▲" : "▼"}</span>
              </button>
              {showLang && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 9, overflow: "hidden", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}>
                  {(["fr", "en"] as Lang[]).map(l => (
                    <button key={l} onClick={() => { setLang(l); setShowLang(false); }}
                      style={{ width: "100%", padding: "8px 10px", fontSize: 11, background: lang === l ? surf2 : "transparent", color: lang === l ? acc : txt, border: "none", cursor: "pointer", fontWeight: lang === l ? 700 : 500, textAlign: "left" }}>
                      {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Connecté */}
          {user && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowUserMenu(v => !v)}
                style={{ width: "100%", background: "#16a34a", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#86efac", display: "inline-block" }} />
                {t.connected} <span style={{ marginLeft: "auto", fontSize: 8, opacity: .7 }}>{showUserMenu ? "▲" : "▼"}</span>
              </button>
              {showUserMenu && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 9, overflow: "hidden", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}>
                  <a href="/account" style={{ display: "block", padding: "8px 12px", fontSize: 11, color: txt, textDecoration: "none", fontWeight: 600, borderBottom: `1px solid ${bord}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = surf2)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    👤 {t.myAccount}
                  </a>
                  <button onClick={handleLogout} style={{ width: "100%", padding: "8px 12px", fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = surf2)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    ↩ {t.logout}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Don */}
          <div style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 11, overflow: "hidden" }}>
            <div style={{ padding: "10px 12px 8px" }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>☕ {t.donTitle}</div>
              <div style={{ fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 10 }}>{t.donDesc}</div>
              <button onClick={() => setDonOpen(d => !d)}
                style={{ width: "100%", background: acc, color: "#fff", border: "none", borderRadius: 9, padding: "10px 0", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                {donOpen ? t.donClose : t.donBtn}
              </button>
            </div>
            {donOpen && (
              <div style={{ borderTop: `1px solid ${bord}`, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                {DONATION_PLANS.map(d => (
                  <button key={d.plan} onClick={() => handleDon(d.plan)} disabled={donLoading === d.plan}
                    style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 7, padding: "7px 9px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: donLoading === d.plan ? .6 : 1, color: txt }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = acc)} onMouseLeave={e => (e.currentTarget.style.borderColor = bord)}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{lang === "fr" ? d.name : d.nameEn}</div>
                      <div style={{ fontSize: 10, color: muted }}>{lang === "fr" ? d.desc : d.descEn}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: acc }}>{d.amount}</div>
                  </button>
                ))}
                <div style={{ fontSize: 9, color: muted, textAlign: "center" }}>🔒 Stripe</div>
              </div>
            )}
          </div>

          {/* Connexion */}
          {!user && (
            <div style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 11, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 1 }}>{t.emetteur.split("/")[0]}</div>
              <button onClick={handleGoogle} style={{ ...btn({ background: "#fff", border: "1px solid #e5e7eb", color: "#374151" }) }}>
                <svg width="13" height="13" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
                Google
              </button>
              <button onClick={handleMicrosoft} style={{ ...btn({ background: dark ? "#2d2b28" : "#1a1917", border: "none", color: "#fff" }) }}>
                <svg width="13" height="13" viewBox="0 0 23 23" fill="none"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
                Microsoft
              </button>
              <button onClick={() => { setEmailMode("signin"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); }}
                style={{ ...btn({ background: "#0ea5e9", border: "none", color: "#fff" }) }}>✉ {t.signin}</button>
              <button onClick={() => { setEmailMode("signup"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); }}
                style={{ ...btn() }}>✦ {t.signup}</button>
            </div>
          )}
        </aside>
      </div>

      {/* ── BARRE MOBILE ──────────────────────────────────────────────────── */}
      <div className="fb-mobile-bar" style={{ "--surf": dark ? "#242220" : "#fffdf9", "--bord": dark ? "#3a3835" : "#e2ddd5" } as React.CSSProperties}>
        <button onClick={() => setDark(d => !d)} style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "7px 11px", fontSize: 13, color: muted, fontWeight: 700, cursor: "pointer" }}>
          {dark ? t.light : t.dark}
        </button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowLang(v => !v)} style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "7px 11px", fontSize: 11, color: txt, fontWeight: 700, cursor: "pointer" }}>
            {lang === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"} {showLang ? "▲" : "▼"}
          </button>
          {showLang && (
            <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 9, overflow: "hidden", zIndex: 200, minWidth: 130, boxShadow: "0 -4px 16px rgba(0,0,0,.12)" }}>
              {(["fr", "en"] as Lang[]).map(l => (
                <button key={l} onClick={() => { setLang(l); setShowLang(false); }}
                  style={{ width: "100%", padding: "9px 13px", fontSize: 12, background: lang === l ? surf2 : "transparent", color: lang === l ? acc : txt, border: "none", cursor: "pointer", fontWeight: lang === l ? 700 : 500, textAlign: "left" }}>
                  {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setDonOpen(d => !d)} style={{ background: acc, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>☕</button>
        {donOpen && (
          <div style={{ position: "fixed", bottom: 60, left: 14, right: 14, background: surf, border: `1px solid ${bord}`, borderRadius: 12, padding: "12px", zIndex: 300, boxShadow: "0 -4px 24px rgba(0,0,0,.15)" }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              ☕ {t.donTitle} <button onClick={() => setDonOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 14 }}>✕</button>
            </div>
            {DONATION_PLANS.map(d => (
              <button key={d.plan} onClick={() => handleDon(d.plan)} disabled={donLoading === d.plan}
                style={{ width: "100%", background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, color: txt }}>
                <div><div style={{ fontSize: 12, fontWeight: 700 }}>{lang === "fr" ? d.name : d.nameEn}</div><div style={{ fontSize: 10, color: muted }}>{lang === "fr" ? d.desc : d.descEn}</div></div>
                <div style={{ fontSize: 13, fontWeight: 800, color: acc }}>{d.amount}</div>
              </button>
            ))}
          </div>
        )}
        {user ? (
          <button onClick={handleLogout} style={{ background: "#16a34a", border: "none", borderRadius: 8, padding: "7px 11px", fontSize: 11, color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#86efac", display: "inline-block" }} />{t.connected}
          </button>
        ) : (
          <button onClick={() => { setEmailMode("signin"); setShowEmailModal(true); }}
            style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            {t.signin}
          </button>
        )}
      </div>

      {/* ── MODAL EMAIL ────────────────────────────────────────────────────── */}
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
              <input type="email" placeholder="nom@domaine.com" value={email} onChange={e => setEmail(e.target.value)} required style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "8px 11px", fontSize: 12, color: txt, outline: "none" }} />
              <input type="password" placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "8px 11px", fontSize: 12, color: txt, outline: "none" }} />
              <button type="submit" style={{ background: acc, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {emailMode === "signin" ? t.submitSignin : t.submitSignup}
              </button>
            </form>
            <button onClick={() => { setEmailMode(emailMode === "signin" ? "signup" : "signin"); setAuthError(null); setAuthSuccess(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 10, textDecoration: "underline" }}>
              {emailMode === "signin" ? t.switchToSignup : t.switchToSignin}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #c4bfb8; border-radius: 3px; }
        textarea { font-family: inherit; }
        select { appearance: none; }

        @media (max-width: 768px) {
          .fb-layout { grid-template-columns: 1fr !important; }
          .fb-col-left  { display: none !important; }
          .fb-col-right { display: none !important; }
          .fb-col-centre { padding: 12px 14px 80px !important; }
          .fb-mobile-bar { display: flex !important; }
          .fb-mobile-pubs { display: flex !important; }
        }
        @media (min-width: 769px) {
          .fb-mobile-bar { display: none !important; }
        }

        .fb-mobile-bar {
          position: fixed; bottom: 0; left: 0; right: 0;
          display: none;
          background: var(--surf, #fffdf9);
          border-top: 1px solid var(--bord, #e2ddd5);
          padding: 8px 14px 12px;
          gap: 8px; z-index: 50;
          align-items: center;
          justify-content: space-between;
        }
      `}</style>
    </div>
  );
}