import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy - GlamAI' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold text-[#f6ece6] mb-2">Privacy Policy</h1>
      <p className="text-xs text-[#937b7c] mb-8">GlamAI - Your live AI makeup coach</p>

      <section className="space-y-4 text-sm text-[#ddc9c5]">
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">1. Your photos NEVER leave your device</h2>
          <p>GlamAI processes every selfie and every live mirror frame 100% inside your browser, on your device. Your photos and camera video are never uploaded, stored, or seen by our servers. Close the tab and they are gone.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">2. What we do collect</h2>
          <p>We collect anonymous usage events (for example: a scan completed, a feature opened) to understand which features help you. These events contain no name, no email, and no photo data.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">3. PRO status & payments</h2>
          <p>If you unlock PRO, a secure cookie on your device remembers your status. Payments are processed entirely by Whop. We never see or store your card details.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">4. Third-party services</h2>
          <p>Supabase (anonymous event storage), Whop (checkout), and retailer links (Sephora, Amazon) each operate under their own privacy policies once you leave GlamAI.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">5. Your control</h2>
          <p>No account is required. Clearing your browser cookies resets GlamAI to a fresh, free session at any time.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">6. Contact</h2>
          <p>Questions? Email influenceaiprime@gmail.com</p>
        </div>
      </section>

      <p className="mt-10 text-center">
        <a href="/" className="text-xs text-[#b76e79] hover:text-[#e8b4bc]">← Back to GlamAI</a>
      </p>
    </main>
  );
}
