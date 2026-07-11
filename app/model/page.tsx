"use client";

import React, { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "model";
  videoUrl?: string;
  imagePreview?: string;
}

export default function ModelChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      text: "Système connecté au backend local. Prêt pour envoyer tes requêtes à CogVideoX-3 !",
      sender: "model",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [videoImage, setVideoImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setVideoImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Convertit le fichier image en base64 pur (sans le préfixe data:...)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !videoImage) || isLoading) return;

    const userText = input.trim();
    const currentImagePreview = imagePreview;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: userText || "🎬 Génération lancée à partir de l'image attachée",
      sender: "user",
      imagePreview: currentImagePreview || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("message", userText);
      formData.append("model", "CogVideoX-3");
      formData.append("with_audio", "true");

      if (videoImage) {
        const base64Image = await fileToBase64(videoImage);
        formData.append("image_base64", base64Image);
        formData.append("image_mimetype", videoImage.type);
      }

      removeImage();

      const res = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.response || `Erreur serveur API (${res.status})`);
      }

      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || "Voici ta vidéo générée :",
        sender: "model",
        videoUrl: data.video_url,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error("Erreur lors de la génération :", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error ? error.message : "Impossible de joindre le modèle CogVideoX-3.",
        sender: "model",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 font-sans h-screen flex flex-col selection:bg-emerald-500/30">
      <header className="border-b border-slate-800 p-4 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold tracking-wide text-lg">
              echosai.ca <span className="text-slate-400 text-sm font-normal">/ video-test</span>
            </span>
          </div>
          <div className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            Modèle actuel : <span className="text-emerald-400 font-mono">CogVideoX-3</span>
          </div>
        </div>
      </header>

      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl w-full mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-4 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow-lg ${msg.sender === "user" ? "bg-slate-600 text-white" : "bg-emerald-600 text-white"}`}>
              {msg.sender === "user" ? "U" : "GLM"}
            </div>
            <div className={`rounded-2xl p-4 max-w-[85%] shadow-md border flex flex-col gap-3 ${msg.sender === "user" ? "bg-emerald-700 text-white border-transparent rounded-tr-none" : "bg-slate-800 text-slate-100 border-slate-700/50 rounded-tl-none"}`}>
              {msg.imagePreview && (
                <img src={msg.imagePreview} alt="Image envoyée" className="rounded-lg max-h-40 object-cover" />
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.videoUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-700 max-w-lg mt-2 bg-black">
                  <video src={msg.videoUrl} controls className="w-full h-auto object-cover" />
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-emerald-600 text-white shadow-lg animate-pulse">GLM</div>
            <div className="bg-slate-800 text-slate-400 border border-slate-700/50 rounded-2xl rounded-tl-none p-4 text-sm flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce"></div>
              </div>
              Appel à CogVideoX-3 en cours...
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0">
        <div className="max-w-4xl mx-auto space-y-3">
          {imagePreview && (
            <div className="relative inline-block bg-slate-800 p-1.5 rounded-xl border border-slate-700">
              <img src={imagePreview} alt="Aperçu" className="h-20 w-20 object-cover rounded-lg" />
              <button type="button" onClick={removeImage} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md">×</button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700 focus-within:border-emerald-500 transition-colors items-center">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-2 text-slate-400 hover:text-slate-200 transition-colors text-lg disabled:opacity-40">
              📎
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder={isLoading ? "Envoi au serveur local..." : "Décris l'animation ou les bruitages voulus..."}
              autoComplete="off"
              className="flex-1 bg-transparent px-2 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            <button type="submit" disabled={isLoading || (!input.trim() && !videoImage)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-md">
              Générer
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}