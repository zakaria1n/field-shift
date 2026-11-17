import { beforeEach, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { RotationOut } from '../../api/client'
import { PlanCard } from './PlanCard'
import { ScoreCalculation } from './ScoreCalculation'
import i18n from '../../i18n'

// Explicit unit-test data only; browser verification uses real backend results.
function fixture(): RotationOut {
  return {plan_id:'job-test--3',version_id:null,rank:3,label:'Plan C',status:'candidate',is_recommended:false,horizon_years:3,
    slots:['bread_wheat','chickpea','barley'].map((id,index)=>({slot_id:`y${index+1}`,year_number:index+1,crop_id:id,name_en:id,name_ar:`محصول ${index+1}`,rotation_group:null,fallow:false,planting_window:null})),
    score:{total:62.5,weights_applied:{water:.25,soil:.25,yield:.25,risk:.25},indicators:['water','soil','yield','risk'].map((key,index)=>({key,label_en:key,label_ar:key,value:[.9,.75,.4,.45][index],status:'available',rule_ids:[]}))},
    summary_en:'Full rationale',summary_ar:'شرح مفصل',main_limitation_en:'Relative weakness: climate resilience (0.45 normalized reference).',main_limitation_ar:'نقطة ضعف نسبية: الصمود المناخي (0.45 مرجع معياري).',
    evidence:{rule_ids:[],observation_ids:[],source_ids:[],notes:[],missing_information:[]}}
}
beforeEach(async()=>{cleanup();await i18n.changeLanguage('en')})

test('compact card preserves server rank, score, crops, indicators and navigation',()=>{
  const plan=fixture(),snapshot=JSON.stringify(plan)
  const {container}=render(<MemoryRouter><PlanCard plan={plan}/></MemoryRouter>)
  expect(screen.getByText('#3')).toBeInTheDocument()
  expect(screen.getByTestId('plan-total')).toHaveTextContent('62.5/100')
  expect([...container.querySelectorAll('[data-crop-id]')].map(n=>n.getAttribute('data-crop-id'))).toEqual(plan.slots.map(s=>s.crop_id))
  expect(container.querySelectorAll('[data-indicator-key]')).toHaveLength(4)
  expect(screen.queryByTestId('score-evidence')).toBeNull()
  expect(screen.queryByText('Full rationale')).toBeNull()
  expect(screen.getByRole('link',{name:'View details'})).toHaveAttribute('href','/rotations/job-test--3')
  expect(screen.queryByRole('link',{name:'Customize this plan'})).toBeNull()
  expect(JSON.stringify(plan)).toBe(snapshot)
})

test('warns only when the backend supplies a limitation, without a new threshold',()=>{
  const plan=fixture()
  const {rerender}=render(<MemoryRouter><PlanCard plan={plan}/></MemoryRouter>)
  expect(screen.getByTestId('plan-warning')).toHaveTextContent('Relative weakness: climate resilience')
  expect(screen.getByTestId('plan-warning')).not.toHaveTextContent('normalized reference')
  plan.main_limitation_en=null;plan.main_limitation_ar=null;plan.score.indicators[3].value=.01
  rerender(<MemoryRouter><PlanCard plan={plan}/></MemoryRouter>)
  expect(screen.queryByTestId('plan-warning')).toBeNull()
  plan.main_limitation_en='Check this rotation with an agronomist.';plan.score.indicators[3].value=.99
  rerender(<MemoryRouter><PlanCard plan={plan}/></MemoryRouter>)
  expect(screen.getByTestId('plan-warning')).toHaveTextContent(plan.main_limitation_en)
})

test('detail calculation preserves a missing dimension and the server total',()=>{
  const plan=fixture();plan.score.indicators[2].value=null;plan.score.indicators[2].status='unavailable';delete plan.score.weights_applied.yield
  render(<ScoreCalculation score={plan.score}/>)
  expect(screen.getByTestId('score-calculation')).toHaveTextContent('62.5 /100')
  expect(screen.getAllByText('—')).toHaveLength(3)
  expect(screen.getByText(/rounded values returned by the server/)).toBeInTheDocument()
})
