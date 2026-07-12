"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";

type Lang = "fr" | "en";
type TypeBien = "vehicule" | "bijoux" | "electro" | "animal" | "autre";

const TYPE_BIEN: Record<TypeBien, { icon: string; labelFr: string; labelEn: string }> = {
  vehicule: { icon: "🚗", labelFr: "Véhicule",    labelEn: "Vehicle" },
  bijoux:   { icon: "💎", labelFr: "Bijoux",       labelEn: "Jewelry" },
  electro:  { icon: "📺", labelFr: "Électro",      labelEn: "Electronics" },
  animal:   { icon: "🐾", labelFr: "Animal",       labelEn: "Pet" },
  autre:    { icon: "📦", labelFr: "Autre",         labelEn: "Other" },
};

const DONATION_PLANS = [
  { name: "Avantage",  nameEn: "Advantage", amount: "$5.99",  plan: "basic",   desc: "Un café",          descEn: "A coffee" },
  { name: "Premium",   nameEn: "Premium",   amount: "$9.99",  plan: "premium", desc: "Vrai soutien",     descEn: "Real support" },
  { name: "Ultra",     nameEn: "Ultra",     amount: "$19.99", plan: "ultra",   desc: "Généreux 💛",      descEn: "Generous 💛" },
  { name: "Fondateur", nameEn: "Founder",   amount: "$99",    plan: "founder", desc: "Tu crois en nous", descEn: "You believe in us" },
];

const T = {
  fr: {
    tagline: "📄 Un contrat de vente en 30 secondes.",
    sub: "Entre les informations. L'IA génère le contrat légal complet.",
    vendeur: "Vendeur", acheteur: "Acheteur",
    nomComplet: "Nom complet", adresse: "Adresse complète",
    description: "Description précise du bien",
    descHint: "Marque, modèle, année, état, numéro de série si applicable…",
    prixModalites: "Prix et modalités de paiement",
    prixHint: "Ex: 1 500 $ comptant / 200 $ par semaine pendant 8 semaines / 500 $ de dépôt + solde à la livraison",
    typeBien: "Type de bien",
    generate: "Générer le contrat",
    generating: "L'IA prépare votre contrat…",
    exportPdf: "⬇ Exporter en PDF",
    preview: "Prévisualiser",
    connected: "Connecté", logout: "Se déconnecter",
    signin: "Se connecter",
    donTitle: "Soutenir l'outil", donDesc: "Outil gratuit. Un don maintient le service en ligne.",
    donBtn: "Faire un don ▼", donClose: "Fermer ▲",
    dark: "☾", light: "☀",
    modalSignin: "🛸 Connexion", modalSignup: "🛸 Créer un compte",
    submitSignin: "Se connecter", submitSignup: "Créer mon compte",
    switchToSignup: "Pas de compte ? Créer", switchToSignin: "Déjà un compte ?",
  },
  en: {
    tagline: "📄 A bill of sale in 30 seconds.",
    sub: "Enter the information. AI generates the complete legal contract.",
    vendeur: "Seller", acheteur: "Buyer",
    nomComplet: "Full name", adresse: "Full address",
    description: "Precise description of the item",
    descHint: "Brand, model, year, condition, serial number if applicable…",
    prixModalites: "Price and payment terms",
    prixHint: "Ex: $1,500 cash / $200/week for 8 weeks / $500 deposit + balance on delivery",
    typeBien: "Type of item",
    generate: "Generate contract",
    generating: "AI is preparing your contract…",
    exportPdf: "⬇ Export as PDF",
    preview: "Preview",
    connected: "Connected", logout: "Sign out",
    signin: "Sign in",
    donTitle: "Support the tool", donDesc: "Free tool. A donation keeps it running.",
    donBtn: "Donate ▼", donClose: "Close ▲",
    dark: "☾", light: "☀",
    modalSignin: "🛸 Sign In", modalSignup: "🛸 Create Account",
    submitSignin: "Sign in", submitSignup: "Create my account",
    switchToSignup: "No account? Create one", switchToSignin: "Already have an account?",
  },
};

type ContratData = {
  vendeur_nom: string; vendeur_adresse: string;
  acheteur_nom: string; acheteur_adresse: string;
  description_bien: string; prix_total: string;
  modalites_paiement: string; date: string; notes: string;
  type_bien: TypeBien;
};

