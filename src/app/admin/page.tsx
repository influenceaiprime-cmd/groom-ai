'use client';
import { useState, useEffect, useCallback } from 'react';

export default function AdminCockpit() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState('');

  const login = async () => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (res.ok) {
      setAuthed(true);
      sessionStorage.setItem('admin_pw', password);
    } else setError('Wrong password, CEO.');
  };

  const fetchData = useCallback(async () => {
    const pw = sessionStorage.getItem('admin_pw');
    if (!pw) return;
    const res = await fetch('/api/admin', { headers: { 'Authorization': `Bearer ${pw}` } });
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events);
      setConfig(data.config);
    } else setAuthed(false);
  }, []);

  useEffect(() => {
    const pw = sessionStorage.getItem('admin_pw');
    if (pw) { setAuthed(true); setPassword(pw); }
  }, []);

  useEffect(() => {
    if (authed) {
      fetchData();
      const interval = setInterval(fetchData, 3000); // Live stream every 3s
      return () => clearInterval(interval);
    }
  }, [authed, fetchData]);

  const updateConfig = async (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    await fetch('/api/admin', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('admin_pw')}`
      },
      body: JSON.stringify(newConfig)
    });
  };

  if (!authed) {
    return (
      <main className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center p-4">
        <div className="max-w-sm w-full space-y-4 border border-green-500 p-8 rounded-lg bg-gray-900 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          <h1 className="text-2xl font-bold text-center">🔒 GLAMAI COCKPIT</h1>
          <p className="text-xs text-center text-gray-400">Authorized Personnel Only</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter CEO Password"
            className="w-full p-3 bg-black border border-green-500 rounded text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            onKeyDown={(e) => e.key === 'Enter' && login()}
          />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button onClick={login} className="w-full py-3 bg-green-600 text-black font-bold rounded hover:bg-green-500 transition-colors">
            ACCESS MAINFRAME
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8 font-sans">
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold text-pink-500">🎛️ GlamAI Control Room</h1>
        <button onClick={() => { sessionStorage.removeItem('admin_pw'); setAuthed(false); }} className="text-xs text-gray-500 hover:text-red-500">Logout</button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: CONTROLS */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <h2 className="text-lg font-bold mb-4 text-pink-400">🚦 Feature Kill Switches</h2>
            {config && ['mirrorEnabled', 'scannerEnabled', 'videoEnabled', 'paywallEnabled'].map(key => (
              <label key={key} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <span className="text-sm capitalize">{key.replace('Enabled', '')}</span>
                <input
                  type="checkbox"
                  checked={config[key]}
                  onChange={(e) => updateConfig(key, e.target.checked)}
                  className="w-5 h-5 accent-pink-500"
                />
              </label>
            ))}
          </div>

          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <h2 className="text-lg font-bold mb-4 text-pink-400">💰 Pricing Control</h2>
            {config && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400">Monthly ($)</label>
                  <input type="number" step="0.01" value={config.proMonthly} onChange={(e) => updateConfig('proMonthly', parseFloat(e.target.value))} className="w-full p-2 bg-black border border-gray-700 rounded text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Yearly ($)</label>
                  <input type="number" step="0.01" value={config.proYearly} onChange={(e) => updateConfig('proYearly', parseFloat(e.target.value))} className="w-full p-2 bg-black border border-gray-700 rounded text-white" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <h2 className="text-lg font-bold mb-4 text-pink-400">📢 Broadcast Banner</h2>
            {config && (
              <input
                type="text"
                placeholder="e.g. 50% OFF Weekend Sale!"
                value={config.bannerText || ''}
                onChange={(e) => updateConfig('bannerText', e.target.value)}
                className="w-full p-2 bg-black border border-gray-700 rounded text-white"
              />
            )}
          </div>
        </div>

        {/* RIGHT: LIVE EVENT STREAM */}
        <div className="lg:col-span-2 bg-gray-900 rounded-lg border border-gray-800 flex flex-col h-[80vh]">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              LIVE EVENT STREAM
            </h2>
            <span className="text-xs text-gray-500">{events.length} recent events</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
            {events.length === 0 && <p className="text-gray-500 text-center py-8">Waiting for user activity...</p>}
            {events.map((ev: any) => (
              <div key={ev.id} className="flex gap-3 p-2 hover:bg-gray-800 rounded border-l-2 border-pink-500">
                <span className="text-gray-500 text-xs whitespace-nowrap">
                  {new Date(ev.created_at).toLocaleTimeString()}
                </span>
                <span className="text-pink-400 font-bold min-w-[120px]">{ev.event}</span>
                <span className="text-gray-300 truncate">{JSON.stringify(ev.meta)}</span>
                <span className="text-gray-600 text-xs ml-auto">v:{ev.visitor?.slice(0,6)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
