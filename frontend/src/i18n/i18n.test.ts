import { describe, expect, it } from 'vitest'
import i18n, { applyDirection } from './index'

describe('i18n', () => {
  it('has matching key sets in English and Arabic', async () => {
    const en = Object.keys((i18n.store.data.en.translation as Record<string, unknown>)).sort()
    const ar = Object.keys((i18n.store.data.ar.translation as Record<string, unknown>)).sort()
    expect(ar).toEqual(en)
  })

  it('translates the welcome heading and mixer labels', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('welcome.heading')).toContain('Earth data')
    await i18n.changeLanguage('ar')
    expect(i18n.t('welcome.heading')).not.toContain('Earth data')
    expect(i18n.t('mixer.water')).toBe('توفير المياه')
    await i18n.changeLanguage('en')
  })

  it('applies rtl direction for Arabic and ltr for English', () => {
    applyDirection('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')
    applyDirection('en')
    expect(document.documentElement.dir).toBe('ltr')
  })

  it('never translates crop identifiers', () => {
    // IDs are stable keys; only display names live in the crop catalog.
    expect(i18n.t('bread_wheat', { lng: 'ar' })).toBe('bread_wheat')
  })
})
