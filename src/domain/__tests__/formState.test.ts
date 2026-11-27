import { describe, expect, it } from 'vitest';
import { applyMapClick, emptyForm, formCoordinate, formToInput } from '../formState';

describe('map coordinate selection', () => {
  it('fills lat/lng from a map click, rounded to 6 decimals', () => {
    const f = applyMapClick({ ...emptyForm(), house_no: '9' }, { lat: 13.75633123456, lng: 100.50176234567 });
    expect(f.latitude).toBe('13.756331');
    expect(f.longitude).toBe('100.501762');
    expect(f.house_no).toBe('9');
  });
  it('exposes the form coordinate only when valid', () => {
    expect(formCoordinate({ ...emptyForm(), latitude: '13.7', longitude: '100.5' })).toEqual({ lat: 13.7, lng: 100.5 });
    expect(formCoordinate({ ...emptyForm(), latitude: '13.', longitude: '100.5' })).toBeNull();
    expect(formCoordinate({ ...emptyForm(), latitude: '99', longitude: '100.5' })).toBeNull();
  });
  it('converts a valid form to input', () => {
    const { input, errors } = formToInput({ ...emptyForm(), house_no: ' 7 ', latitude: '13.7', longitude: '100.5', soi: '' });
    expect(errors).toEqual({});
    expect(input).toMatchObject({ house_no: '7', soi: null, latitude: 13.7, longitude: 100.5, source: 'user_created' });
  });
  it('returns errors for missing coordinates', () => {
    const { input, errors } = formToInput({ ...emptyForm(), house_no: '7' });
    expect(input).toBeNull();
    expect(errors.latitude).toBeDefined();
    expect(errors.longitude).toBeDefined();
  });
});
