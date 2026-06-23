import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuthStore } from '~/shared/lib/auth.store';

const NAV_ITEMS = [
  { to: '/plant', label: '주문/배차', end: true },
  { to: '/plant/vehicles', label: '차량 관리', end: false },
  { to: '/plant/map', label: '실시간 지도', end: false },
];

export default function PlantLayout() {
  const navigate = useNavigate();
  const { role, plantId, plantName, logout } = useAuthStore();

  useEffect(() => {
    if (role !== 'plant' || !plantId) navigate('/', { replace: true });
  }, [role, plantId, navigate]);

  if (role !== 'plant' || !plantId) return null;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-4 bg-[#11304d] px-5 text-white shadow-md">
        <span className="text-lg">🏭</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold">{plantName}</div>
          <div className="text-[10px] text-sky-200">레미콘업체 화면</div>
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
