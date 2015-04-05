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


