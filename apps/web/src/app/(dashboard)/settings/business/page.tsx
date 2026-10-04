'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Button,
  ErrorMessage,
  Field,
  Input,
  PageHeader,
  Skeleton,
  useToast,
} from '@/components/ui';
import { workspacesApi } from '@/lib/api/workspaces';
import { useWorkspace } from '@/providers/app-providers';
import type { BusinessProfile } from '@/types/api';
const empty: BusinessProfile = {
  legalName: '',
  tradeName: '',
  taxId: '',
  email: '',
  phone: '',
  website: '',
  countryCode: 'PE',
  department: '',
  province: '',
  district: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
};
export default function BusinessSettingsPage() {
  const { current } = useWorkspace();
  const id = current?.workspaceId ?? '';
  const qc = useQueryClient();
  const { show, toast } = useToast();
  const [draft, setForm] = useState<BusinessProfile | null>(null);
  const query = useQuery({
    queryKey: ['business-profile', id],
    queryFn: () => workspacesApi.business(id),
    enabled: Boolean(id) && current?.workspace.type === 'BUSINESS',
    retry: false,
  });
  const form = draft ?? (query.data ? { ...empty, ...query.data } : empty);
  const save = useMutation({
    mutationFn: () => workspacesApi.saveBusiness(id, form),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['business-profile', id] });
      show('Datos del negocio actualizados.');
    },
  });
  if (query.isLoading) return <Skeleton lines={8} />;
  return (
    <>
      <PageHeader
        title="Datos del negocio"
        description="Información comercial y de contacto del workspace."
      />
      <section className="settings-panel">
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <h2>Identificación</h2>
          <div className="form-row">
            <Field label="Razón social">
              <Input
                required
                value={form.legalName}
                onChange={(e) => setForm({ ...form, legalName: e.target.value })}
              />
            </Field>
            <Field label="Nombre comercial">
              <Input
                value={form.tradeName ?? ''}
                onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
              />
            </Field>
          </div>
          <div className="form-row">
            <Field label="RUC">
              <Input
                value={form.taxId ?? ''}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
              />
            </Field>
            <Field label="Sitio web">
              <Input
                type="url"
                value={form.website ?? ''}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </Field>
          </div>
          <h2>Contacto</h2>
          <div className="form-row">
            <Field label="Email">
              <Input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
          <h2>Dirección</h2>
          <div className="form-row form-row--three">
            <Field label="Departamento">
              <Input
                value={form.department ?? ''}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </Field>
            <Field label="Provincia">
              <Input
                value={form.province ?? ''}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
              />
            </Field>
            <Field label="Distrito">
              <Input
                value={form.district ?? ''}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Dirección">
            <Input
              value={form.addressLine1 ?? ''}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            />
          </Field>
          {save.error && <ErrorMessage error={save.error} />}
          <div className="form-actions">
            <Button disabled={save.isPending}>Guardar cambios</Button>
          </div>
        </form>
      </section>
      {toast}
    </>
  );
}
