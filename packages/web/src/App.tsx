import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { Dashboard } from './pages/Dashboard.js';
import { TimelinePage } from './pages/TimelinePage.js';
import { UploadPage } from './pages/UploadPage.js';
import { RecommendationsPage } from './pages/RecommendationsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </Layout>
  );
}
