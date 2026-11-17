import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { RotationOut } from '../../../api/client'
import i18n from '../../../i18n'
import { InsightDeck } from './InsightDeck'

function plan(known: number): RotationOut {
  return {
    plan_id: 'test', version_id: null, rank: 1, label: 'Plan A', status: 'candidate', is_recommended: true, horizon_years: 3,
    slots: ['Wheat', 'Lentil', 'Barley'].map((name, i) => ({ slot_id: String(i), year_number: i + 1, crop_id: name, name_en: name, name_ar: `محصول ${i + 1}`, rotation_group: null, fallow: false, planting_window: null })),
    score: { total: 60, weights_applied: { water: .4, soil: .3, yield: .2, risk: .1 }, yield_reference_coverage: { known, total: 3 }, comparison_basis: "risk:available;yield={'known':2};weights=[('water',0.4)]", indicators: [
      { key: 'water', label_en: 'Water', label_ar: 'الماء', value: .8, status: 'available', rule_ids: [] },
      { key: 'soil', label_en: 'Soil', label_ar: 'التربة', value: null, status: 'unavailable', rule_ids: [] },
      { key: 'yield', label_en: 'Yield', label_ar: 'الإنتاج', value: known ? .4 : null, status: known === 3 ? 'available' : known ? 'partial' : 'unavailable', rule_ids: [] },
    ] },
    summary_en: 'Crop rotation', summary_ar: 'دورة المحاصيل', main_limitation_en: null, main_limitation_ar: null,
    evidence: { rule_ids: ['rule_private'], observation_ids: [], source_ids: ['soilgrids'], notes: [], missing_information: ['soil_ph_estimate'] },
  }
}

afterEach(() => cleanup())
test.each([[3, /all 3 crops/], [2, /2 of 3 crops.*partial data/], [0, /unavailable for the 3 crops/]])('shows truthful coverage for %s references without internal metadata', async (known, expected) => {
  await i18n.changeLanguage('en')
  const data = plan(known)
  const original = JSON.stringify(data)
  const { container } = render(<InsightDeck plan={data} reduced />)
  expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
  expect(container).toHaveTextContent('Soil pH estimate')
  expect(container).toHaveTextContent('40%')
  expect(container.textContent).not.toMatch(/risk:available|soil_ph_estimate|rule_private|weights=|\{'known'/)
  expect(JSON.stringify(data)).toBe(original)
})

test('explains partial coverage and missing soil in Arabic', async () => {
  await i18n.changeLanguage('ar')
  const { container } = render(<InsightDeck plan={plan(2)} reduced />)
  expect(container).toHaveTextContent('بيانات جزئية')
  expect(container).toHaveTextContent('تقدير درجة حموضة التربة')
  expect(container.textContent).not.toContain('soil_ph_estimate')
})
