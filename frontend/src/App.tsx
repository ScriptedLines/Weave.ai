import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import VerificationWaiting from './pages/VerificationWaiting';
import OnboardingDNA from './pages/OnboardingDNA';
import DashboardPage from './pages/DashboardPage';
import StudioPage from './pages/StudioPage';
import TechArchive from './pages/TechArchive';
import TrainingDiagram from './pages/TrainingDiagram'
import RecommendationDocs from './pages/RecommendationDocs'
import InferenceDocs from './pages/InferenceDocs'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/verify-waiting" element={<VerificationWaiting />} />
          <Route path="/onboarding-dna" element={<ProtectedRoute><OnboardingDNA /></ProtectedRoute>} />
          
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/studio" element={<ProtectedRoute><StudioPage /></ProtectedRoute>} />
          
          {/* Public Docs */}
          <Route path="/docs/archive" element={<TechArchive />} />
          <Route path="/docs/training" element={<TrainingDiagram />} />
          <Route path="/docs/recommendation" element={<RecommendationDocs />} />
          <Route path="/docs/inference" element={<InferenceDocs />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App