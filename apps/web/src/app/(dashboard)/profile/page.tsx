'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Button,
  ErrorMessage,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/providers/app-providers';
import type { Profile } from '@/types/api';
export default function ProfilePage() {
  const { reloadUser } = useAuth();
  const qc = useQueryClient();
  const { show, toast } = useToast();
  const query = useQuery({ queryKey: ['profile'], queryFn: authApi.profile });
  const [draft, setForm] = useState<Profile | null>(null);
  const form = draft ?? query.data?.profile ?? null;
  const save = useMutation({
    mutationFn: () => authApi.updateProfile(form!),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['profile'] });
      await reloadUser();
      show('Perfil actualizado.');
    },
  });
  if (!form)
    return (
      <>
        <PageHeader title="Mi perfil" description="Información personal y preferencias." />
        <Skeleton lines={8} />
      </>
    );
  const set = (key: keyof Profile, value: string) => setForm({ ...form, [key]: value });
  return (
    <>
      <PageHeader
        title="Mi perfil"
        description="Información personal, ubicación y preferencias regionales."
      />
      <section className="settings-panel">
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <h2>Nombre</h2>
          <div className="form-row form-row--three">
            <Field label="Primer nombre">
              <Input
                required
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
              />
            </Field>
            <Field label="Segundo nombre">
              <Input
                value={form.middleName ?? ''}
                onChange={(e) => set('middleName', e.target.value)}
              />
            </Field>
            <Field label="Apellido paterno">
              <Input
                required
                value={form.paternalLastName}
                onChange={(e) => set('paternalLastName', e.target.value)}
              />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Apellido materno">
              <Input
                value={form.maternalLastName ?? ''}
                onChange={(e) => set('maternalLastName', e.target.value)}
              />
            </Field>
            <Field label="Fecha de nacimiento">
              <Input
                type="date"
                value={form.birthDate?.slice(0, 10) ?? ''}
                onChange={(e) => set('birthDate', e.target.value)}
              />
            </Field>
          </div>
          <h2>Contacto y documento</h2>
          <div className="form-row">
            <Field label="Teléfono">
              <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Teléfono secundario">
              <Input
                value={form.secondaryPhone ?? ''}
                onChange={(e) => set('secondaryPhone', e.target.value)}
              />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Tipo de documento">
              <Input
                value={form.documentType ?? ''}
                onChange={(e) => set('documentType', e.target.value)}
              />
            </Field>
            <Field label="Número de documento">
              <Input
                value={form.documentNumber ?? ''}
                onChange={(e) => set('documentNumber', e.target.value)}
              />
            </Field>
          </div>
          <h2>Ubicación</h2>
          <div className="form-row form-row--three">
            <Field label="Departamento">
              <Input
                value={form.department ?? ''}
                onChange={(e) => set('department', e.target.value)}
              />
            </Field>
            <Field label="Provincia">
              <Input
                value={form.province ?? ''}
                onChange={(e) => set('province', e.target.value)}
              />
            </Field>
            <Field label="Distrito">
              <Input
                value={form.district ?? ''}
                onChange={(e) => set('district', e.target.value)}
              />
            </Field>
          </div>
          <Field label="Dirección">
            <Input
              value={form.addressLine1 ?? ''}
              onChange={(e) => set('addressLine1', e.target.value)}
            />
          </Field>
          <h2>Preferencias</h2>
          <div className="form-row form-row--three">
            <Field label="Zona horaria">
              <Select value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
                <option value="America/Lima">America/Lima</option>
                <option value="UTC">UTC</option>
              </Select>
            </Field>
            <Field label="Moneda preferida">
              <Select
                value={form.preferredCurrency}
                onChange={(e) => set('preferredCurrency', e.target.value)}
              >
                <option value="PEN">PEN — Sol peruano</option>
                <option value="USD">USD — Dólar</option>
              </Select>
            </Field>
            <Field label="Idioma">
              <Select value={form.language} onChange={(e) => set('language', e.target.value)}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </Select>
            </Field>
          </div>
          {save.error && <ErrorMessage error={save.error} />}
          <div className="form-actions">
            <Button disabled={save.isPending}>Guardar perfil</Button>
          </div>
        </form>
      </section>
      {toast}
    </>
  );
}
