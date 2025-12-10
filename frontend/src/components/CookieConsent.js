import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      essential: true,
      analytics: true,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  const acceptEssentialOnly = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700 shadow-2xl">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-white mb-1">Cookie Preferences</h3>
            <p className="text-sm text-slate-400">
              We use cookies to enhance your experience, analyze site traffic, and for marketing purposes. 
              By clicking "Accept All", you consent to our use of cookies. Read our{' '}
              <Link to="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</Link> for more information.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={acceptEssentialOnly}
            className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            Essential Only
          </Button>
          <Button
            size="sm"
            onClick={acceptCookies}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Accept All
          </Button>
          <button
            onClick={acceptEssentialOnly}
            className="p-1 text-slate-400 hover:text-white md:hidden"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
