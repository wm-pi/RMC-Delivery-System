import { VehicleManager } from '~/features/vehicles/VehicleManager';
import { PageHeader } from '~/shared/ui';

export default function PlantVehicles() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl p-5">
        <PageHeader title="차량 관리" />
        <VehicleManager />
      </div>
    </div>
  );
}
