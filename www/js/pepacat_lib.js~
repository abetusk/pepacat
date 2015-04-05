/* libraries for pepacat
 */

// Our basic strategy is as follows:
// - scan for a convex-ish hull.
//   form groups of these triangles.
// - for each group, unfold
//   using a 'steepest edge' method
//   (we don't even calculate collisions
//   at this point).
// - for evecy section, test for collisions.
//   if there's a collision, pick a random
//   edge to split the section and recusively
//   continue.

function _norm_vert( u ) {
  var s = 1000000;
  var x = Math.floor(u[0]*s);
  var y = Math.floor(u[1]*s);
  var z = Math.floor(u[2]*s);

  return x + ":" + y + ":" + z;
}

function _norm_edge_3d_key( u, v ) {
  var s = 1000000;
  var x0 = Math.floor(u[0]*s);
  var y0 = Math.floor(u[1]*s);
  var z0 = Math.floor(u[2]*s);

  var x1 = Math.floor(v[0]*s);
  var y1 = Math.floor(v[1]*s);
  var z1 = Math.floor(v[2]*s);

  if (x0 < x1) {
    return _norm_vert(u) + "," + _norm_vert(v);
  } else if (x0 > x1) {
    return _norm_vert(v) + "," + _norm_vert(u);
  }

  if (y0 < y1) {
    return _norm_vert(u) + "," + _norm_vert(v);
  } else if (y0 > y1) {
    return _norm_vert(v) + "," + _norm_vert(u);
  }

  if (z0 > z1) {
    return _norm_vert(v) + "," + _norm_vert(u);
  }

  return _norm_vert(u) + "," + _norm_vert(v);
}

// Assumes vert3d is populated.
// populates edges.
//
function pepacat_init( model ) {

  model.edges_to_tri = {};
  var e = model.edges_to_tri;

  model.vert_to_edge = {};
  model.tri_sib = {};

  var n = model.vert3d.length;
  var v3 = model.vert3d;
  var tri_pos = 0;
  for (var i=0; i<n; i+=3) {

    var u = v3[i+0];
    var v = v3[i+1];
    var w = v3[i+2];

    var e0 = _norm_edge_3d_key( u, v );
    var e1 = _norm_edge_3d_key( v, w );
    var e2 = _norm_edge_3d_key( u, w );

    if ( e0 in e ) { e[e0].push( tri_pos ); }
    else { e[e0] = [ tri_pos ]; }

    if (i in model.vert_to_edge)
      model.vert_to_edge[i].push(e0);
    else
      model.vert_to_edge[i] = [ e0 ];

    if ( e1 in e ) { e[e1].push( tri_pos ); }
    else { e[e1] = [ tri_pos ]; }

    if ((i+1) in model.vert_to_edge)
      model.vert_to_edge[i+1].push(e1);
    else
      model.vert_to_edge[i+1] = [ e1 ];


    if ( e2 in e ) { e[e2].push( tri_pos ); }
    else { e[e2] = [ tri_pos ]; }

    if ((i+2) in model.vert_to_edge)
      model.vert_to_edge[i+2].push(e2);
    else
      model.vert_to_edge[i+2] = [ e2 ];


    tri_pos++;
  }
  model.ntri = tri_pos;

  for (var ee in model.edges_to_tri) {
    for (var i0 in model.edges_to_tri[ee]) {
      for (var i1 in model.edges_to_tri[ee]) {
        if (i0==i1) { continue; }
        var tri0 = model.edges_to_tri[ee][i0];
        var tri1 = model.edges_to_tri[ee][i1];
        if (!(tri0 in model.tri_sib)) {
          model.tri_sib[tri0] = {};
        }
        model.tri_sib[tri0][tri1] = 1;
      }
    }
  }

  console.log( model.edges_to_tri );
  console.log( model.tri_sib );

}

function cross( u, v ) {
  var x = u[1]*v[2] - u[2]*v[1];
  var y = u[2]*v[0] - u[0]*v[2];
  var z = u[0]*v[1] - u[1]*v[0];

  return [x,y,z];
}

function _vsub3( u, v ) {
  return [ u[0]-v[0], u[1]-v[1], u[2]-v[2] ];
}

function unpack_vert( model, ind ) {
  var v = [ model.vert3d[ind][0], model.vert3d[ind][1], model.vert3d[ind][2] ];
  return v;
}

