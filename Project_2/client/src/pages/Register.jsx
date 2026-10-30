import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faTriangleExclamation, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import FormField from '../components/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { firstName } from '../lib/format.js';
import { PASSWORD_MIN_LENGTH, collectErrors, emailError, nameError, newPasswordError } from '../lib/validation.js';

export default function Register() {
  usePageTitle('Create account');
  const { register } = useAuth();
  const { notify } = useToast();
  const location = useLocation();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = collectErrors({
      name: nameError(form.name),
      email: emailError(form.email),
      password: newPasswordError(form.password),
    });
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      // On success <GuestOnly> sees the signed-in user and redirects to wherever they were headed.
      const user = await register(form);
      notify(`Welcome aboard, ${firstName(user.name)}.`);
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
          <FontAwesomeIcon icon={faUserPlus} />
        </span>
        <h1>Create your account</h1>
        <p className="auth__lede">Save your favorite worlds and missions and find them again on any device.</p>

        <form onSubmit={handleSubmit} noValidate>
          {formError && (
            <p className="form-error" role="alert">
              <FontAwesomeIcon icon={faTriangleExclamation} /> {formError}
            </p>
          )}
          <FormField
            label="Name"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={update('name')}
            error={fieldErrors.name}
          />
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
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            error={fieldErrors.password}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters. A long phrase works well.`}
          />
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting && <FontAwesomeIcon icon={faCircleNotch} spin />}
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth__switch">
          Already have an account?{' '}
          <Link to="/login" state={location.state}>
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
