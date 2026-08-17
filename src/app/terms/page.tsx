import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Service - GlamAI' };

export default function TermsPage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold text-[#f6ece6] mb-2">Terms of Service</h1>
      <p className="text-xs text-[#937b7c] mb-8">By using GlamAI you agree to these terms.</p>

      <section className="space-y-4 text-sm text-[#ddc9c5]">
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">1. The service</h2>
          <p>GlamAI provides AI-powered cosmetic color analysis, shade matching, and makeup education for entertainment and educational purposes.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">2. Not professional advice</h2>
          <p>GlamAI is not medical or dermatological advice. Always patch-test new products. Consult a professional for skin conditions or allergies.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">3. Free & PRO</h2>
          <p>The free tier includes limited features and watermarked exports. PRO is unlocked via Whop subscription or access code. Billing, renewals and cancellations are handled by Whop.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">4. Your content</h2>
          <p>You own everything you export. Free exports carry a GlamAI watermark. Only upload photos you have the right to use.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">5. Acceptable use</h2>
          <p>No reverse engineering, no scraping the shade database, no reselling or sharing PRO access codes.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">6. Affiliate links</h2>
          <p>We may earn a commission when you purchase through retailer links, at no extra cost to you. Recommendations are computed by color science, never by sponsorship.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">7. Liability</h2>
          <p>GlamAI is provided "as is". Shade matches are estimates affected by your lighting. We are not liable for product purchase outcomes.</p>
        </div>
        <div>
          <h2 className="font-bold text-[#e8b4bc] mb-1">8. Contact</h2>
          <p>influenceaiprime@gmail.com</p>
        </div>
      </section>

      <p className="mt-10 text-center">
        <a href="/" className="text-xs text-[#b76e79] hover:text-[#e8b4bc]">← Back to GlamAI</a>
      </p>
    </main>
  );
}
