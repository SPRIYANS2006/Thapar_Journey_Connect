import { it } from 'node:test';
import assert from 'node:assert/strict';
import { getFareEstimate } from '../src/utils/fareEstimate.js';

it('cab estimate divides by occupied seats including companions', () => {
  assert.deepEqual(getFareEstimate({ totalFare: 1000, members: [{}, {}, {}] }), { total: 1000, perPerson: 334, riders: 3 });
});
it('known destination estimates use the same first fare value as slot cards', () => {
  assert.deepEqual(getFareEstimate({ destinationId: 'airport', members: [{}, {}] }, [{ id: 'airport', avgCabFare: '₹1,400–₹1,600 total' }]), { total: 1400, perPerson: 700, riders: 2 });
});
it('unknown destinations do not invent a fare', () => {
  assert.equal(getFareEstimate({ destinationId: 'unknown', members: [{}] }), null);
});
it('individual train fares are not divided among passengers', () => {
  assert.deepEqual(getFareEstimate({ totalFare: 350, transport: 'Train', members: [{}, {}] }), { total: 700, perPerson: 350, riders: 2 });
});
