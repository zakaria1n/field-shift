/** Entrance choreography for the Rotation Details screen.
 *
 * The FieldTakeover landscape expansion finishes at ~1.9s and RotationDetails
 * mounts once the wipe ends, so delays here start from that settled moment.
 * One shared timeline keeps every section coordinated; reduced motion reads
 * these values as ~0 (see rotation-details.css guards). */
export const SEQ = {
  identity: [0.08, 0.18, 0.3, 0.42], // kicker, title, meta, medallion
  path: 0.46, // luminous path draw
  years: [0.78, 0.94, 1.1], // year medallions
  activeCard: 1.34, // active-year detail card
  metrics: 1.5, // + i * metricStagger
  metricStagger: 0.14,
  deck: 1.86, // insight deck
  actions: 2.02, // footer actions
} as const

/** Category identity for the four score dimensions (colors + icons live with
 * the component; keys match the backend indicator keys). */
export const METRIC_ORDER = ['water', 'soil', 'yield', 'risk'] as const
export type MetricKey = (typeof METRIC_ORDER)[number]
