import { useState } from 'react';
import type { AddressPointInput } from '../domain/types';
import { VERIFICATION_STATUSES } from '../domain/types';
import { FIELD_LABEL, STATUS_LABEL } from '../domain/labels';
import type { AddressFormValues } from '../domain/formState';
import { formToInput } from '../domain/formState';
import type { FieldErrors } from '../domain/validation';

type TextKey = Exclude<keyof AddressFormValues, 'verification_status'>;
const ADDRESS_FIELDS: TextKey[] = ['house_no', 'village', 'soi', 'street', 'subdistrict', 'district', 'province', 'postal_code', 'landmark'];

interface Props {
  mode: 'create' | 'edit';
  values: AddressFormValues;
  onChange: (v: AddressFormValues) => void;
  onSubmit: (input: AddressPointInput) => Promise<void> | void;
  onCancel: () => void;
  saving?: boolean;
}

export function LocationForm({ mode, values, onChange, onSubmit, onCancel, saving }: Props) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (k: keyof AddressFormValues, v: string) => onChange({ ...values, [k]: v } as AddressFormValues);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { input, errors } = formToInput(values);
    setErrors(errors);
    if (input) await onSubmit(input);
  };

  const field = (k: TextKey, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={`field field-${k}`} key={k}>
      <span>{FIELD_LABEL[k]}{k === 'house_no' && ' *'}</span>
      <input
        name={k}
        value={values[k]}
        onChange={(e) => set(k, e.target.value)}
        aria-invalid={Boolean(errors[k])}
        {...props}
      />
      {errors[k] && <em className="error" role="alert">{errors[k]}</em>}
    </label>
  );

  return (
    <form className="loc-form" onSubmit={submit} noValidate aria-label={mode === 'create' ? 'เพิ่มตำแหน่ง' : 'แก้ไขตำแหน่ง'}>
      <h2>{mode === 'create' ? 'เพิ่มตำแหน่งใหม่' : 'แก้ไขตำแหน่ง'}</h2>
      <p className="hint">แตะ/คลิกบนแผนที่เพื่อเลือกพิกัด ระบบจะกรอกละติจูด/ลองจิจูดให้อัตโนมัติ</p>
      <div className="grid-2">
        {field('latitude', { inputMode: 'decimal', placeholder: 'เช่น 13.756331' })}
        {field('longitude', { inputMode: 'decimal', placeholder: 'เช่น 100.501762' })}
      </div>
      <div className="grid-2">{ADDRESS_FIELDS.map((k) => field(k, k === 'postal_code' ? { inputMode: 'numeric', maxLength: 5 } : {}))}</div>
      <label className="field">
        <span>{FIELD_LABEL.notes}</span>
        <textarea name="notes" rows={2} value={values.notes} onChange={(e) => set('notes', e.target.value)} />
        {errors.notes && <em className="error" role="alert">{errors.notes}</em>}
      </label>
      <div className="grid-2">
        {field('source')}
        <label className="field">
          <span>{FIELD_LABEL.verification_status}</span>
          <select name="verification_status" value={values.verification_status} onChange={(e) => set('verification_status', e.target.value)}>
            {VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button>
      </div>
    </form>
  );
}
