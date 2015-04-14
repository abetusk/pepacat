Notes
=====

The (binary?) STL loader stores all positions in a THREE.BufferGeometry object.
In the BufferGeometry object, there is the 'attributes' field which holds position.

So:

```javascript

loader.load( './models/Bunny-LowPoly.stl', function ( geometry ) {

  var verts = geometry.attributes.position.array;

...

}
```

Where `verts` is the aray of `Float32Array` elements.


Self intersection
---

  - Clean polygon
  - Simplify polygon
  - Search for common point
  - Loop through to make sure all points line up


Converting triangulation to polygon
---

TODO
---

  - Sheet constraints
  - Scale options
  - Scale indicators
  - Tab additions
  - Auto-unfold, automatic self collision detection and split
  - Manual split/join
  - Coplanar triangulation join/smooth
  - Inner edge score
  - Alternate tab join scoring/cutting
  - Export to SVG
  - Automatic save
  - 3D STL import/upload

Longer range todo
---

  - 3d model management

