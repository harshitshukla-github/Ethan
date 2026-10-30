import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faRightToBracket, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import FormField from '../components/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { firstName } from '../lib/format.js';
import { collectErrors, emailError } from '../lib/validation.js';

export default function Login() {
  usePageTitle('Sign in');
  const { login } = useAuth();
  const { notify } = useToast();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = collectErrors({
      email: emailError(form.email),
      password: form.password ? null : 'Enter your password.',
    });
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      // On success <GuestOnly> sees the signed-in user and redirects to wherever they were headed.
      const user = await login(form);
      notify(`Welcome back, ${firstName(user.name)}.`);
    } catch (err) {
      setFieldErrors(err.fields ?? {});
      setFormError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <section className="container auth">
      <div className="card auth__card">
        <span className="icon-tile icon-tile--lg">
          <FontAwesomeIcon icon={faRightToBracket} />
        </span>
        <h1>Welcome back</h1>
        <p className="auth__lede">Sign in to see your saved worlds and missions.</p>

        <form onSubmit={handleSubmit} noValidate>
          {formError && (
            <p className="form-error" role="alert">
              <FontAwesomeIcon icon={faTriangleExclamation} /> {formError}
            </p>
          )}
          <FormField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            error={fieldErrors.email}
          />
          <FormField
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={form.password}
            onChange={update('password')}
            error={fieldErrors.password}
          />
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting && <FontAwesomeIcon icon={faCircleNotch} spin />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth__switch">
          New here?{' '}
          <Link to="/register" state={location.state}>
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}
