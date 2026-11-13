import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.svg';
import { getSupabaseClient } from '../lib/supabase';

type AuthMode = 'login' | 'signup';

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        navigate('/profile');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;

      setPassword('');

      if (data.session) {
        navigate('/profile');
        return;
      }

      setMode('login');
      setStatusMessage(
        'Account created. Check your email for the confirmation link, then log in.',
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Authentication could not be completed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSigningUp = mode === 'signup';

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <img className="auth-logo-image" src={logo} alt="CSPN" />

        {errorMessage && (
          <p className="auth-message auth-message-error" role="alert">
            {errorMessage}
          </p>
        )}

        {statusMessage && (
          <p className="auth-message auth-message-status" role="status">
            {statusMessage}
          </p>
        )}

        <label className="auth-field">
          Email:
          <input
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="auth-field">
          Password:
          <span className="password-input">
            <input
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSigningUp ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? '◉' : '◌'}
            </button>
          </span>
        </label>

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isSigningUp
              ? 'Creating account…'
              : 'Signing in…'
            : isSigningUp
              ? 'Sign Up'
              : 'Login'}
        </button>

        <button
          className="auth-switch"
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            setMode((currentMode) =>
              currentMode === 'login' ? 'signup' : 'login',
            );
            setErrorMessage(null);
            setStatusMessage(null);
          }}
        >
          {isSigningUp
            ? 'Already have an account? Log in'
            : 'Need an account? Sign up'}
        </button>
      </form>
    </main>
  );
}
