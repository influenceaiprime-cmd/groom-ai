import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Service - GroomAI' };

export default function TermsPage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold text-[#f6ece6] mb-2">Terms of Service</h1>
      <p className="text-xs text-[#937b7c] mb-8">By using GroomAI you agree to these terms.</p>

      <section className="space-y-4 text-sm text-[#ddc9c5]">
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">1. The service</h2>
          <p>GroomAI provides AI-powered beard style previews and barber-ready style specs, for informational and entertainment purposes.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">2. Not professional advice</h2>
          <p>GroomAI does not provide medical, dermatological, or professional barbering advice. Style previews are estimates. Consult a professional barber or dermatologist for specific guidance.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">3. Free & PRO</h2>
          <p>The free tier includes 3 beard styles. PRO ($6.99 one-time) unlocks all styles and the Barber Card export. PRO is unlocked via Whop checkout or access code. Billing and payment processing are handled by Whop.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">4. Your content</h2>
          <p>You own everything you export, including your Barber Card. Only upload photos you have the right to use.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">5. Acceptable use</h2>
          <p>No reverse engineering, no reselling or sharing PRO access codes.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">6. Liability</h2>
          <p>GroomAI is provided "as is". Beard style previews are AI-generated estimates and may not perfectly reflect real-world results, which depend on your actual hair growth, texture, and your barber's execution. We are not liable for barbering or grooming outcomes.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">7. Contact</h2>
          <p>influenceaiprime@gmail.com</p>
        </div>
      </section>

      <p className="mt-10 text-center">
        <a href="/" className="text-xs text-[#b76e79] hover:text-[#e8b4bc]">← Back to GroomAI</a>
      </p>
    </main>
  );
}
