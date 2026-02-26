import { useState } from 'react';
import { DisclaimerBanner } from '../components/DisclaimerBanner.js';

interface Rec {
  id: string;
  text: string;
  category: string;
  source: string;
  priority: 'low' | 'medium' | 'high';
  citation?: string;
}

// Placeholder data
const MOCK_RECS: Rec[] = [
  {
    id: '1',
    text: 'Based on your age group, it may be helpful to discuss blood pressure screening with a clinician.',
    category: 'screening',
    source: 'USPSTF 2023',
    priority: 'high',
    citation: 'https://www.uspreventiveservicestaskforce.org/',
  },
  {
    id: '2',
    text: 'Adults aged 40-75 may benefit from discussing statin therapy and cardiovascular risk with their healthcare provider.',
    category: 'screening',
    source: 'USPSTF 2022',
    priority: 'medium',
  },
  {
    id: '3',
    text: 'Your step count trend shows an improving pattern. Continuing regular physical activity supports long-term cardiovascular health.',
    category: 'lifestyle',
    source: 'AHA 2024',
    priority: 'low',
  },
  {
    id: '4',
    text: 'Consider discussing colorectal cancer screening options with a clinician if you are between ages 45 and 75.',
    category: 'screening',
    source: 'USPSTF 2021',
    priority: 'medium',
    citation: 'https://www.uspreventiveservicestaskforce.org/',
  },
  {
    id: '5',
    text: 'Your sleep data suggests an average of 7.2 hours per night, which aligns with recommended adult sleep duration.',
    category: 'lifestyle',
    source: 'AASM/SRS Guidelines',
    priority: 'low',
  },
];

export function RecommendationsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <div className="page-header">
        <h2>Preventive Recommendations</h2>
        <p>Personalized, guideline-based suggestions for discussion with your clinician</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        {MOCK_RECS.map((rec) => (
          <div
            key={rec.id}
            className={`card rec-card priority-${rec.priority}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
          >
            <h4>{rec.text}</h4>
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
                  >
                    View guideline source
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <DisclaimerBanner />
    </div>
  );
}
