/** Scene copy-key configuration — decouples wording (i18n) from rendering.
 * Values are i18n keys resolved with `t()` at render time. */
export const HERO_COPY = {
  line1: 'welcome.cin.heroL1',
  line2: 'welcome.cin.heroL2',
  accent: 'welcome.cin.heroAccent',
  body: 'welcome.cin.heroBody',
  cta: 'welcome.cin.ctaMain',
} as const

export const SCENE_COPY = {
  land: {
    step: '1',
    kicker: 'welcome.cin.s1.kicker',
    title: 'welcome.cin.s1.title',
    accent: 'welcome.cin.s1.accent',
    body: 'welcome.cin.s1.body',
    cta: 'welcome.cin.s1.cta',
  },
  context: {
    step: '2',
    kicker: 'welcome.cin.s2.kicker',
    title: 'welcome.cin.s2.title',
    accent: 'welcome.cin.s2.accent',
    body: 'welcome.cin.s2.body',
    cta: 'welcome.cin.s2.cta',
  },
  conditions: {
    step: 'welcome.cin.s3.stepIcon',
    kicker: 'welcome.cin.s3.kicker',
    title: 'welcome.cin.s3.title',
    accent: 'welcome.cin.s3.accent',
    body: 'welcome.cin.s3.body',
  },
  rotation: {
    step: 'welcome.cin.s4.stepIcon',
    kicker: 'welcome.cin.s4.kicker',
    title: 'welcome.cin.s4.title',
    accent: 'welcome.cin.s4.accent',
    body: 'welcome.cin.s4.body',
  },
  cta: {
    kicker: 'welcome.cin.s5.kicker',
    title: 'welcome.cin.s5.title',
    accent: 'welcome.cin.s5.accent',
    body: 'welcome.cin.s5.body',
  },
} as const

export const CARD_COPY = {
  irrigation: { title: 'welcome.cin.card.irrigation', body: 'welcome.cin.card.irrigationBody' },
  previous: { title: 'welcome.cin.card.previous', body: 'welcome.cin.card.previousBody' },
  goals: { title: 'welcome.cin.card.goals', body: 'welcome.cin.card.goalsBody' },
  priorities: { title: 'welcome.cin.card.priorities', body: 'welcome.cin.card.prioritiesBody' },
  climate: { title: 'welcome.cin.card.climate', body: 'welcome.cin.card.climateBody' },
  soil: { title: 'welcome.cin.card.soil', body: 'welcome.cin.card.soilBody' },
  suitability: { title: 'welcome.cin.card.suitability', body: 'welcome.cin.card.suitabilityBody' },
} as const

export const ROTATION_COPY = {
  title: 'welcome.cin.rotation.title',
  recommended: 'welcome.cin.rotation.recommended',
  years: [
    { year: 'welcome.cin.rotation.y1', crop: 'welcome.cin.rotation.y1crop', note: 'welcome.cin.rotation.y1Note' },
    { year: 'welcome.cin.rotation.y2', crop: 'welcome.cin.rotation.y2crop', note: 'welcome.cin.rotation.y2Note' },
    { year: 'welcome.cin.rotation.y3', crop: 'welcome.cin.rotation.y3crop', note: 'welcome.cin.rotation.y3Note' },
  ],
  benefits: [
    'welcome.cin.rotation.b1',
    'welcome.cin.rotation.b2',
    'welcome.cin.rotation.b3',
  ],
} as const

export const UI_COPY = {
  fieldArea: 'welcome.cin.fieldArea',
  illustrative: 'welcome.cin.illustrative',
  illustrativeShort: 'welcome.cin.illustrativeShort',
  scrollHint: 'welcome.cin.scrollHint',
  ctaMain: 'welcome.cin.ctaMain',
  cardHigh: 'welcome.cin.card.high',
  avgTemp: 'welcome.cin.card.avgTemp',
  fertility: 'welcome.cin.card.fertility',
  suitabilityNote: 'welcome.cin.card.suitabilityNote',
} as const
