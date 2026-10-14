import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.svg';

export default function AuthPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Authentication will be connected to Supabase in a later sprint.
    navigate('/profile');
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <img className="auth-logo-image" src={logo} alt="ESPN" />

        <label className="auth-field">
          Username or Email:
          <input name="username" defaultValue="johnsuperfan" autoComplete="username" required />
        </label>

        <label className="auth-field">
          Password:
          <span className="password-input">
            <input
              name="password"
              defaultValue="johnpassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
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

        <button className="auth-submit" type="submit">Login</button>
      </form>
    </main>
  );
}
