import { useState, useCallback, useEffect } from 'react';
import { DisclaimerBanner } from '../components/DisclaimerBanner.js';
import { api, type Integration } from '../services/api.js';

export function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState({
    category: 'lab',
    code: '',
    displayName: '',
    value: '',
    unit: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      const res = await api.getIntegrations();
      setIntegrations(res.data || []);
    } catch {
      // Integrations are optional; silently fail
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setFeedback(null);
    try {
      const res = await api.uploadFile(file);
      setFeedback({
        type: 'success',
        message: res.message || `File "${file.name}" uploaded successfully.${res.observations ? ` ${res.observations} observation(s) imported.` : ''}`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Upload failed. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  }, []);

  async function handleImport(integration: Integration) {
    setImportingId(integration.id);
    setFeedback(null);
    try {
      const res = await api.importIntegration(integration.id);
      setFeedback({
        type: 'success',
        message: res.message || `Data imported from ${integration.name}.${res.observations ? ` ${res.observations} observation(s) imported.` : ''}`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : `Import from ${integration.name} failed.`,
      });
    } finally {
      setImportingId(null);
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualSubmitting(true);
    setFeedback(null);
    try {
      await api.createObservation({
        code: manualEntry.code || manualEntry.displayName.toLowerCase().replace(/\s+/g, '-'),
        displayName: manualEntry.displayName,
        category: manualEntry.category,
        value: parseFloat(manualEntry.value),
        unit: manualEntry.unit,
        effectiveDate: manualEntry.date,
      });
      setFeedback({
        type: 'success',
        message: `Observation "${manualEntry.displayName}" added successfully.`,
      });
      // Reset form
      setManualEntry({
        category: 'lab',
        code: '',
        displayName: '',
        value: '',
        unit: '',
        date: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to add observation.',
      });
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Upload Health Data</h2>
        <p>Import your records from CSV, PDF, or enter manually</p>
      </div>

      {/* File Upload Zone */}
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        style={uploading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
      >
        <div className="upload-icon">
          {uploading ? '...' : '+'}
        </div>
        <p><strong>{uploading ? 'Uploading...' : 'Drop files here'}</strong>{!uploading && ' or click to browse'}</p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Supports CSV, PDF (up to 10MB)</p>
        <input
          id="file-input"
          type="file"
          accept=".csv,.pdf,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={feedback.type === 'success' ? 'feedback-success' : 'feedback-error'}>
          {feedback.message}
        </div>
      )}

      {/* Integrations */}
      {integrations.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Connected Integrations</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
            Import data from your connected devices and services. By clicking import, you consent to importing this data.
          </p>
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
                {integration.lastSync && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '0.75rem' }}>
                    Last synced: {new Date(integration.lastSync).toLocaleDateString()}
                  </span>
                )}
              </div>
              <button
                className="btn-secondary"
                onClick={() => handleImport(integration)}
                disabled={importingId === integration.id}
                style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
              >
                {importingId === integration.id ? 'Importing...' : 'Import'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Manual Entry */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Manual Entry</h3>
        <form onSubmit={handleManualSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={manualEntry.category}
                onChange={(e) => setManualEntry({ ...manualEntry, category: e.target.value })}
              >
                <option value="lab">Lab</option>
                <option value="vital">Vital</option>
                <option value="activity">Activity</option>
                <option value="sleep">Sleep</option>
                <option value="nutrition">Nutrition</option>
                <option value="survey">Survey</option>
              </select>
            </div>
            <div className="form-group">
              <label>Test/Metric Name</label>
              <input
                type="text"
                placeholder="e.g., Blood Glucose"
                value={manualEntry.displayName}
                onChange={(e) => setManualEntry({
                  ...manualEntry,
                  displayName: e.target.value,
                  code: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Value</label>
              <input
                type="number"
                step="any"
                placeholder="e.g., 95"
                value={manualEntry.value}
                onChange={(e) => setManualEntry({ ...manualEntry, value: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <input
                type="text"
                placeholder="e.g., mg/dL"
                value={manualEntry.unit}
                onChange={(e) => setManualEntry({ ...manualEntry, unit: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={manualEntry.date}
                onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: '0.5rem' }}
            disabled={manualSubmitting}
          >
            {manualSubmitting ? 'Adding...' : 'Add Observation'}
          </button>
        </form>
      </div>

      <DisclaimerBanner />
    </div>
  );
}
