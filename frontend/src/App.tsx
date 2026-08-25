import { BrowserRouter, MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { isInVsCode } from "./services/vscodeBridge";
import ProtectedRoute from "./components/ProtectedRoute";
import VsCodeIntegration from "./components/VsCodeIntegration";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import WorkspacesListPage from "./pages/WorkspacesListPage";
import WorkspaceDetailPage from "./pages/WorkspaceDetailPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import CapsuleDetailPage from "./pages/CapsuleDetailPage";
import KnowledgeSearchPage from "./pages/KnowledgeSearchPage";
import GlobalKnowledgePage from "./pages/GlobalKnowledgePage";
import GlobalQAPage from "./pages/GlobalQAPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  // MemoryRouter inside VS Code webviews (in-memory location, no real URL
  // bar); BrowserRouter stays for normal browser development.
  const Router = isInVsCode ? MemoryRouter : BrowserRouter;
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* Must live INSIDE the Router: it calls useNavigate(). */}
        <Router>
          <VsCodeIntegration />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspaces"
              element={
                <ProtectedRoute>
                  <Layout>
                    <WorkspacesListPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspaces/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <WorkspaceDetailPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectDetailPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/capsules/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CapsuleDetailPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge"
              element={
                <ProtectedRoute>
                  <Layout>
                    <KnowledgeSearchPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge/global"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GlobalKnowledgePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/community"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GlobalQAPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NotificationsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProfilePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