function pepacat_valley( model, tri0, tri1 ) {
  var _eps = 0.00001;

  var u0 = unpack_vert( model, 3*tri0 );
  var v0 = unpack_vert( model, 3*tri0 + 1 );
  var w0 = unpack_vert( model, 3*tri0 + 2 );

  var u1 = unpack_vert( model, 3*tri1 );
  var v1 = unpack_vert( model, 3*tri1 + 1 );
  var w1 = unpack_vert( model, 3*tri1 + 2 );

  var n0 = cross( _vsub3( v0, u0 ), _vsub3( w0, u0 ) );
  var r = Math.sqrt( (n0[0]*n0[0]) + (n0[1]*n0[1]) + (n0[2]*n0[2]) );
  if (r < _eps) { return false; }

  n0[0] /= r; n0[1] /= r; n0[2] /= r;


  var pp = u1;
  var qq = v1;
  var aa = [ u0, v0, w0 ];
  var bb = [ u1, v1, w1 ];

  for (var i=0; i<3; i++) {
    pp = bb[i];
    qq = bb[(i+1)%3];
    var count=0;
    for (var j=0; j<3; j++) {
      if ( _norm_vert(bb[i]) == _norm_vert(aa[j]) ) {
        count++;
        break;
      }
    }
    if (count==0) break;
  }

  var z = _vsub3( qq, pp );
  r = Math.sqrt( (z[0]*z[0]) + (z[1]*z[1]) + (z[2]*z[2]) );
  if (r < _eps) { return false; }
  z[0] /= r; z[1] /= r; z[2] /= r;

  var s = (n0[0]*z[0]) + (n0[1]*z[1]) + (n0[2]*z[2]);
  return (s>=0);

}

// Pass in pepacat model.
//
// This uses a heuristic.  Start constructing
// a convex hull from a random verex.  When
// we encounter a vertex/edge/face that makes
// the polytope non-convex, push the current
// convex-ish polytope and continue on.
//
// Polytope is used loosely as we are not
// filling in the open portion.
//

function _norm_v_key( u, v ) {
  if (u<v) { return u + ":" + v; }
  return v + ":" + u;
}

function _group_tri( model, tri_visited, tri_section, tri_ind, section_name ) {
  if (tri_visited[tri_ind]) { return; }

  tri_section[section_name].push( tri_ind );
  tri_visited[tri_ind] = true;
  for (var tri_nei in model.tri_sib[tri_ind]) {
    if (pepacat_valley( model, tri_ind, tri_nei)) {
      _group_tri( model, tri_visited, tri_section, tri_nei, section_name );
    }
  }
}

// This still needs some work, but as an initial proof of
// concept it will work.  This does a local scan of pair
// wise triangle convex testing and does it depth first.
//
// It might not be worth improving on this too much,
// but some possible improvements could be:
// - do convexity testing on a vertex level and not
//   on a pairwise triangle level.  We sometimes
//   emit groups that have concave triangle pairs
//   because of this (not that's all that bad...).
//   vertex level testing could avoid this.
// - do a breadth first traversal instead of a depth
//   first one.  This might help keep the sections
//   localized.
// - It might not even be worth trying to keep things
//   strictly convex and maybe we should relax this
//   to try and match portions of the model that
//   fit well enough into ellipsoids.
//
function choose_polygon_sections( model ) {

  var tri_visited = {};
  var tri_section = {};

  var edge_v = {};

  var ntri = model.ntri;

  for (var i=0; i<ntri; i++) {
    tri_visited[i] = false;
  }

  var section_name = 1;
  for (var i=0; i<ntri; i++) {
    if (tri_visited[i]) { continue; }

    section_name++;
    tri_section[section_name] = [];
    _group_tri( model, tri_visited, tri_section, i, section_name );
  }

  //DEBUG
  var group_color = {};
  var count = 0;
  for (var i in tri_section) {
    var r = Math.floor(128*Math.random() + 64);
    var g = Math.floor(128*Math.random() + 64);
    var b = Math.floor(128*Math.random() + 64);
    var group_color = "rgb(" + r + "," + g + "," + b +")";

    for (var j=0; j<tri_section[i].length; j++) {
      var tri_ind = tri_section[i][j];
      model.tri_mesh[tri_ind].material.color.set(group_color);
      model.tri_geom[tri_ind].colorsNeedUpdate = true;
      count++;
    }
  }

  return tri_section;

}


function unfold_tri_section( model, tri_section ) {

}
