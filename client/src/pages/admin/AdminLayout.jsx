import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import AdminOverview from './AdminOverview.jsx';
import Logo from '../../components/Logo.jsx';

// Admin console shell: dark sidebar + content. The overview page owns the
// tab state; the sidebar switches tabs (Dashboard scrolls to the top).
export default function AdminLayout() {
  const { logout } = useAdmin();
  const navigate = useNavigate();
  const [tab, setTab] = useState('hospitals');
  const [search, setSearch] = useState('');

  const links = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'hospitals', label: 'Hospitals' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'users', label: 'Users' },
  ];

  function go(id) {
    if (id === 'dashboard') {
      setTab('hospitals');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setTab(id);
      document.getElementById('admin-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function doLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen grid md:grid-cols-[224px_1fr] bg-paper">
      <aside className="bg-ink-deep text-[#B9C2D4] p-0 flex-col hidden md:flex">
        <div className="px-6 pt-7 pb-5 flex items-center gap-2.5">
          <Logo light />
          <span className="font-serif text-lg font-bold text-paper">MediCheck</span>
        </div>
        <div className="text-[11px] font-extrabold tracking-[2px] text-[#5C6B84] px-6 pb-3.5">ADMIN CONSOLE</div>
        <nav className="flex-1">
          {links.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => go(l.id)}
              className={`w-full text-left flex items-center gap-3 px-6 py-3 text-[13.5px] font-semibold border-l-[3px] transition-colors duration-200 ${
                (l.id === 'dashboard' && tab === 'hospitals') || tab === l.id
                  ? 'bg-ink text-white border-amber-bright'
                  : 'border-transparent hover:bg-ink/60 text-[#B9C2D4]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={doLogout}
          className="text-left px-6 py-4 text-[13.5px] font-semibold text-[#8E9BB8] hover:text-white border-t border-ink-slate/40 transition-colors duration-200"
        >
          Logout
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden bg-ink-deep text-paper px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Logo light />
          <span className="font-serif font-bold">Admin</span>
        </div>
        <div className="flex gap-1">
          {links.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => go(l.id)}
              className={`text-[12px] font-bold px-2.5 py-1.5 rounded-lg ${
                tab === l.id || (l.id === 'dashboard' && tab === 'hospitals')
                  ? 'bg-amber-bright text-ink-deep'
                  : 'text-[#B9C2D4]'
              }`}
            >
              {l.label}
            </button>
          ))}
          <button type="button" onClick={doLogout} className="text-[12px] font-bold px-2.5 py-1.5 text-[#8E9BB8]">
            Out
          </button>
        </div>
      </div>

      <AdminOverview tab={tab} setTab={setTab} search={search} setSearch={setSearch} />
    </div>
  );
}
