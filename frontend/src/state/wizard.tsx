import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { applyDirection, type Lang } from '../i18n'

export interface CropHistoryRow {
  crop_year: number
  season_label: string | null
  crop_id: string | null
  status: 'planted' | 'fallow' | 'unknown'
}

export interface FarmAnswers {
  irrigation_type: 'rainfed' | 'irrigated' | 'mixed' | 'unknown'
  irrigation_method: 'drip' | 'sprinkler' | 'surface' | 'other' | 'unknown' | null
  water_availability: 'limited' | 'regular' | 'unknown' | null
  water_volume_note: string | null
  purposes: string[]
  banned_crops: string[]
  crop_history: CropHistoryRow[]
}

export interface DraftField {
  name: string
  geometry: { type: string; coordinates: unknown } | null
  area_ha: number | null
}

export interface Priorities {
  water: number
  soil: number
  yield: number
  risk: number
}

const DEFAULT_ANSWERS: FarmAnswers = {
  irrigation_type: 'rainfed',
  irrigation_method: null,
  water_availability: null,
  water_volume_note: null,
  purposes: [],
  banned_crops: [],
  crop_history: [],
}

const DEFAULT_PRIORITIES: Priorities = { water: 25, soil: 25, yield: 25, risk: 25 }

interface WizardState {
  lang: Lang
  setLang: (l: Lang) => void
  field: DraftField | null
  setField: (f: DraftField | null) => void
  fieldId: string | null
  setFieldId: (id: string | null) => void
  answers: FarmAnswers
  setAnswers: (a: FarmAnswers) => void
  priorities: Priorities
  setPriorities: (p: Priorities) => void
  resetWizard: () => void
}

const WizardContext = createContext<WizardState | null>(null)

const STORAGE_KEY = 'fieldshift.wizard'

function loadPersisted(): Partial<WizardState> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function WizardProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const persisted = useMemo(loadPersisted, [])

  const [lang, setLangState] = useState<Lang>((i18n.language as Lang) ?? 'en')
  const [field, setField] = useState<DraftField | null>(persisted.field ?? null)
  const [fieldId, setFieldId] = useState<string | null>(persisted.fieldId ?? null)
  const [answers, setAnswers] = useState<FarmAnswers>({ ...DEFAULT_ANSWERS, ...(persisted.answers ?? {}) })
  const [priorities, setPriorities] = useState<Priorities>({ ...DEFAULT_PRIORITIES, ...(persisted.priorities ?? {}) })

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ field, fieldId, answers, priorities }),
    )
  }, [field, fieldId, answers, priorities])

  const value: WizardState = {
    lang,
    setLang: (l) => {
      setLangState(l)
      i18n.changeLanguage(l)
      applyDirection(l)
    },
    field,
    setField,
    fieldId,
    setFieldId,
    answers,
    setAnswers,
    priorities,
    setPriorities,
    resetWizard: () => {
      setField(null)
      setFieldId(null)
      setAnswers({ ...DEFAULT_ANSWERS })
      setPriorities({ ...DEFAULT_PRIORITIES })
    },
  }

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}

export function useWizard(): WizardState {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard outside WizardProvider')
  return ctx
}
