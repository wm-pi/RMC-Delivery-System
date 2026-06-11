// 시작 화면 — 프로토타입은 로그인 대신 역할(현장/업체)과 소속을 선택한다

import { useNavigate } from 'react-router';
import { usePlants, useSites } from '~/entities/master/queries';
import { useRoleStore } from '~/shared/lib/role.store';
import { Spinner } from '~/shared/ui';

export default function RoleSelect() {
  const navigate = useNavigate();
  const { selectSite, selectPlant } = useRoleStore();
  const { data: sites, isLoading: sitesLoading } = useSites();
  const { data: plants, isLoading: plantsLoading } = usePlants();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6">
      <div className="mb-8 text-center">
        <div className="text-4xl">🚛</div>
        <h1 className="mt-2 text-2xl font-extrabold text-white">레미콘 운송 관리 시스템</h1>
        <p className="mt-1 text-sm text-slate-400">
          유선 통화 없이 주문 · 배차 · 타설 현황을 한 화면에서 관리합니다
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
        {/* 현장 선택 */}
        <div className="rounded-xl bg-slate-800 p-5">
          <h2 className="mb-1 text-base font-bold text-amber-400">🏗️ 건설현장으로 시작</h2>
          <p className="mb-3 text-xs text-slate-400">
            레미콘 주문, 대수 조절, 도착/타설 현황 확인
          </p>
          {sitesLoading ? (
            <Spinner label="현장 목록 로딩..." />
          ) : (
            <div className="space-y-2">
              {(sites ?? []).map((site) => (
                <button
                  key={site.id}
                  type="button"
                  className="block w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-left text-sm font-semibold text-white transition-colors hover:border-amber-400"
                  onClick={() => {
                    selectSite(site.id, site.name);
                    navigate('/site');
                  }}
                >
                  {site.name}
                  <span className="block text-xs font-normal text-slate-400">{site.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 업체 선택 */}
        <div className="rounded-xl bg-slate-800 p-5">
          <h2 className="mb-1 text-base font-bold text-blue-400">🏭 레미콘업체로 시작</h2>
          <p className="mb-3 text-xs text-slate-400">주문 접수, 차량 배차, 운송 관제</p>
          {plantsLoading ? (
            <Spinner label="공장 목록 로딩..." />
          ) : (
            <div className="space-y-2">
              {(plants ?? []).map((plant) => (
                <button
                  key={plant.id}
                  type="button"
                  className="block w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-left text-sm font-semibold text-white transition-colors hover:border-blue-400"
                  onClick={() => {
                    selectPlant(plant.id, plant.name);
                    navigate('/plant');
                  }}
                >
                  {plant.name}
                  <span className="block text-xs font-normal text-slate-400">{plant.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        로컬 프로토타입 — 데이터는 로컬 SQLite에 저장되며, 차량 위치는 시뮬레이션됩니다
      </p>
    </div>
  );
}
