import { Leaf } from 'lucide-react'
import './fieldShiftBrand.css'

/** Canonical mark shared by the cinematic demo headers. */
export default function FieldShiftBrand({ title, label = 'NASA Space Apps Challenge 2026' }: { title?: string; label?: string }) {
  return <span className="fieldshift-brand" data-testid="fieldshift-brand">
    <span className="fieldshift-brand__identity"><span className="fieldshift-brand__wordmark"><Leaf size={25} aria-hidden="true"/><strong>Field<span>Shift</span></strong></span>{label && <small>{label}</small>}</span>
    {title && <><i aria-hidden="true"/><b>{title}</b></>}
  </span>
}
