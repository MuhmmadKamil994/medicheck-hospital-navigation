import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#B07818" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

const linkCls = ({ isActive }) =>
  `mc-link pb-[3px] ${
    isActive
      ? 'text-ink font-bold border-b-[2.5px] border-amber'
      : 'text-muted hover:text-ink'
  }`;

/**
 * Sticky navbar. Shows Login / Create account for guests;
 * avatar + Dashboard + Logout for authenticated users.
 */
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.fullName
    ? user.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="no-print sticky top-0 z-50 bg-paper border-b border-line">
      <div className="max-w-[1080px] mx-auto flex items-center justify-between px-7 py-[15px]">
        <Link to="/" className="flex items-center gap-[11px] mc-link" aria-label="MediCheck home">
          <Logo />
          <span className="font-serif font-bold text-[22px] text-ink">MediCheck</span>
        </Link>

        <nav className="hidden min-[860px]:flex gap-[26px] text-sm font-medium" aria-label="Primary">
          <NavLink to="/" end className={linkCls}>
            Symptom Checker
          </NavLink>
          <NavLink to="/hospitals" className={linkCls}>
            Find Hospitals
          </NavLink>
          <a href="/#how-it-works" className="mc-link text-muted hover:text-ink">
            How It Works
          </a>
          <NavLink to="/dashboard" className={linkCls}>
            My Dashboard
          </NavLink>
        </nav>

        <div className="flex items-center gap-[14px]">
          <span className="hidden min-[860px]:flex items-center gap-[6px] text-[13px] font-semibold text-muted bg-sand border border-[#E0D7C2] px-[14px] py-[7px] rounded-full">
            <PinIcon /> Bahawalpur
          </span>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center font-bold text-sm mc-btn hover:bg-ink-deep"
                title={user?.fullName || 'My dashboard'}
              >
                {initials}
              </Link>
              <button
                onClick={handleLogout}
                className="mc-btn text-[13.5px] font-semibold text-muted hover:text-ink px-3 py-[9px]"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="mc-btn text-[13.5px] font-semibold text-ink px-3 py-[9px] rounded-lg hover:bg-sand"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="mc-btn text-[13.5px] font-bold text-paper bg-ink px-[22px] py-[10px] rounded-[9px] hover:bg-ink-deep"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
