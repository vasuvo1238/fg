import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp } from 'lucide-react';

export default function TermsOfService() {
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
            <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
          </div>
          
          <p className="text-slate-400 mb-6">Last updated: December 2024</p>

          <div className="prose prose-invert max-w-none space-y-6 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using FinTech Hub ("the Service"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
              <p>
                FinTech Hub provides AI-powered financial analysis tools including stock predictions, options analysis, 
                portfolio optimization, and market insights. Our Service is designed for informational purposes only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Financial Disclaimer</h2>
              <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
                <p className="font-semibold text-amber-400 mb-2">IMPORTANT NOTICE:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>FinTech Hub does NOT provide financial, investment, legal, or tax advice.</li>
                  <li>All predictions, analyses, and recommendations are for educational purposes only.</li>
                  <li>Past performance does not guarantee future results.</li>
                  <li>You should consult with qualified professionals before making any financial decisions.</li>
                  <li>We are not responsible for any financial losses incurred from using our Service.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. User Accounts</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You must provide accurate information when creating an account.</li>
                <li>You are responsible for maintaining the security of your account credentials.</li>
                <li>You must be at least 18 years old to use our Service.</li>
                <li>One person may not maintain multiple accounts.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Subscription and Payments</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Paid subscriptions are billed monthly unless otherwise specified.</li>
                <li>Prices are subject to change with 30 days notice.</li>
                <li>Refunds are handled on a case-by-case basis.</li>
                <li>Usage limits are reset at the beginning of each billing cycle.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Acceptable Use</h2>
              <p>You agree NOT to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Use the Service for any illegal purpose.</li>
                <li>Attempt to reverse engineer or hack the Service.</li>
                <li>Resell or redistribute data from the Service without permission.</li>
                <li>Use automated tools to scrape or access the Service.</li>
                <li>Share your account credentials with others.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Intellectual Property</h2>
              <p>
                All content, features, and functionality of the Service are owned by FinTech Hub and are protected 
                by copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, FINTECH HUB SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO 
                LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Termination</h2>
              <p>
                We reserve the right to terminate or suspend your account at any time for violations of these Terms. 
                You may cancel your account at any time through your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. Continued use of the Service after changes constitutes 
                acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Contact</h2>
              <p>
                For questions about these Terms, please contact us at support@fintechhub.com
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}
