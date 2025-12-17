import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, TrendingUp, Chrome } from 'lucide-react';
import { API } from '@/lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      if (response.data.success) {
        sessionStorage.setItem('just_authenticated', 'true');
        sessionStorage.setItem('user_data', JSON.stringify(response.data.user));
        toast.success('Welcome back!');
        navigate('/dashboard', { replace: true, state: { user: response.data.user } });
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      {/* Simple professional background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0F172A] to-slate-900" />
      
      <Card className="relative w-full max-w-md p-8 bg-slate-800/70 border-slate-600/50 rounded-2xl shadow-2xl backdrop-blur-sm">
        {/* Logo - Clean and Professional */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-blue-600">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              MarketMorning
            </h1>
          </div>
          <p className="text-slate-300 text-sm">Professional Trading Platform</p>
        </div>

        {/* Google Login - Primary CTA */}
        <Button
          onClick={handleGoogleLogin}
          className="w-full mb-5 bg-white hover:bg-gray-100 text-gray-800 font-semibold h-12 rounded-xl shadow-lg transition-all duration-200"
        >
          <Chrome className="w-5 h-5 mr-2" />
          Continue with Google
        </Button>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-slate-800 text-slate-300">or continue with email</span>
          </div>
        </div>

        {/* Email Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-100 font-medium">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-300" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-slate-700/50 border-slate-500/50 text-white placeholder:text-slate-400 rounded-xl focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-100 font-medium">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-300" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 bg-slate-700/50 border-slate-500/50 text-white placeholder:text-slate-400 rounded-xl focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/20 transition-all duration-200 hover:shadow-teal-500/30 hover:-translate-y-0.5"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </Button>
        </form>

        <p className="text-center mt-6 text-slate-500 text-sm">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
            Sign up
          </Link>
        </p>

        {/* Legal Links */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-slate-600">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="text-teal-500 hover:text-teal-400 transition-colors">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-teal-500 hover:text-teal-400 transition-colors">Privacy Policy</Link>
        </div>
      </Card>
    </div>
  );
}
