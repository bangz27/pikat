import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LocationForm } from '../LocationForm';
import { emptyForm, type AddressFormValues } from '../../domain/formState';
import type { AddressPointInput } from '../../domain/types';

function Harness({ initial, onSubmit }: { initial: AddressFormValues; onSubmit: (i: AddressPointInput) => void }) {
  const [v, setV] = useState(initial);
  return <LocationForm mode="create" values={v} onChange={setV} onSubmit={onSubmit} onCancel={() => {}} />;
}

describe('LocationForm', () => {
  it('shows validation errors and does not submit invalid data', async () => {
    const onSubmit = vi.fn();
    render(<Harness initial={emptyForm()} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('กรุณากรอกบ้านเลขที่')).toBeInTheDocument();
    expect(screen.getByText('ละติจูดต้องเป็นตัวเลข')).toBeInTheDocument();
  });

  it('submits a valid address with coordinates (e.g. pre-filled from the map)', async () => {
    const onSubmit = vi.fn();
    render(<Harness initial={{ ...emptyForm(), latitude: '13.756331', longitude: '100.501762' }} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/บ้านเลขที่/), '99/1');
    await userEvent.type(screen.getByLabelText('ซอย'), 'ทดสอบ');
    await userEvent.selectOptions(screen.getByLabelText('สถานะการยืนยัน'), 'needs_review');
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      house_no: '99/1', soi: 'ทดสอบ', latitude: 13.756331, longitude: 100.501762, verification_status: 'needs_review', street: null,
    }));
  });

  it('rejects out-of-range coordinates', async () => {
    const onSubmit = vi.fn();
    render(<Harness initial={{ ...emptyForm(), house_no: '1', latitude: '120', longitude: '100' }} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/ละติจูดต้องอยู่ระหว่าง/)).toBeInTheDocument();
  });
});
