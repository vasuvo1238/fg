import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/">
          <Button variant="ghost" className="mb-6 text-slate-300 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <Card className="p-8 bg-slate-800/50 border-slate-700 backdrop-blur-lg">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          </div>
          
          <p className="text-slate-400 mb-6">Last updated: December 2024</p>

          <div className="prose prose-invert max-w-none space-y-6 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
              <p>
                FinTech Hub ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
                explains how we collect, use, disclose, and safeguard your information when you use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-slate-200 mt-4 mb-2">Personal Information</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Name and email address (when you create an account)</li>
                <li>Profile picture (if using Google login)</li>
                <li>Payment information (processed securely by Stripe)</li>
              </ul>

              <h3 className="text-lg font-medium text-slate-200 mt-4 mb-2">Usage Information</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Features accessed and actions taken</li>
                <li>Stock symbols searched and analyzed</li>
                <li>Prediction requests and model usage</li>
                <li>Device information and IP address</li>
              </ul>

              <h3 className="text-lg font-medium text-slate-200 mt-4 mb-2">Cookies</h3>
              <p>
                We use essential cookies for authentication and session management. We also use analytics 
                cookies to understand how users interact with our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>To provide and maintain our Service</li>
                <li>To process your transactions and subscriptions</li>
                <li>To send important updates about your account</li>
                <li>To improve and personalize your experience</li>
                <li>To analyze usage patterns and optimize performance</li>
                <li>To detect and prevent fraud or abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing</h2>
              <p>We do NOT sell your personal information. We may share data with:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Service Providers:</strong> Companies that help us operate (e.g., Stripe for payments, cloud hosting)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger or acquisition</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Data Security</h2>
              <p>
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Encryption of data in transit (HTTPS/TLS)</li>
                <li>Secure password hashing</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
              </ul>
              <p className="mt-3">
                However, no method of transmission over the Internet is 100% secure. We cannot guarantee 
                absolute security of your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Export:</strong> Download your data in a portable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, please contact us at privacy@fintechhub.com
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active or as needed to 
                provide services. Usage data is typically retained for 2 years for analytics purposes. 
                You can request deletion at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Children's Privacy</h2>
              <p>
                Our Service is not intended for children under 18. We do not knowingly collect information 
                from children under 18. If you believe we have collected such information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. International Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place to protect your data in accordance with 
                this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy periodically. We will notify you of significant changes 
                by email or through the Service. Your continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
              <p>
                For privacy-related questions or concerns, please contact:
              </p>
              <p className="mt-2">
                Email: privacy@fintechhub.com<br />
                Subject: Privacy Inquiry
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}
