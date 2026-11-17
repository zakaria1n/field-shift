import { describe, expect, it } from 'vitest'
import { buildParcelFootprint, buildParcelMesh } from './parcelGeometry'
const outer=[[-6.8,33.9],[-6.79,33.9],[-6.79,33.91],[-6.8,33.91],[-6.8,33.9]]
const hole=[[-6.798,33.902],[-6.798,33.904],[-6.796,33.904],[-6.796,33.902],[-6.798,33.902]]
describe('geographic parcel rendering',()=>{
 it('uses latitude-adjusted metric proportions without mutating input',()=>{const g={type:'Polygon',coordinates:[outer]};const before=JSON.stringify(g);const f=buildParcelFootprint(g)!;expect(f.sizeMeters.width/f.sizeMeters.height).toBeCloseTo(111320*Math.cos(33.905*Math.PI/180)/110540,2);expect(JSON.stringify(g)).toBe(before)})
 it('preserves polygon holes and all multipolygon components',()=>{const f=buildParcelFootprint({type:'MultiPolygon',coordinates:[[outer,hole],[outer]]})!;expect(f.polygons).toHaveLength(2);expect(f.polygons[0]).toHaveLength(2);const mesh=buildParcelMesh(f);expect(mesh.geometry.attributes.position.count).toBeGreaterThan(0);mesh.geometry.dispose()})
 it('rejects malformed or degenerate coordinates',()=>{expect(buildParcelFootprint({type:'Polygon',coordinates:[]})).toBeNull();expect(buildParcelFootprint({type:'Polygon',coordinates:[[[0,0],[0,0],[0,0],[0,0]]]})).toBeNull()})
})
