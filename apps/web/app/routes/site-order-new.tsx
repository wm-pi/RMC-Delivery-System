import { OrderCreateForm } from '~/features/order-create/OrderCreateForm';
import { PageHeader } from '~/shared/ui';

export default function SiteOrderNew() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl p-5">
        <PageHeader title="신규 레미콘 주문" />
        <OrderCreateForm />
      </div>
    </div>
  );
}
