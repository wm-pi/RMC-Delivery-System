import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuthStore } from '~/shared/lib/auth.store';

const NAV_ITEMS = [
  { to: '/site', label: '주문 현황', end: true },
  { to: '/site/orders/new', label: '신규 주문', end: false },
  { to: '/site/map', label: '실시간 지도', end: false },
];

export default function SiteLayout() {
  const navigate = useNavigate();
  const { role, siteId, siteName, logout } = useAuthStore();

  useEffect(() => {
    if (role !== 'site' || !siteId) navigate('/', { replace: true });
  }, [role, siteId, navigate]);

  if (role !== 'site' || !siteId) return null;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-4 bg-[#1e3a5f] px-5 text-white shadow-md">
        <span className="text-lg">🏗️</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold">{siteName}</div>
          <div className="text-[10px] text-blue-200">건설현장 화면</div>
        </div>
        <nav className="ml-auto flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                  isActive ? 'bg-white/20 font-bold' : 'text-white/65 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            className="ml-2 rounded-md border border-white/30 px-2.5 py-1 text-xs text-white/70 hover:text-white"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            로그아웃
          </button>
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
