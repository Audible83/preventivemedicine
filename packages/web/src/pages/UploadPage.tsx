import { useState, useCallback } from 'react';
import { DisclaimerBanner } from '../components/DisclaimerBanner.js';

export function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState({
    category: 'lab',
    code: '',
    displayName: '',
    value: '',
    unit: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setUploadStatus(`Selected: ${files[0].name} — Upload functionality connects to /api/upload`);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadStatus(`Selected: ${files[0].name} — Upload functionality connects to /api/upload`);
    }
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadStatus(`Manual entry submitted: ${manualEntry.displayName} = ${manualEntry.value} ${manualEntry.unit}`);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Upload Health Data</h2>
        <p>Import your records from CSV, PDF, or enter manually</p>
      </div>

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="upload-icon">📁</div>
        <p><strong>Drop files here</strong> or click to browse</p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Supports CSV, PDF (up to 10MB)</p>
        <input
          id="file-input"
          type="file"
          accept=".csv,.pdf,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {uploadStatus && (
        <div className="card" style={{ marginBottom: '1rem', background: '#f0fdf4', borderColor: '#86efac' }}>
          <p style={{ fontSize: '0.875rem' }}>{uploadStatus}</p>
        </div>
      )}

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
                onChange={(e) => setManualEntry({ ...manualEntry, displayName: e.target.value, code: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
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
          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
            Add Observation
          </button>
        </form>
      </div>

      <DisclaimerBanner />
    </div>
  );
}
