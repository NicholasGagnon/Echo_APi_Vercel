"use client";

import React, { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "model";
}

export default function ModelChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      text: "Système initialisé. Je suis prêt. De quoi veux-tu discuter ?",
      sender: "model",
    },
  ]);
  const [input, setInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers le bas à chaque nouveau message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Gestion de l'envoi du message au backend Flask
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) throw new Error("Erreur serveur API");

      const data = await res.json();

      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || "Aucune réponse reçue.",
        sender: "model",
      };
      setMessages((prev) => [...prev, modelMessage]);

    } catch (error) {
      console.error("Erreur de connexion:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Impossible de joindre le modèle Echo. Vérifie que ton serveur Flask est bien démarré.",
        sender: "model",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 font-sans h-screen flex flex-col selection:bg-emerald-500/30">
      
      {/* En-tête / Navbar */}
      <header className="border-b border-slate-800 p-4 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold tracking-wide text-lg">
              echosai.ca <span className="text-slate-400 text-sm font-normal">/ model</span>
            </span>
          </div>
          <div className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            Mode : Clavardage Direct
          </div>
        </div>
      </header>

      {/* Zone de discussion (Scrollable) */}
      <main 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl w-full mx-auto"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-4 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow-lg ${
                msg.sender === "user"
                  ? "bg-slate-600 text-white"
                  : "bg-emerald-600 text-white shadow-emerald-900/20"
              }`}
            >
              {msg.sender === "user" ? "U" : "E"}
            </div>

            <div
              className={`rounded-2xl p-4 max-w-[85%] shadow-md border ${
                msg.sender === "user"
                  ? "bg-emerald-700 text-white border-transparent rounded-tr-none"
                  : "bg-slate-800 text-slate-100 border-slate-700/50 rounded-tl-none"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
      </main>

      {/* Zone d'écriture / Input (Fixe en bas) */}
      <footer className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSend}
            className="flex gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700 focus-within:border-emerald-500 transition-colors"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écris ton message ici..."
              autoComplete="off"
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-md shadow-emerald-900/20"
            >
              Envoyer
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}