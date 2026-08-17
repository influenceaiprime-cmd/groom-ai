'use client';

import { useEffect, useRef, useState } from 'react';
import { SkinAnalysis } from '@/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DAILY_LIMIT = 5;

function todayKey() {
  return `glamai_chat_count_${new Date().toISOString().slice(0, 10)}`;
}

export default function ChatWidget({ analysis, isPro }: { analysis: SkinAnalysis | null; isPro: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!isPro) {
      const count = Number(localStorage.getItem(todayKey()) || 0);
      setLimitHit(count >= DAILY_LIMIT);
    } else {
      setLimitHit(false);
    }
  }, [isPro, open]);

  const speak = (text: string) => {
    if (!speakEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    window.speechSynthesis.speak(utter);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    if (!isPro) {
      const key = todayKey();
      const count = Number(localStorage.getItem(key) || 0);
      if (count >= DAILY_LIMIT) {
        setLimitHit(true);
        return;
      }
      localStorage.setItem(key, String(count + 1));
    }

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: nextMessages.slice(0, -1),
          analysisContext: analysis
            ? { undertone: analysis.undertone, toneCategory: analysis.toneCategory, hex: analysis.skinToneHex, topMatch: analysis.matches[0] }
            : null,
        }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, something went wrong - try again?";
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Network hiccup - try again?" }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser - try Chrome or Edge.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      sendMessage(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-[#7a2b3d] to-[#b76e79] shadow-xl shadow-[#b76e79]/40 flex items-center justify-center text-2xl hover:scale-105 transition-transform"
        aria-label="Open beauty coach chat"
      >
        💬
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[92vw] max-w-sm h-[65vh] bg-white rounded-2xl shadow-2xl border border-pink-100 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-[#7a2b3d] to-[#b76e79] text-white px-4 py-3 flex items-center justify-between">
            <p className="font-bold text-sm">💄 Beauty Coach</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSpeakEnabled(s => !s)}
                title="Toggle voice replies"
                className={`text-xs px-2 py-1 rounded-full ${speakEnabled ? 'bg-white text-[#7a2b3d] font-bold' : 'bg-white/20'}`}
              >
                🔊
              </button>
              <button onClick={() => setOpen(false)} className="text-white text-lg leading-none">✕</button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center mt-6">
                Ask me anything about your shade match, undertones, or application tips 💬
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    m.role === 'user'
                      ? 'bg-[#b76e79] text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-400">
                  typing...
                </div>
              </div>
            )}
          </div>

          {limitHit ? (
            <div className="p-3 text-center text-xs font-bold text-[#7a2b3d] bg-pink-50 border-t border-pink-100">
              🔒 Daily free chat limit reached - upgrade to Pro for unlimited coaching.
            </div>
          ) : (
            <div className="p-2 border-t border-gray-100 flex items-center gap-2">
              <button
                onClick={toggleMic}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600'}`}
                aria-label="Voice input"
              >
                🎙️
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                placeholder="Ask your beauty coach..."
                className="flex-1 px-3 py-2 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-[#b76e79]"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading}
                className="px-4 py-2 rounded-full bg-[#7a2b3d] text-white text-sm font-bold disabled:opacity-50"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
