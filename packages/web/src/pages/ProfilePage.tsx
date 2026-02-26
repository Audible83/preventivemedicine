import { useState } from 'react';

export function ProfilePage() {
  const [profile, setProfile] = useState({
    displayName: '',
    dateOfBirth: '',
    sex: '',
    heightCm: '',
    weightKg: '',
    consentNotifications: false,
  });
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Profile & Settings</h2>
        <p>Manage your information and preferences</p>
      </div>

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
          <button type="submit" className="btn-primary">Save Profile</button>
          {saved && <span style={{ marginLeft: '1rem', color: 'var(--color-success)', fontSize: '0.875rem' }}>Saved!</span>}
        </form>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Data Management</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          Export or delete all your health data. Exported data includes your profile, observations, recommendations, and reminders.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary">Export All Data (JSON)</button>
          <button className="btn-danger">Delete All Data</button>
        </div>
      </div>
    </div>
  );
}
