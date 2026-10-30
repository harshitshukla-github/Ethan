import { useState } from 'react';
import { Link } from 'react-router';
import { faEarthAmericas, faSatellite } from '@fortawesome/free-solid-svg-icons';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';
import FormField from '../components/FormField.jsx';
import MissionCard from '../components/MissionCard.jsx';
import PlanetCard from '../components/PlanetCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { firstName, formatDate } from '../lib/format.js';
import { PASSWORD_MIN_LENGTH, collectErrors, nameError, newPasswordError } from '../lib/validation.js';

function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const { notify } = useToast();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const problem = nameError(name);
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      await updateProfile({ name });
      notify('Your name has been updated.');
    } catch (err) {
      setError(err.fields?.name ?? err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card settings-card" onSubmit={handleSubmit} noValidate>
      <h3>Profile</h3>
      <FormField
        label="Name"
        name="name"
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={error}
      />
      <FormField label="Email" type="email" value={user.email} readOnly hint="Your email is used to sign in." />
      <button type="submit" className="btn btn--primary btn--sm" disabled={saving || name.trim() === user.name}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

function PasswordForm() {
  const { changePassword } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const problems = collectErrors({
      currentPassword: form.currentPassword ? null : 'Enter your current password.',
      newPassword: newPasswordError(form.newPassword),
    });
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSaving(true);
    try {
      await changePassword(form);
      setForm({ currentPassword: '', newPassword: '' });
      notify('Password changed. Your other devices have been signed out.');
    } catch (err) {
      setErrors(Object.keys(err.fields ?? {}).length > 0 ? err.fields : { newPassword: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card settings-card" onSubmit={handleSubmit} noValidate>
      <h3>Password</h3>
      <FormField
        label="Current password"
        type="password"
        name="current-password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={update('currentPassword')}
        error={errors.currentPassword}
      />
      <FormField
        label="New password"
        type="password"
        name="new-password"
        autoComplete="new-password"
        value={form.newPassword}
        onChange={update('newPassword')}
        error={errors.newPassword}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
      />
      <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
        {saving ? 'Updating…' : 'Change password'}
      </button>
    </form>
  );
}

function DeleteAccount() {
  const { deleteAccount } = useAuth();
  const { notify } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!password) {
      setError('Enter your password to confirm.');
      return;
    }

    setDeleting(true);
    try {
      // Once the account is gone <RequireAuth> sends the visitor to the home page.
      await deleteAccount(password);
      notify('Your account and saved items have been deleted.');
    } catch (err) {
      setError(err.fields?.password ?? err.message);
      setDeleting(false);
    }
  }

  return (
    <form className="card settings-card settings-card--danger" onSubmit={handleSubmit} noValidate>
      <h3>Delete account</h3>
      <p>This permanently removes your account and everything you have saved. It cannot be undone.</p>
      {confirming ? (
        <>
          <FormField
            label="Confirm with your password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error}
          />
          <div className="settings-card__actions">
            <button type="submit" className="btn btn--danger btn--sm" disabled={deleting}>
              {deleting ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirming(true)}>
          Delete my account
        </button>
      )}
    </form>
  );
}

function SavedSection({ title, source, items, renderItem, empty }) {
  return (
    <section className="section">
      <div className="section__header">
        <h2>
          {title} <span className="count">{items.length}</span>
        </h2>
      </div>
      {source.loading && <Loading />}
      {source.error && <ErrorMessage error={source.error} onRetry={source.reload} />}
      {source.data && (items.length > 0 ? <div className="grid grid--cards">{items.map(renderItem)}</div> : empty)}
    </section>
  );
}

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const planets = useApi('/planets');
  const missions = useApi('/missions');

  // Favorites only hold ids, most recently saved first; look each one up in the catalog.
  const saved = (type, catalog = []) =>
    favorites
      .filter((favorite) => favorite.type === type)
      .map((favorite) => catalog.find((item) => item.id === favorite.id))
      .filter(Boolean);

  const savedPlanets = saved('planet', planets.data?.planets);
  const savedMissions = saved('mission', missions.data?.missions);

  return (
    <div className="container page">
      <header className="dashboard-header">
        <span className="avatar avatar--lg">{user.name.charAt(0).toUpperCase()}</span>
        <div>
          <p className="eyebrow">Mission control</p>
          <h1>Hello, {firstName(user.name)}</h1>
          <p className="dashboard-header__meta">
            {user.email} · Member since {formatDate(user.createdAt)}
          </p>
        </div>
      </header>

      <SavedSection
        title="Saved worlds"
        source={planets}
        items={savedPlanets}
        renderItem={(planet) => <PlanetCard key={planet.id} planet={planet} />}
        empty={
          <EmptyState icon={faEarthAmericas} title="No worlds saved yet">
            <p>Tap the heart on any planet to keep it here.</p>
            <Link to="/planets" className="btn btn--ghost btn--sm">
              Explore the solar system
            </Link>
          </EmptyState>
        }
      />

      <SavedSection
        title="Saved missions"
        source={missions}
        items={savedMissions}
        renderItem={(mission) => <MissionCard key={mission.id} mission={mission} />}
        empty={
          <EmptyState icon={faSatellite} title="No missions saved yet">
            <p>Tap the heart on any mission to follow it from here.</p>
            <Link to="/missions" className="btn btn--ghost btn--sm">
              Browse missions
            </Link>
          </EmptyState>
        }
      />

      <section className="section">
        <div className="section__header">
          <h2>Account settings</h2>
        </div>
        <div className="settings-grid">
          <ProfileForm />
          <PasswordForm />
          <DeleteAccount />
        </div>
      </section>
    </div>
  );
}
