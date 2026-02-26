import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { Dashboard } from './pages/Dashboard.js';
import { TimelinePage } from './pages/TimelinePage.js';
import { UploadPage } from './pages/UploadPage.js';
import { RecommendationsPage } from './pages/RecommendationsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/timeline" element={<TimelinePage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
