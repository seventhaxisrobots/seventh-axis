import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSUMPTIONS, DEFAULTS, clampInput, fromQuery, roi, toQuery } from "../src/roi/model.ts";

test("default palletising cell pays back inside the three-year horizon", () => {
  const r = roi(DEFAULTS);
  assert.equal(r.operators, 4);
  assert.ok(r.paybackMonths !== null && r.paybackMonths > 6 && r.paybackMonths < 24, String(r.paybackMonths));
  assert.equal(r.curve.length, ASSUMPTIONS.horizonMonths + 1);
  assert.equal(r.curve[0], -r.upfront);
});

test("the grant lowers the upfront cost and shortens payback", () => {
  const without = roi({ ...DEFAULTS, grantShare: 0 });
  const withGrant = roi({ ...DEFAULTS, grantShare: 0.7 });
  assert.ok(withGrant.upfront < without.upfront);
  assert.ok(withGrant.paybackMonths! < without.paybackMonths!);
});

test("foreign workers cost more once the levy is counted", () => {
  const local = roi({ ...DEFAULTS, foreignShare: 0 });
  const foreign = roi({ ...DEFAULTS, foreignShare: 1 });
  assert.ok(foreign.labourYearly > local.labourYearly * 0.9);
});

test("a tiny task never pays back, and says so", () => {
  const r = roi({ ...DEFAULTS, shifts: 1, perShift: 1, wage: 1700, grantShare: 0, cellPrice: 400000 });
  assert.equal(r.paybackMonths, null);
});

test("inputs are clamped and survive a round trip through the URL", () => {
  const odd = clampInput({ shifts: 9, wage: 100, grantShare: 2, task: "flying" as never });
  assert.equal(odd.shifts, 3);
  assert.equal(odd.wage, ASSUMPTIONS.minimumWage);
  assert.equal(odd.grantShare, ASSUMPTIONS.maxGrant);
  assert.equal(odd.task, "palletising");
  const i = { ...DEFAULTS, task: "tending" as const, foreignShare: 0.3, grantShare: 0.35 };
  assert.deepEqual(fromQuery("?" + toQuery(i)), i);
});
