"use client";

import { useState, useRef, useEffect } from "react";

export default function TestChatPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setMessages((prev) => [...prev, `You: ${userMessage}`]);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: [],
          userTier: "free",
          source: "chat"
        }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, `Echo: ${data.response || "Aucune réponse"}`]);
    } catch (error) {
      setMessages((prev) => [...prev, "System: Erreur de connexion au serveur."]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="h-screen bg-zinc-950 text-white flex flex-col p-6 font-sans">
      <div className="border-b border-zinc-800 pb-4 mb-4">
        <h1 className="text-lg font-bold text-cyan-400">⚡ TEST CHAT DIRECT</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-4 border border-zinc-800 rounded-xl bg-zinc-900/50">
        {messages.map((msg, index) => (
          <div key={index} className="text-sm whitespace-pre-wrap">
            <span className={msg.startsWith("Echo:") ? "text-cyan-400 font-bold" : "text-zinc-400"}>
              {msg}
            </span>
          </div>
        ))}
        {isLoading && <div className="text-xs text-cyan-500 animate-pulse">Echo réfléchit...</div>}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Message de test..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 px-6 py-2 rounded-lg text-sm font-bold tracking-wider uppercase"
        >
          Tester
        </button>
      </div>
    </main>
  );
}