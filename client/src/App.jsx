import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AdminProvider } from './context/AdminContext.jsx';
import EmergencyStrip from './components/EmergencyStrip.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

// Heavy pages are code-split so the landing page stays fast
// (the hospital map pulls in all of Leaflet).
const Hospitals = lazy(() => import('./pages/Hospitals.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));

function LazyFallback() {
  return (
    <div className="px-7 py-16">
      <div className="mc-shimmer h-8 w-56 mb-6" />
      <div className="mc-shimmer h-72 rounded-[14px]" />
    </div>
  );
}

/** Scroll to top on route change; honour #hash anchors for in-page links. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function PageShell() {
  const { initialising } = useAuth();

  if (initialising) {
    // Session restore — brief branded splash, never a blank screen.
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <span className="mc-spinner !border-ink/20 !border-t-ink !w-8 !h-8" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <EmergencyStrip />
      <Navbar />
      <main className="flex-1">
        <div className="max-w-[1080px] mx-auto bg-paper shadow-page">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/hospitals"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <Hospitals />
                </Suspense>
              }
            />
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <ScrollManager />
        <Routes>
          {/* Admin console lives outside the public shell: own layout, own auth */}
          <Route
            path="/admin/login"
            element={
              <Suspense fallback={<LazyFallback />}>
                <AdminLogin />
              </Suspense>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Suspense fallback={<LazyFallback />}>
                  <AdminLayout />
                </Suspense>
              </RequireAdmin>
            }
          />
          <Route path="/*" element={<PageShell />} />
        </Routes>
      </AdminProvider>
    </BrowserRouter>
  );
}