export default function ContratPage() {
  const [dark, setDark]                 = useState(false);
  const [lang, setLang]                 = useState<Lang>("fr");
  const [user, setUser]                 = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [donOpen, setDonOpen]           = useState(false);
  const [donLoading, setDonLoading]     = useState<string | null>(null);
  const [donCurrency, setDonCurrency]   = useState<"CAD"|"USD"|"EUR">("CAD");
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailMode, setEmailMode]       = useState<"signin"|"signup">("signin");
  const [authEmail, setAuthEmail]       = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError]       = useState<string|null>(null);
  const [authSuccess, setAuthSuccess]   = useState<string|null>(null);
  const [loading, setLoading]           = useState(false);
  const [contrat, setContrat]           = useState<ContratData | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const contratRef = useRef<HTMLDivElement>(null);

  // Champs
  const [vendeurNom, setVendeurNom]       = useState("");
  const [vendeurAdresse, setVendeurAdresse] = useState("");
  const [acheteurNom, setAcheteurNom]     = useState("");
  const [acheteurAdresse, setAcheteurAdresse] = useState("");
  const [description, setDescription]    = useState("");
  const [prixModalites, setPrixModalites] = useState("");
  const [typeBien, setTypeBien]           = useState<TypeBien>("vehicule");

  const t = T[lang];
  const bg    = dark ? "#1a1917" : "#f0ece4";
  const surf  = dark ? "#242220" : "#fffdf9";
  const surf2 = dark ? "#2d2b28" : "#f5f1e8";
  const bord  = dark ? "#3a3835" : "#e2ddd5";
  const txt   = dark ? "#f0ece4" : "#1a1917";
  const muted = dark ? "#8a8680" : "#7a7570";
  const acc   = "#e07b39";

  const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUser(data.user); });
    const { data: l } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    const saved = localStorage.getItem("echo-currency") as "CAD"|"USD"|"EUR"|null;
    if (saved) setDonCurrency(saved);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "echo-currency" && e.newValue) setDonCurrency(e.newValue as "CAD"|"USD"|"EUR");
    };
    window.addEventListener("storage", onStorage);
    return () => { l.subscription.unsubscribe(); window.removeEventListener("storage", onStorage); };
  }, []);

  const handleGoogle    = async () => { await supabase.auth.signInWithOAuth({ provider: "google",  options: { redirectTo: `${window.location.origin}/contratachat`, scopes: "openid profile email", queryParams: { prompt: "select_account" } } }); };
  const handleMicrosoft = async () => { await supabase.auth.signInWithOAuth({ provider: "azure",   options: { redirectTo: `${window.location.origin}/contratachat`, scopes: "openid profile email User.Read" } }); };
  const handleLogout    = async () => { await supabase.auth.signOut(); setUser(null); setShowUserMenu(false); };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(null); setAuthSuccess(null);
    if (emailMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      if (error) setAuthError(error.message); else setShowEmailModal(false);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { emailRedirectTo: `${window.location.origin}/contratachat` } });
      if (error) setAuthError(error.message);
      else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) setAuthError("Compte existant.");
      else setAuthSuccess(lang === "fr" ? "Vérifiez votre boîte mail !" : "Check your inbox!");
    }
  };

  const handleDon = async (plan: string) => {
    setDonLoading(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId: user?.id || "guest_don", userEmail: user?.email || "don@echosai.ca", currency: donCurrency }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {} finally { setDonLoading(null); }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true); setError(null); setContrat(null);
    try {
      const dateStr = new Date().toISOString().split("T")[0];
      const freeText = `
Vendeur: ${vendeurNom} - ${vendeurAdresse}
Acheteur: ${acheteurNom} - ${acheteurAdresse}
Bien: ${description}
Prix et modalités: ${prixModalites}
Type: ${TYPE_BIEN[typeBien][lang === "fr" ? "labelFr" : "labelEn"]}
      `.trim();
      const res = await fetch(`${api}/1/generate-contrat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeText, lang, dateStr }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContrat({ ...data, type_bien: typeBien });
    } catch (err: any) {
      setError(err.message || "Erreur inattendue.");
    } finally { setLoading(false); }
  };

  const handleExportPdf = async () => {
    if (!contratRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const { default: jsPDF } = await import("jspdf");
    const canvas = await html2canvas(contratRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    const dateStr = contrat?.date || new Date().toISOString().split("T")[0];
    pdf.save(`Contrat-${vendeurNom.replace(/\s+/g, "_")}-${dateStr}.pdf`);
  };

  const renderContrat = () => {
    if (!contrat) return null;
    const tb = TYPE_BIEN[contrat.type_bien || typeBien];
    return (
      <div ref={contratRef} style={{ background: "#fff", color: "#18181b", fontFamily: "'Georgia', serif", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,.08)", padding: "40px 48px", lineHeight: 1.8 }}>
        {/* En-tête */}
        <div style={{ textAlign: "center", marginBottom: 32, borderBottom: "2px solid #1a1917", paddingBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#6b7280", marginBottom: 8 }}>Québec, Canada</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
            Contrat de vente entre particuliers
          </h1>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {tb.icon} {lang === "fr" ? tb.labelFr : tb.labelEn} · {lang === "fr" ? "Date" : "Date"} : <strong>{contrat.date}</strong>
          </div>
        </div>

        {/* Parties */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
          <div style={{ background: "#f9fafb", borderRadius: 10, padding: "16px 20px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{lang === "fr" ? "Vendeur" : "Seller"}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{contrat.vendeur_nom || vendeurNom}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.6 }}>{contrat.vendeur_adresse || vendeurAdresse}</div>
          </div>
          <div style={{ background: "#f9fafb", borderRadius: 10, padding: "16px 20px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{lang === "fr" ? "Acheteur" : "Buyer"}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{contrat.acheteur_nom || acheteurNom}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.6 }}>{contrat.acheteur_adresse || acheteurAdresse}</div>
          </div>
        </div>

        {/* Description du bien */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>{lang === "fr" ? "Description du bien" : "Item description"}</div>
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px", fontSize: 13, lineHeight: 1.8 }}>
            {contrat.description_bien || description}
          </div>
        </div>

        {/* Prix */}
        <div style={{ marginBottom: 28, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#065f46", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{lang === "fr" ? "Prix et modalités de paiement" : "Price & payment terms"}</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#065f46", marginBottom: 6 }}>{contrat.prix_total}</div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.7 }}>{contrat.modalites_paiement || prixModalites}</div>
        </div>

        {/* Notes IA */}
        {contrat.notes && (
          <div style={{ marginBottom: 28, padding: "14px 20px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Notes</div>
            {contrat.notes}
          </div>
        )}

        {/* Clauses génériques */}
        <div style={{ marginBottom: 28, borderTop: "1px solid #e5e7eb", paddingTop: 24 }}>
          <div style={{ fontSize: 12, lineHeight: 1.9, color: "#374151" }}>
            <p style={{ marginBottom: 12 }}>
              <strong>{lang === "fr" ? "Clause de renonciation" : "Waiver clause"} :</strong>{" "}
              {lang === "fr"
                ? "L'acheteur déclare avoir vérifié le bien et l'accepte dans l'état où il se trouve. Le présent bien est vendu sans aucune garantie légale, aux risques et périls de l'acheteur."
                : "The buyer declares having inspected the item and accepts it in its current condition. This item is sold without any legal warranty, at the buyer's sole risk."}
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>{lang === "fr" ? "Clause de vente sans garantie légale" : "Sale without legal warranty"} :</strong>{" "}
              {lang === "fr"
                ? "Le vendeur affirme que le bien fourni est sa propriété, libre de toutes charges et restrictions. Le bien est livré dans l'état dans lequel il a été décrit lors de la conclusion de ce contrat."
                : "The seller affirms that the item is their property, free of all charges and restrictions. The item is delivered in the condition described at the time this contract was concluded."}
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 32, paddingTop: 24, borderTop: "1px solid #e5e7eb" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: 2, textTransform: "uppercase", marginBottom: 20 }}>{lang === "fr" ? "Signature vendeur" : "Seller signature"}</div>
            <div style={{ borderBottom: "1px solid #18181b", minWidth: 180, marginBottom: 6 }}>&nbsp;</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{contrat.vendeur_nom || vendeurNom}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: 2, textTransform: "uppercase", marginBottom: 20 }}>{lang === "fr" ? "Signature acheteur" : "Buyer signature"}</div>
            <div style={{ borderBottom: "1px solid #18181b", minWidth: 180, marginBottom: 6 }}>&nbsp;</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{contrat.acheteur_nom || acheteurNom}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>Généré par echosai.ca/contratachat</div>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>{contrat.date}</div>
        </div>
      </div>
    );
  };

  const oauthBtn = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    width: "100%", padding: "9px 12px", border: "none",
    borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, ...extra,
  });

  return (
    <div style={{ background: bg, color: txt, minHeight: "100dvh", fontFamily: "'Inter', system-ui, sans-serif", transition: "background .3s" }}>
      <div className="ct-layout" style={{ display: "grid", gridTemplateColumns: "180px 1fr 180px", maxWidth: 1200, margin: "0 auto", padding: "0 10px", minHeight: "100dvh" }}>

        {/* COL GAUCHE */}
        <aside className="ct-col-left" style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 12, paddingRight: 10, alignItems: "center" }}>
          {[
            { href: "https://echosai.ca/2/talk", src: "/talkmini.png", label: "Talk", color: "#a78bfa" },
            { href: "https://echosai.ca/avis",   src: "/avismini.png", label: "Avis", color: "#f59e0b" },
            { href: "https://echosai.ca/idea",   src: "/ideamini.png", label: "Idea", color: "#00c8ff" },
          ].map((item, i) => (
            <a key={i} href={item.href} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", width: "100%", borderRadius: 14, overflow: "hidden", border: `2px solid ${item.color}`, boxShadow: `0 0 18px ${item.color}35`, textDecoration: "none", background: surf }}>
              <div style={{ overflow: "hidden", aspectRatio: "2 / 3" }}>
                <img src={item.src} alt={item.label}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .35s ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }} />
              </div>
            </a>
          ))}
        </aside>

        {/* CENTRE */}
        <div className="ct-col-centre" style={{ display: "flex", flexDirection: "column", padding: "14px 14px 60px" }}>

          {/* Header */}
          <div style={{ marginBottom: 14 }}>
            <h1 style={{ fontWeight: 900, fontSize: 22, letterSpacing: -.5, lineHeight: 1.15, marginBottom: 3 }}>{t.tagline}</h1>
            <p style={{ fontSize: 12, color: muted }}>{t.sub}</p>
          </div>

          {/* Pubs mobile */}
          <div className="ct-mobile-pubs" style={{ display: "none", gap: 8, marginBottom: 12 }}>
            <a href="https://echosai.ca/avis" target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "block", borderRadius: 10, overflow: "hidden", border: `1px solid ${bord}`, textDecoration: "none" }}>
              <img src="/avis.png" alt="" style={{ width: "100%", display: "block", maxHeight: 75, objectFit: "cover" }} />
              <div style={{ background: acc, color: "#fff", textAlign: "center", fontSize: 9, fontWeight: 800, padding: "4px 0" }}>AVIS →</div>
            </a>
            <a href="https://echosai.ca/2/talk" target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "block", borderRadius: 10, overflow: "hidden", border: `1px solid ${bord}`, textDecoration: "none" }}>
              <img src="/commun.png" alt="" style={{ width: "100%", display: "block", maxHeight: 75, objectFit: "cover" }} />
            </a>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>

            {/* Type de bien */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{t.typeBien}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(Object.entries(TYPE_BIEN) as [TypeBien, typeof TYPE_BIEN[TypeBien]][]).map(([key, val]) => (
                  <button key={key} type="button" onClick={() => setTypeBien(key)}
                    style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all .15s",
                      border: `1px solid ${typeBien === key ? acc : bord}`,
                      background: typeBien === key ? (dark ? "rgba(224,123,57,.15)" : "rgba(224,123,57,.1)") : surf2,
                      color: typeBien === key ? acc : muted }}>
                    {val.icon} {lang === "fr" ? val.labelFr : val.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Vendeur */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{t.vendeur}</div>
                <input value={vendeurNom} onChange={e => setVendeurNom(e.target.value)} placeholder={t.nomComplet}
                  style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 9, padding: "10px 12px", fontSize: 12, color: txt, outline: "none", marginBottom: 6 }}
                  onFocus={e => (e.target.style.borderColor = acc)} onBlur={e => (e.target.style.borderColor = bord)} />
                <textarea value={vendeurAdresse} onChange={e => setVendeurAdresse(e.target.value)} placeholder={t.adresse} rows={2}
                  style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 9, padding: "10px 12px", fontSize: 12, color: txt, outline: "none", resize: "none", fontFamily: "inherit" }}
                  onFocus={e => (e.target.style.borderColor = acc)} onBlur={e => (e.target.style.borderColor = bord)} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{t.acheteur}</div>
                <input value={acheteurNom} onChange={e => setAcheteurNom(e.target.value)} placeholder={t.nomComplet}
                  style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 9, padding: "10px 12px", fontSize: 12, color: txt, outline: "none", marginBottom: 6 }}
                  onFocus={e => (e.target.style.borderColor = acc)} onBlur={e => (e.target.style.borderColor = bord)} />
                <textarea value={acheteurAdresse} onChange={e => setAcheteurAdresse(e.target.value)} placeholder={t.adresse} rows={2}
                  style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 9, padding: "10px 12px", fontSize: 12, color: txt, outline: "none", resize: "none", fontFamily: "inherit" }}
                  onFocus={e => (e.target.style.borderColor = acc)} onBlur={e => (e.target.style.borderColor = bord)} />
              </div>
            </div>

            {/* Description */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{t.description}</div>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t.descHint} rows={4} required
                style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 9, padding: "10px 12px", fontSize: 12, color: txt, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }}
                onFocus={e => (e.target.style.borderColor = acc)} onBlur={e => (e.target.style.borderColor = bord)} />
            </div>

            {/* Prix + modalités */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{t.prixModalites}</div>
              <textarea value={prixModalites} onChange={e => setPrixModalites(e.target.value)} placeholder={t.prixHint} rows={3} required
                style={{ width: "100%", background: surf, border: `1.5px solid ${bord}`, borderRadius: 9, padding: "10px 12px", fontSize: 12, color: txt, outline: "none", resize: "vertical", fontFamily: "monospace", lineHeight: 1.7 }}
                onFocus={e => (e.target.style.borderColor = acc)} onBlur={e => (e.target.style.borderColor = bord)} />
            </div>

            {error && <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 9, fontSize: 11, color: "#b91c1c" }}>⚠️ {error}</div>}

            <button type="submit" disabled={loading || !description.trim() || !prixModalites.trim()}
              style={{ width: "100%", background: loading ? muted : `linear-gradient(135deg, ${acc}, #c4632a)`, color: "#fff", border: "none", borderRadius: 11, padding: "13px 0", fontWeight: 900, fontSize: 14, cursor: loading || !description.trim() ? "not-allowed" : "pointer", transition: "opacity .2s" }}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                    {t.generating}
                  </span>
                : t.generate}
            </button>
          </form>

          {/* CONTRAT PREVIEW */}
          {contrat && (
            <div style={{ animation: "fadeIn .4s ease" }}>
              {/* Bouton export */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button onClick={handleExportPdf}
                  style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 9, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  {t.exportPdf}
                </button>
              </div>
              {/* Overlay freemium si pas connecté */}
              <div style={{ position: "relative" }}>
                {renderContrat()}
                {!user && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: `linear-gradient(to bottom, transparent, ${dark ? "rgba(15,14,11,.97)" : "rgba(245,242,238,.97)"})`, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 20, borderRadius: "0 0 12px 12px" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: acc, marginBottom: 4 }}>
                        🔒 {lang === "fr" ? "Connecte-toi pour exporter" : "Sign in to export"}
                      </div>
                      <div style={{ fontSize: 11, color: muted, marginBottom: 10 }}>PDF · Sauvegarde automatique</div>
                      <button onClick={() => setShowAuthPopup(true)}
                        style={{ background: acc, color: "#fff", border: "none", borderRadius: 9, padding: "9px 22px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                        {lang === "fr" ? "Créer un compte gratuit →" : "Create a free account →"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: "auto", paddingTop: 10, fontSize: 10, color: muted, opacity: .4, textAlign: "center" }}>
            © Contrat de vente · echosai.ca ·{" "}
            <a href="mailto:support@echosai.ca" style={{ color: muted, textDecoration: "none", opacity: .6 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}>
              ✉ support
            </a>
          </div>
        </div>

        {/* COL DROITE */}
        <aside className="ct-col-right" style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8, paddingLeft: 10 }}>
          {/* Thème + langue */}
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={() => setDark(d => !d)} style={{ flex: 1, background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 13, color: muted }}>{dark ? t.light : t.dark}</button>
            <button onClick={() => setLang(l => l === "fr" ? "en" : "fr")} style={{ flex: 1, background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 11, color: txt, fontWeight: 700 }}>
              {lang === "fr" ? "EN" : "FR"}
            </button>
          </div>

          {/* Connecté */}
          {user ? (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowUserMenu(v => !v)} style={{ width: "100%", background: "#16a34a", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#86efac" }} />
                {t.connected}
                <span style={{ marginLeft: "auto", fontSize: 8, opacity: .7 }}>{showUserMenu ? "▲" : "▼"}</span>
              </button>
              {showUserMenu && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: surf, border: `1px solid ${bord}`, borderRadius: 9, overflow: "hidden", zIndex: 100 }}>
                  <button onClick={handleLogout} style={{ width: "100%", padding: "8px 12px", fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textAlign: "left" }}>↩ {t.logout}</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuthPopup(true)} style={{ width: "100%", background: acc, color: "#fff", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              {t.signin}
            </button>
          )}

          {/* Don */}
          <div style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 11, overflow: "hidden" }}>
            <div style={{ padding: "10px 12px 8px" }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>☕ {t.donTitle}</div>
              <div style={{ fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 8 }}>{t.donDesc}</div>
              {/* Sélecteur devise */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {(["CAD", "USD", "EUR"] as const).map(c => (
                  <button key={c} type="button" onClick={() => { setDonCurrency(c); localStorage.setItem("echo-currency", c); }}
                    style={{ flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 700, borderRadius: 7, border: `1px solid ${donCurrency === c ? acc : bord}`, background: donCurrency === c ? (dark ? "rgba(224,123,57,.15)" : "rgba(224,123,57,.1)") : surf2, color: donCurrency === c ? acc : muted, cursor: "pointer" }}>
                    {c}
                  </button>
                ))}
              </div>
              <button onClick={() => setDonOpen(d => !d)} style={{ width: "100%", background: acc, color: "#fff", border: "none", borderRadius: 9, padding: "9px 0", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                {donOpen ? t.donClose : t.donBtn}
              </button>
            </div>
            {donOpen && (
              <div style={{ borderTop: `1px solid ${bord}`, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                {DONATION_PLANS.map(d => (
                  <button key={d.plan} onClick={() => handleDon(d.plan)} disabled={donLoading === d.plan}
                    style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 7, padding: "7px 9px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: donLoading === d.plan ? .6 : 1, color: txt }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{lang === "fr" ? d.name : d.nameEn}</div>
                      <div style={{ fontSize: 10, color: muted }}>{lang === "fr" ? d.desc : d.descEn}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: acc }}>{d.amount}</div>
                  </button>
                ))}
                <div style={{ fontSize: 9, color: muted, textAlign: "center" }}>🔒 Stripe</div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* BARRE MOBILE */}
      <div className="ct-mobile-bar" style={{ "--surf": dark ? "#1a1917" : "#fffdf9", "--bord": dark ? "rgba(255,255,255,.08)" : "#e2ddd5" } as React.CSSProperties}>
        <button onClick={() => setDark(d => !d)} style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "7px 11px", fontSize: 13, color: muted, cursor: "pointer" }}>{dark ? t.light : t.dark}</button>
        <button onClick={() => setLang(l => l === "fr" ? "en" : "fr")} style={{ background: surf2, border: `1px solid ${bord}`, borderRadius: 8, padding: "7px 11px", fontSize: 11, color: txt, fontWeight: 700, cursor: "pointer" }}>
          {lang === "fr" ? "EN" : "FR"}
        </button>
        <div style={{ position: "relative", flex: 1, display: "flex", justifyContent: "center" }}>
          <button onClick={() => setDonOpen(d => !d)} style={{ background: acc, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            ☕ {lang === "fr" ? "Don café" : "Buy coffee"}
          </button>
          {donOpen && (
            <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: surf, border: `1px solid ${bord}`, borderRadius: 14, padding: "14px", zIndex: 300, minWidth: 250, boxShadow: "0 -4px 28px rgba(0,0,0,.2)" }}>
              <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 10, display: "flex", justifyContent: "space-between", color: txt }}>
                ☕ {lang === "fr" ? "Soutenir l'outil" : "Support the tool"}
                <button onClick={() => setDonOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 16 }}>✕</button>
              </div>
              {DONATION_PLANS.map(d => (
                <button key={d.plan} onClick={() => handleDon(d.plan)} style={{ width: "100%", background: surf2, border: `1px solid ${bord}`, borderRadius: 9, padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, color: txt }}>
                  <div><div style={{ fontSize: 12, fontWeight: 700 }}>{lang === "fr" ? d.name : d.nameEn}</div><div style={{ fontSize: 10, color: muted }}>{lang === "fr" ? d.desc : d.descEn}</div></div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: acc }}>{d.amount}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {user
          ? <button onClick={handleLogout} style={{ background: "#16a34a", border: "none", borderRadius: 8, padding: "7px 11px", fontSize: 11, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{t.connected}</button>
          : <button onClick={() => setShowAuthPopup(true)} style={{ background: acc, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{t.signin}</button>
        }
      </div>

      {/* POPUP AUTH */}
      {showAuthPopup && (
        <div onClick={() => setShowAuthPopup(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(6px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: surf, border: `1px solid ${bord}`, borderRadius: 20, padding: "28px 28px 22px", width: 320, display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
            <button onClick={() => setShowAuthPopup(false)} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>✕</button>
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: txt, marginBottom: 4 }}>{lang === "fr" ? "Connecte-toi pour exporter" : "Sign in to export"}</div>
              <div style={{ fontSize: 12, color: muted }}>{lang === "fr" ? "Gratuit · Aucune carte requise" : "Free · No card required"}</div>
            </div>
            <button onClick={() => { handleGoogle(); setShowAuthPopup(false); }} style={{ ...oauthBtn({ background: "#fff", color: "#374151" }) }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.18 2.18 5.94l3.66 2.84c.87-2.6 3.3-4.4 6.16-4.4z" fill="#EA4335"/></svg>
              {lang === "fr" ? "Continuer avec Google" : "Continue with Google"}
            </button>
            <button onClick={() => { handleMicrosoft(); setShowAuthPopup(false); }} style={{ ...oauthBtn({ background: dark ? "#2d2b28" : "#1a1917", color: "#fff" }) }}>
              <svg width="16" height="16" viewBox="0 0 23 23" fill="none"><path d="M0 0H11V11H0V0Z" fill="#F25022"/><path d="M12 0H23V11H12V0Z" fill="#7FBA00"/><path d="M0 12H11V23H0V12Z" fill="#00A4EF"/><path d="M12 12H23V23H12V12Z" fill="#FFB900"/></svg>
              {lang === "fr" ? "Continuer avec Microsoft" : "Continue with Microsoft"}
            </button>
            <button onClick={() => { setEmailMode("signin"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); setShowAuthPopup(false); }} style={{ ...oauthBtn({ background: "#0ea5e9", color: "#fff" }) }}>
              ✉ {lang === "fr" ? "Se connecter par email" : "Sign in with email"}
            </button>
            <button onClick={() => { setEmailMode("signup"); setAuthError(null); setAuthSuccess(null); setShowEmailModal(true); setShowAuthPopup(false); }} style={{ ...oauthBtn({ background: surf2 }) }}>
              ✦ {lang === "fr" ? "Créer un compte gratuit" : "Create a free account"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL EMAIL */}
      {showEmailModal && (
        <div onClick={() => setShowEmailModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, backdropFilter: "blur(6px)" }}>
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
              <button type="submit" style={{ background: acc, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {emailMode === "signin" ? t.submitSignin : t.submitSignup}
              </button>
            </form>
            <button onClick={() => { setEmailMode(emailMode === "signin" ? "signup" : "signin"); setAuthError(null); setAuthSuccess(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 10, textDecoration: "underline" }}>
              {emailMode === "signin" ? t.switchToSignup : t.switchToSignin}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea, input { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
        @media (max-width: 768px) {
          .ct-layout { grid-template-columns: 1fr !important; }
          .ct-col-left, .ct-col-right { display: none !important; }
          .ct-col-centre { padding: 14px 14px 80px !important; }
          .ct-mobile-bar { display: flex !important; }
          .ct-mobile-pubs { display: flex !important; }
        }
        @media (min-width: 769px) { .ct-mobile-bar { display: none !important; } }
        .ct-mobile-bar {
          position: fixed; bottom: 0; left: 0; right: 0; display: none;
          background: var(--surf, #1a1917); border-top: 1px solid var(--bord, rgba(255,255,255,.08));
          padding: 8px 14px 12px; gap: 8px; z-index: 50; align-items: center; justify-content: space-between;
        }
      `}</style>
    </div>
  );
}