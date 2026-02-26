import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { api, type Integration } from '../services/api.js';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [profile, setProfile] = useState({
    displayName: '',
    dateOfBirth: '',
    sex: '',
    heightCm: '',
    weightKg: '',
    consentNotifications: false,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data management
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Integrations
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  // Initialize profile from auth user
  useEffect(() => {
    if (user) {
      setProfile({
        displayName: user.displayName || '',
        dateOfBirth: user.dateOfBirth || '',
        sex: user.sex || '',
        heightCm: user.heightCm != null ? String(user.heightCm) : '',
        weightKg: user.weightKg != null ? String(user.weightKg) : '',
        consentNotifications: user.consentNotifications || false,
      });
    }
  }, [user]);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      const res = await api.getIntegrations();
      setIntegrations(res.data || []);
    } catch {
      // Non-critical
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await api.updateProfile({
        displayName: profile.displayName,
        dateOfBirth: profile.dateOfBirth || undefined,
        sex: profile.sex || undefined,
        heightCm: profile.heightCm ? Number(profile.heightCm) : undefined,
        weightKg: profile.weightKg ? Number(profile.weightKg) : undefined,
        consentNotifications: profile.consentNotifications,
      });
      await refreshUser();
      setFeedback({ type: 'success', message: 'Profile saved successfully.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setFeedback(null);
    try {
      const data = await api.exportData();
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pm-valet-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: 'Data exported successfully.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to export data.',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setFeedback(null);
    try {
      await api.deleteData();
      setFeedback({ type: 'success', message: 'All data has been deleted.' });
      setShowDeleteConfirm(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete data.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Profile & Settings</h2>
        <p>Manage your information and preferences</p>
      </div>

      {feedback && (
        <div className={feedback.type === 'success' ? 'feedback-success' : 'feedback-error'}>
          {feedback.message}
        </div>
      )}

      {/* Demographics */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Demographics</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                value={profile.dateOfBirth}
                onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Sex</label>
              <select
                value={profile.sex}
                onChange={(e) => setProfile({ ...profile, sex: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div className="form-group">
              <label>Height (cm)</label>
              <input
                type="number"
                value={profile.heightCm}
                onChange={(e) => setProfile({ ...profile, heightCm: e.target.value })}
                placeholder="175"
              />
            </div>
            <div className="form-group">
              <label>Weight (kg)</label>
              <input
                type="number"
                value={profile.weightKg}
                onChange={(e) => setProfile({ ...profile, weightKg: e.target.value })}
                placeholder="70"
              />
            </div>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={profile.consentNotifications}
                onChange={(e) => setProfile({ ...profile, consentNotifications: e.target.checked })}
                style={{ width: 'auto' }}
              />
              Receive preventive reminders and health nudges
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Connected Integrations</h3>
          {integrations.map((integration) => (
            <div
              key={integration.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.625rem 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.875rem' }}>{integration.name}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>
                  {integration.type}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: integration.connected ? 'var(--color-success)' : 'var(--color-text-secondary)',
                  fontWeight: 500,
                }}
              >
                {integration.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Data Management */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Data Management</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          Export or delete all your health data. Exported data includes your profile, observations, recommendations, and reminders.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export All Data (JSON)'}
          </button>
          <button
            className="btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={showDeleteConfirm}
          >
            Delete All Data
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="confirm-dialog">
            <p>
              Are you sure you want to permanently delete all your health data? This action cannot be undone.
            </p>
            <div className="confirm-actions">
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
