"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Box, Typography, TextField, Button, Alert, CircularProgress } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/chat');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#0a0f14' }}>
        <CircularProgress size={32} sx={{ color: '#a8c7fa' }} />
      </Box>
    );
  }

  if (user) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        else setError('Check your email to confirm your account.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#080d12',
        backgroundImage: `
          radial-gradient(ellipse 80% 60% at 50% -20%, rgba(168,199,250,0.12) 0%, transparent 70%),
          radial-gradient(ellipse 40% 40% at 80% 80%, rgba(99,102,241,0.08) 0%, transparent 60%)
        `,
        p: 2,
      }}
    >
      {/* Floating orbs for depth */}
      <Box sx={{
        position: 'fixed', top: '10%', left: '5%', width: 300, height: 300,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,199,250,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'fixed', bottom: '15%', right: '8%', width: 200, height: 200,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          p: { xs: 3, sm: 5 },
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: 4,
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)',
            border: '1px solid rgba(168,199,250,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mb: 2.5,
            boxShadow: '0 8px 32px rgba(168,199,250,0.15)',
          }}>
            <SmartToyIcon sx={{ fontSize: 32, color: '#a8c7fa' }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#e8edf5', letterSpacing: '-0.5px' }}>
              MindBot
            </Typography>
            <AutoAwesomeIcon sx={{ fontSize: 16, color: '#a8c7fa' }} />
          </Box>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </Typography>
        </Box>

        {/* Error / info */}
        {error && (
          <Alert
            severity={error.includes('Check your email') ? 'success' : 'error'}
            sx={{
              mb: 3, borderRadius: 3,
              bgcolor: error.includes('Check') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: '1px solid',
              borderColor: error.includes('Check') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
              color: error.includes('Check') ? '#86efac' : '#fca5a5',
              '& .MuiAlert-icon': { color: 'inherit' },
            }}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleAuth}>
          <TextField
            fullWidth
            required
            type="email"
            label="Email address"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.04)',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                '&:hover fieldset': { borderColor: 'rgba(168,199,250,0.3)' },
                '&.Mui-focused fieldset': { borderColor: 'rgba(168,199,250,0.6)', borderWidth: 1.5 },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#a8c7fa' },
              '& .MuiInputBase-input': { color: '#e8edf5' },
            }}
          />
          <TextField
            fullWidth
            required
            type="password"
            label="Password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{
              mb: 3.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.04)',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                '&:hover fieldset': { borderColor: 'rgba(168,199,250,0.3)' },
                '&.Mui-focused fieldset': { borderColor: 'rgba(168,199,250,0.6)', borderWidth: 1.5 },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#a8c7fa' },
              '& .MuiInputBase-input': { color: '#e8edf5' },
            }}
          />

          <Button
            type="submit"
            fullWidth
            disabled={submitting}
            sx={{
              py: 1.5,
              borderRadius: 3,
              background: submitting
                ? 'rgba(168,199,250,0.1)'
                : 'linear-gradient(135deg, #1a4a8a 0%, #2563eb 100%)',
              color: '#e8edf5',
              fontWeight: 600,
              fontSize: '0.95rem',
              textTransform: 'none',
              border: '1px solid rgba(168,199,250,0.15)',
              boxShadow: submitting ? 'none' : '0 4px 20px rgba(37,99,235,0.3)',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d55a0 0%, #2f72f0 100%)',
                boxShadow: '0 6px 24px rgba(37,99,235,0.45)',
                transform: 'translateY(-1px)',
              },
              '&:active': { transform: 'translateY(0)' },
              '&.Mui-disabled': { color: 'rgba(232,237,245,0.4)' },
            }}
          >
            {submitting
              ? <CircularProgress size={20} sx={{ color: '#a8c7fa' }} />
              : (isLogin ? 'Sign in' : 'Create account')}
          </Button>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Box
                component="span"
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                sx={{
                  color: '#a8c7fa',
                  cursor: 'pointer',
                  fontWeight: 500,
                  '&:hover': { color: '#c8deff', textDecoration: 'underline' },
                  transition: 'color 0.15s',
                }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </Box>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
