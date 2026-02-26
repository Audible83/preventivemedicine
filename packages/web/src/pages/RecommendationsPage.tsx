import { useState, useEffect } from 'react';
import { DisclaimerBanner } from '../components/DisclaimerBanner.js';
import { api, type Recommendation } from '../services/api.js';

export function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  async function loadRecommendations() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRecommendations();
      setRecommendations(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }

  async function handleEvaluate() {
    setEvaluating(true);
    setError(null);
    try {
      const res = await api.evaluateGuidelines();
      setRecommendations(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  }

  async function handleDismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDismissingId(id);
    try {
      await api.dismissRecommendation(id);
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, dismissed: true } : r)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss recommendation');
    } finally {
      setDismissingId(null);
    }
  }

  const activeRecs = recommendations.filter((r) => !r.dismissed);
  const dismissedRecs = recommendations.filter((r) => r.dismissed);
  const riskRecs = activeRecs.filter((r) => r.riskSignal);
  const displayRecs = activeRecs.filter((r) => !r.riskSignal);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>Preventive Recommendations</h2>
          <p>Personalized, guideline-based suggestions for discussion with your clinician</p>
        </div>
        <div className="loading-state">Loading recommendations...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Preventive Recommendations</h2>
        <p>Personalized, guideline-based suggestions for discussion with your clinician</p>
      </div>

      {error && (
        <div className="feedback-error">{error}</div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          className="btn-primary"
          onClick={handleEvaluate}
          disabled={evaluating}
        >
          {evaluating ? 'Evaluating...' : 'Re-evaluate Guidelines'}
        </button>
        {dismissedRecs.length > 0 && (
          <button
            className="btn-secondary"
            onClick={() => setShowDismissed(!showDismissed)}
          >
            {showDismissed ? 'Hide Dismissed' : `Show Dismissed (${dismissedRecs.length})`}
          </button>
        )}
      </div>

      {/* Risk Signals */}
      {riskRecs.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', marginBottom: '0.75rem', color: 'var(--color-text)' }}>
            Risk Screening Signals
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
            These are not diagnoses. Discuss them with a qualified healthcare professional.
          </p>
          {riskRecs.map((rec) => (
            <div
              key={rec.id}
              className={`card rec-card priority-${rec.priority}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4>{rec.text}</h4>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', flexShrink: 0, marginLeft: '0.75rem' }}
                  onClick={(e) => handleDismiss(rec.id, e)}
                  disabled={dismissingId === rec.id}
                >
                  {dismissingId === rec.id ? '...' : 'Dismiss'}
                </button>
              </div>
              {rec.riskSignal && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', marginTop: '0.25rem' }}>
                  Signal: {rec.riskSignal}
                </p>
              )}
              {expanded === rec.id && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p>Category: {rec.category}</p>
                  <div className="source">Source: {rec.source}</div>
                  {rec.citation && (
                    <a
                      href={rec.citation}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View guideline source
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Active Recommendations */}
      {displayRecs.length > 0 ? (
        <div style={{ marginBottom: '1rem' }}>
          {displayRecs.map((rec) => (
            <div
              key={rec.id}
              className={`card rec-card priority-${rec.priority}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4>{rec.text}</h4>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', flexShrink: 0, marginLeft: '0.75rem' }}
                  onClick={(e) => handleDismiss(rec.id, e)}
                  disabled={dismissingId === rec.id}
                >
                  {dismissingId === rec.id ? '...' : 'Dismiss'}
                </button>
              </div>
              {expanded === rec.id && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p>Category: {rec.category}</p>
                  <div className="source">Source: {rec.source}</div>
                  {rec.citation && (
                    <a
                      href={rec.citation}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View guideline source
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        riskRecs.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', marginBottom: '1rem' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              No active recommendations. Click "Re-evaluate Guidelines" to check for new suggestions based on your data.
            </p>
          </div>
        )
      )}

      {/* Dismissed Recommendations */}
      {showDismissed && dismissedRecs.length > 0 && (
        <div style={{ marginBottom: '1rem', opacity: 0.6 }}>
          <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
            Dismissed
          </h3>
          {dismissedRecs.map((rec) => (
            <div
              key={rec.id}
              className={`card rec-card priority-${rec.priority}`}
              style={{ cursor: 'default' }}
            >
              <h4 style={{ textDecoration: 'line-through' }}>{rec.text}</h4>
              <div className="source">Source: {rec.source}</div>
            </div>
          ))}
        </div>
      )}

      <DisclaimerBanner />
    </div>
  );
}
