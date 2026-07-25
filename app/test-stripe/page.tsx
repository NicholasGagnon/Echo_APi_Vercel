"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function TestStripePage() {
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUser(data.user);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_tier")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.user_tier === "premium") {
        setIsPremium(true);
      }
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const handleSubscribe = async () => {
    if (!user) {
      alert("Connecte-toi d'abord sur ton site !");
      return;
    }

    setLoading(true);
    try {
      // 🎯 LE BON CHEMIN APPLIQUÉ ICI :
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, userEmail: user.email }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        alert("La route renvoie toujours du HTML. Vérifie que le fichier route.ts est bien dans app/api/stripe/create-checkout/");
        return;
      }

      if (!res.ok) {
        alert(`Erreur API (${res.status}) : ${data.message}`);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert(`Erreur réseau : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 500, margin: "0 auto" }}>
      <h1>🧪 Page de Test Abonnement</h1>
      
      <div style={{ padding: 20, background: "#f5f5f5", borderRadius: 10, marginBottom: 20 }}>
        <p><strong>Utilisateur :</strong> {user ? user.email : "Non connecté"}</p>
        <p>
          <strong>Statut DB :</strong>{" "}
          <span style={{ color: isPremium ? "green" : "red", fontWeight: "bold" }}>
            {isPremium ? "PREMIUM (ACTIF)" : "GRATUIT"}
          </span>
        </p>
      </div>

      {isPremium ? (
        <button
          disabled
          style={{
            width: "100%",
            padding: "15px",
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          ✓ Abonnement Premium Actif (3,99 $)
        </button>
      ) : (
        <button
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            width: "100%",
            padding: "15px",
            background: "#e07b39",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          {loading ? "Paiement en cours..." : "⚡ Tester l'Abonnement (3,99 $/mois)"}
        </button>
      )}
    </div>
  );
}