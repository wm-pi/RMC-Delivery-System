// 현장 주문 등록 폼 — RHF + Zod (유선 주문을 대체하는 정형 입력)

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { concreteGradeSchema } from '@rmc/shared';
import { orderApi } from '~/entities/order/api';
import { usePlants } from '~/entities/master/queries';
import { ApiError } from '~/shared/api/client';
import { useAuthStore } from '~/shared/lib/auth.store';
import { toast } from '~/shared/lib/toast.store';
import { Button, Card, ErrorState, Field, inputCls } from '~/shared/ui';

const formSchema = z.object({
  plantId: z.coerce.number().int().positive('레미콘 공장을 선택하세요'),
  concreteGrade: concreteGradeSchema,
  totalQuantityM3: z.coerce.number().positive('수량은 0보다 커야 합니다').max(10000),
  truckIntervalMin: z.coerce.number().int().min(0).max(180),
  requestedAt: z.string().min(1, '납품 희망 일시를 선택하세요'),
  notes: z.string().trim().max(500).optional(),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

/** 오늘 날짜 기준 datetime-local 기본값 (1시간 뒤, 분 단위 절삭) */
function defaultRequestedAt(): string {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const COMMON_GRADES = ['25-24-150', '25-21-120', '30-24-150', '30-21-120', '24-21-120'];

export function OrderCreateForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { siteId } = useAuthStore();
  const { data: plants = [] } = usePlants();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      truckIntervalMin: 15,
      requestedAt: defaultRequestedAt(),
      concreteGrade: '',
    },
  });

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      orderApi.create({
        siteId: siteId!,
        plantId: values.plantId,
        concreteGrade: values.concreteGrade,
        totalQuantityM3: values.totalQuantityM3,
        truckIntervalMin: values.truckIntervalMin,
        requestedAt: new Date(values.requestedAt).toISOString(),
        notes: values.notes || undefined,
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('주문을 등록했습니다');
      navigate(`/site/orders/${order.id}`);
    },
  });

  return (
    <Card className="mx-auto max-w-xl p-6">
      <form onSubmit={handleSubmit((values) => create.mutate(values))}>
        <Field label="레미콘 공장" error={errors.plantId?.message}>
          <select className={inputCls} {...register('plantId')}>
            <option value="">공장을 선택하세요</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.contact ? `(${p.contact})` : ''}
              </option>
            ))}
          </select>
        </Field>

        <Field label="규격 (호칭강도-슬럼프-굵은골재)" error={errors.concreteGrade?.message}>
          <input className={inputCls} placeholder="예) 25-24-150" {...register('concreteGrade')} />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {COMMON_GRADES.map((grade) => (
              <button
                key={grade}
                type="button"
                className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600 hover:border-blue-500 hover:text-blue-600"
                onClick={() => setValue('concreteGrade', grade, { shouldValidate: true })}
              >
                {grade}
              </button>
            ))}
          </div>
        </Field>

        <Field label="총 수량 (m³)" error={errors.totalQuantityM3?.message}>
          <input type="number" step="0.5" className={inputCls} placeholder="36" {...register('totalQuantityM3')} />
        </Field>

        {/* 상세 옵션 — 기본값으로 충분하므로 필요할 때만 펼친다 */}
        <button
          type="button"
          className="mb-3 text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? '상세 옵션 닫기' : '상세 옵션 (배차 간격 · 납품 시각 · 요청 사항)'}
        </button>

        {showAdvanced && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="배차 간격 (분)" error={errors.truckIntervalMin?.message}>
                <input type="number" className={inputCls} {...register('truckIntervalMin')} />
              </Field>
              <Field label="납품 희망 일시" error={errors.requestedAt?.message}>
                <input type="datetime-local" className={inputCls} {...register('requestedAt')} />
              </Field>
            </div>

            <Field label="요청 사항 (선택)" error={errors.notes?.message}>
              <textarea
                className={`${inputCls} h-20 resize-none`}
                placeholder="예) 지하 1층 바닥 타설, 펌프카 1대 대기"
                {...register('notes')}
              />
            </Field>
          </>
        )}

        {create.isError && (
          <div className="mb-3">
            <ErrorState
              message={create.error instanceof ApiError ? create.error.message : '주문 등록에 실패했습니다'}
            />
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={create.isPending}>
            취소
          </Button>
          <Button type="submit" loading={create.isPending}>
            주문 등록
          </Button>
        </div>
      </form>
    </Card>
  );
}
