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

var _eps = 0.00001;

function simplecopy( src )
{
  try {
    return JSON.parse( JSON.stringify(src) );
  } catch(err)
  {
    console.log(err);
    console.trace();
    console.log(src);
  }
}

function _norm_vert2(u) {
  var s = 1000000;
  var x = Math.floor(u[0]*s + 0.5);
  var y = Math.floor(u[1]*s + 0.5);

  return x + ":" + y;
}

function _norm_edge2(u,v) {
  var s = 1000000;
  var x0 = Math.floor(u[0]*s + 0.5);
  var y0 = Math.floor(u[1]*s + 0.5);

  var x1 = Math.floor(v[0]*s + 0.5);
  var y1 = Math.floor(v[1]*s + 0.5);

  if (x0 < x1) {
    return _norm_vert2(u) + "," + _norm_vert2(v);
  } else if (x0 > x1) {
    return _norm_vert2(v) + "," + _norm_vert2(u);
  }

  if (y0 > y1) {
    return _norm_vert2(v) + "," + _norm_vert2(u);
  }

  return _norm_vert2(u) + "," + _norm_vert2(v);
}

function _norm_vert3( u ) {
  var s = 1000000;
  var x = Math.floor(u[0]*s);
  var y = Math.floor(u[1]*s);
  var z = Math.floor(u[2]*s);

  return x + ":" + y + ":" + z;
}

function _norm_edge3( u, v ) {
  var s = 1000000;
  var x0 = Math.floor(u[0]*s);
  var y0 = Math.floor(u[1]*s);
  var z0 = Math.floor(u[2]*s);

  var x1 = Math.floor(v[0]*s);
  var y1 = Math.floor(v[1]*s);
  var z1 = Math.floor(v[2]*s);

  if (x0 < x1) {
    return _norm_vert3(u) + "," + _norm_vert3(v);
  } else if (x0 > x1) {
    return _norm_vert3(v) + "," + _norm_vert3(u);
  }

  if (y0 < y1) {
    return _norm_vert3(u) + "," + _norm_vert3(v);
  } else if (y0 > y1) {
    return _norm_vert3(v) + "," + _norm_vert3(u);
  }

  if (z0 > z1) {
    return _norm_vert3(v) + "," + _norm_vert3(u);
  }

  return _norm_vert3(u) + "," + _norm_vert3(v);
}

// Assumes vert3d is populated.
// populates edges.
//
function pepacat_init( model ) {

  model.edge_to_tri = {};
  var e = model.edge_to_tri;

  model.vert_to_edge = {};
  model.tri_sib = {};

  var n = model.vert3d.length;
  var v3 = model.vert3d;
  var tri_pos = 0;
  for (var i=0; i<n; i+=3) {

    var u = v3[i+0];
    var v = v3[i+1];
    var w = v3[i+2];

    var e0 = _norm_edge3( u, v );
    var e1 = _norm_edge3( v, w );
    var e2 = _norm_edge3( u, w );

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

  for (var ee in model.edge_to_tri) {
    for (var i0 in model.edge_to_tri[ee]) {
      for (var i1 in model.edge_to_tri[ee]) {
        if (i0==i1) { continue; }
        var tri0 = model.edge_to_tri[ee][i0];
        var tri1 = model.edge_to_tri[ee][i1];
        if (!(tri0 in model.tri_sib)) {
          model.tri_sib[tri0] = {};
        }
        model.tri_sib[tri0][tri1] = 1;
      }
    }
  }

  //console.log( model.edge_to_tri );
  //console.log( model.tri_sib );

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

function _vsub2( u, v ) {
  return [ u[0]-v[0], u[1]-v[1] ];
}

function _vnorm3( u ) {
  return Math.sqrt( (u[0]*u[0]) + (u[1]*u[1]) + (u[2]*u[2]) );
}

function _vnorm2( u ) {
  return Math.sqrt( (u[0]*u[0]) + (u[1]*u[1]) );
}

function unpack_vert( model, ind ) {
  var v = [ model.vert3d[ind][0], model.vert3d[ind][1], model.vert3d[ind][2] ];
  return v;
}

function pepacat_valley( model, tri0, tri1 ) {
  return pepacat_tri_threshold( model, tri0, tri1, 0.0 );
}

function pepacat_tri_threshold( model, tri0, tri1, threshold ) {
  threshold = ( (typeof threshold === "undefined") ? 0 : threshold );
  //var _eps = 0.00001;

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
      if ( _norm_vert3(bb[i]) == _norm_vert3(aa[j]) ) {
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
  return (s>=threshold);

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

var GROUP_THRESHOLD = -0.1;
function _group_tri( model, tri_visited, tri_section, tri_ind, section_name ) {
  if (tri_visited[tri_ind]) { return; }

  tri_section[section_name].push( tri_ind );
  tri_visited[tri_ind] = true;
  for (var tri_nei in model.tri_sib[tri_ind]) {
    if (pepacat_tri_threshold( model, tri_ind, tri_nei, GROUP_THRESHOLD)) {
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
// note that in it's current state, the resulting
// sections could be concave because of the choice
// strategy.
//
// Return hash of arrys, where each array holds
// a list of triangles in the section.  Each
// section name is named by it's key.
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


function cut_tri_section( model, tri_section ) {

  if (tri_section.length < 2) {
    var tri_graph = {};
    if (tri_section.length==2) {
      tri_graph[tri_section[0]] = {};
      tri_graph[tri_section[0]][tri_section[1]] = 1;
      tri_graph[tri_section[1]] = {}
      tri_graph[tri_section[1]][tri_section[0]] = 1;
    } else {
      tri_graph[tri_section[0]] = {};
    }
    return tri_graph;
  }

  // We need to build these locally as tri_section
  // is a subset of all triangles in the model.

  // key is normalized vert, value is another
  // map with tri ind as key.
  //
  var vert_to_tri = {};

  // key is normalized edge, value is another
  // map with tri ind as key
  //
  var edge_to_tri = {};

  // key is normalized vert, value is another
  // map with normalized vert whose value
  // is dest vert.
  var vert_vert_edge = {};

  // Maps key to actual vert.
  //
  var vert_map = {};

  var max_z;
  var max_v;
  var ze = true;

  var n = tri_section.length;

  // build vert_to_tri and edge_to_tri.
  //
  for (var i=0; i<n; i++) {
    var tri_ind = tri_section[i];
    var u = unpack_vert( model, 3*tri_ind );
    var v = unpack_vert( model, 3*tri_ind + 1 );
    var w = unpack_vert( model, 3*tri_ind + 2 );


    var ukey = _norm_vert3( u );
    var vkey = _norm_vert3( v );
    var wkey = _norm_vert3( w );
    if (!(ukey in vert_to_tri)) { vert_to_tri[ukey] = {}; }
    if (!(vkey in vert_to_tri)) { vert_to_tri[vkey] = {}; }
    if (!(wkey in vert_to_tri)) { vert_to_tri[wkey] = {}; }
    vert_to_tri[ukey][tri_ind] = 1;
    vert_to_tri[vkey][tri_ind] = 1;
    vert_to_tri[wkey][tri_ind] = 1;

    vert_map[ukey] = u;
    vert_map[vkey] = v;
    vert_map[wkey] = w;

    if (!(ukey in vert_vert_edge)) { vert_vert_edge[ukey] = {}; }
    if (!(vkey in vert_vert_edge)) { vert_vert_edge[vkey] = {}; }
    if (!(wkey in vert_vert_edge)) { vert_vert_edge[wkey] = {}; }
    vert_vert_edge[ukey][vkey] = v;
    vert_vert_edge[vkey][ukey] = u;

    vert_vert_edge[ukey][wkey] = w;
    vert_vert_edge[wkey][ukey] = u;

    vert_vert_edge[vkey][wkey] = w;
    vert_vert_edge[wkey][vkey] = v;

    var e0 = _norm_edge3( u, v );
    var e1 = _norm_edge3( u, w );
    var e2 = _norm_edge3( v, w );
    if (!(e0 in edge_to_tri)) { edge_to_tri[e0] = {}; }
    if (!(e1 in edge_to_tri)) { edge_to_tri[e1] = {}; }
    if (!(e2 in edge_to_tri)) { edge_to_tri[e2] = {}; }
    edge_to_tri[e0][tri_ind] = 1;
    edge_to_tri[e1][tri_ind] = 1;
    edge_to_tri[e2][tri_ind] = 1;

    if (ze) { max_z = u[2]; max_v = u; ze=false; }

    if (max_z < u[2]) { max_z=u[2]; max_v=u; }
    if (max_z < v[2]) { max_z=v[2]; max_v=v; }
    if (max_z < w[2]) { max_z=w[2]; max_v=w; }

  }

  var tri_graph = {};
  var cut_edge = {};

  // steepest (normalized) edge...
  // I'm suspicious that this is working as intended....
  //
  var vert_plus = _norm_vert3( max_v );
  for (var vert_key in vert_vert_edge) {
    if (vert_key == vert_plus) { continue; }

    var cur_vert = vert_map[vert_key];

    var ze = true;
    var max_z, max_vert;
    for (var vert_key1 in vert_vert_edge[vert_key]) {
      var nei_v = vert_vert_edge[vert_key][vert_key1];

      var du = _vsub3( nei_v, cur_vert );
      var ds = _vnorm3( du );
      if (ds > 0.0001) { du[0] /= ds; du[1] /= ds; du[2] /= ds; }

      if (ze) { max_z = du[2]; max_vert = nei_v; ze=false; }
      if (max_z < du[2]) {
        max_z = du[2];
        max_vert = nei_v;
      }

    }

    var e_key = _norm_edge3( vert_map[vert_key], vert_map[vert_key1] );
    cut_edge[e_key] = 1;

    //DEBUG
    g_edge_3[e_key].material.color.set(0xff3300);

  }


  for (var ee in edge_to_tri) {
    if (ee in cut_edge) { continue; }

    for (var tri0 in edge_to_tri[ee]) {
      for (var tri1 in edge_to_tri[ee]) {
        if (tri0==tri1) { continue; }
        if (!(tri0 in tri_graph)) { tri_graph[tri0] = {}; }
        tri_graph[tri0][tri1] = 1;
      }
    }

  }

  return tri_graph;


}

function _splat_3d_to_2d_tri_init(model, tri_ind, start_ind) {
  var u0, u1, u2;
  var u = [
    unpack_vert(model, 3*tri_ind + start_ind),
    unpack_vert(model, 3*tri_ind + ((start_ind+1)%3)),
    unpack_vert(model, 3*tri_ind + ((start_ind+2)%3))
  ];

  var a = _vnorm3( _vsub3( u[1], u[0] ) );
  var b = _vnorm3( _vsub3( u[2], u[1] ) );
  var c = _vnorm3( _vsub3( u[2], u[0] ) );

  var a2 = a*a;
  var b2 = b*b;
  var c2 = c*c;

  var xf = (c2 + a2 - b2 ) / (2*a);
  var yf = Math.sqrt( c2 - (xf*xf) );

  var tri2 = [ [0,0], [a,0], [xf,yf] ];

  var t_tri = [];
  for (var i=0; i<3; i++) {
    t_tri.push(tri2[(3-start_ind+i)%3]);
  }
  tri2 = t_tri;

  model.vert2d_placed[tri_ind] = true;
  model.vert2d[tri_ind] = tri2;

  return tri2;
}

function _splat_3d_to_2d_tri(model, tri_ind, x, y, ang, start_ind) {
  x = ((typeof x === "undefined") ? 0 : x);
  y = ((typeof y === "undefined") ? 0 : y);
  ang = ((typeof ang === "undefined") ? 0 : ang);
  start_ind = ((typeof start_ind === "undefined") ? 0 : start_ind);

  var u0, u1, u2;
  var u = [
    unpack_vert(model, 3*tri_ind + (start_ind)),
    unpack_vert(model, 3*tri_ind + ((start_ind+1)%3) ),
    unpack_vert(model, 3*tri_ind + ((start_ind+2)%3) )
  ];

  var a = _vnorm3( _vsub3( u[1], u[0] ) );
  var b = _vnorm3( _vsub3( u[2], u[1] ) );
  var c = _vnorm3( _vsub3( u[2], u[0] ) );

  var a2 = a*a;
  var b2 = b*b;
  var c2 = c*c;

  if (c2 < _eps) {
    console.log("ERROR: triangle weird:", tri_ind, a2, b2, c2);
    return;
  }

  var xf = (c2 + a2 - b2 ) / (2*a);
  var yf = Math.sqrt(c2 - (xf*xf));

  var tri2 = [ [0,0], [a,0], [xf,yf] ];

  var loc_x = tri2[1][0];
  var loc_y = tri2[1][1];

  // shift tri2 appropriately
  //
  var t_tri = [];
  for (var i=0; i<3; i++) {
    t_tri.push(tri2[(3-start_ind+i)%3]);
  }
  tri2 = t_tri;

  for (var i=0; i<3; i++) {
    tri2[i][0] -= loc_x;
    tri2[i][1] -= loc_y;
  }

  //ang = Math.PI - ang;

  for (var i=0; i<3; i++) {
    var tx = Math.cos(ang)*tri2[i][0] - Math.sin(ang)*tri2[i][1];
    var ty = Math.sin(ang)*tri2[i][0] + Math.cos(ang)*tri2[i][1];

    tri2[i][0] = tx + x;
    tri2[i][1] = ty + y;
  }

  model.vert2d_placed[tri_ind] = true;
  model.vert2d[tri_ind] = tri2;

  return tri2;
}

function _scale2d(v, scale) {
  for (var ind in v) {
    for (var ii in v[ind]) {
      v[ind][ii] *= scale;
    }
  }
  return v;
}

function _trans2d(v, x, y) {
  for (var ind in v) {
    v[ind][0] += x;
    v[ind][1] += y;
  }
  return v;
}

function __debug(model, tri_ind) {
  var u = [];
  u[0] = unpack_vert(model, 3*tri_ind);
  u[1] = unpack_vert(model, 3*tri_ind+1);
  u[2] = unpack_vert(model, 3*tri_ind+2);

  var l01 = _vnorm3( _vsub3( u[1], u[0] ) );
  var l12 = _vnorm3( _vsub3( u[2], u[1] ) );
  var l20 = _vnorm3( _vsub3( u[0], u[2] ) );

  var v2 = [
    model.vert2d[tri_ind][0],
    model.vert2d[tri_ind][1],
    model.vert2d[tri_ind][2] ];

  var m01 = _vnorm2( _vsub2( v2[1], v2[0] ) );
  var m12 = _vnorm2( _vsub2( v2[2], v2[1] ) );
  var m20 = _vnorm2( _vsub2( v2[0], v2[2] ) );

  console.log("{" + tri_ind + "}:", l01, m01 );
  console.log("{" + tri_ind + "}:", l12, m12 );
  console.log("{" + tri_ind + "}:", l20, m20 );

}

function _tri_unfold_single(model, a_ind, b_ind) {
  var u = [];
  u[0] = unpack_vert(model, 3*a_ind);
  u[1] = unpack_vert(model, 3*a_ind+1);
  u[2] = unpack_vert(model, 3*a_ind+2);

  var v = [];
  v[0] = unpack_vert(model, 3*b_ind);
  v[1] = unpack_vert(model, 3*b_ind+1);
  v[2] = unpack_vert(model, 3*b_ind+2);

  var eu = [];
  eu[0] = _norm_edge3(u[0], u[1]);
  eu[1] = _norm_edge3(u[1], u[2]);
  eu[2] = _norm_edge3(u[2], u[0]);

  var ev = [];
  ev[0] = _norm_edge3(v[0], v[1]);
  ev[1] = _norm_edge3(v[1], v[2]);
  ev[2] = _norm_edge3(v[2], v[0]);

  var eu_ind;
  var ev_ind;
  for (eu_ind=0; eu_ind<3; eu_ind++) {
    for (ev_ind=0; ev_ind<3; ev_ind++) {
      if (eu[eu_ind] == ev[ev_ind]) { break; }
    }
    if (eu[eu_ind] == ev[ev_ind]) { break; }
  }

  if ((eu_ind==3) || (ev_ind==3)) {
    console.log("eu_ind ev_ind error", eu_ind, ev_ind);
    return;
  }

  var tris = [];

  var tri2_a;
  var tri2_b;
  if (!(a_ind in model.vert2d_placed)) {
    tri2_a = _splat_3d_to_2d_tri_init(model, a_ind, eu_ind);
  } else {
    tri2_a = model.vert2d[a_ind];
  }
  tris.push(tri2_a);

  var a0 = tri2_a[eu_ind];
  var a1 = tri2_a[(eu_ind+1)%3];
  var a2 = tri2_a[(eu_ind+2)%3];

  var da = _vsub2(a0, a1);
  var ang = Math.atan2(da[1], da[0]);

  model.vert2d_placed[b_ind] = true;
  tri2_b = _splat_3d_to_2d_tri(model, b_ind, a0[0], a0[1], ang, ev_ind);

  tris.push(tri2_b);
  return tris;
}

function _tri_3d_to_2d( p ) {
  var a = _vnorm3( _vsub3( p[0], p[1] ) );
  var b = _vnorm3( _vsub3( p[1], p[2] ) );
  var c = _vnorm3( _vsub3( p[2], p[0] ) );

  var a2 = a*a;
  var b2 = b*b;
  var c2 = c*c;

  var alpha = Math.acos( (b2 + c2 - a2) / (2.0*b*c) );
  var beta  = Math.acos( (a2 + c2 - b2) / (2.0*a*c) );
  var gamma = Math.PI - alpha - beta;
}

function unfold_tri_graph(model, tri_graph) {
  var tri_seen = {};
  var tri_queue = [];
  var single_tri_ind = -1;
  for (var tri_ind in tri_graph) {
    tri_queue.push(tri_ind);
    single_tri_ind = tri_ind;
    break;
  }

  var tri_processed=0;

  while (tri_queue.length>0) {
    var tri_ind = tri_queue[0];
   
    for (var nei_tri in tri_graph[tri_ind]) {
      if (tri_seen[nei_tri])
        continue;
      tri_queue.push(nei_tri);
      _tri_unfold_single(model, tri_ind, nei_tri);
    }
    tri_seen[tri_ind] = true;

    tri_queue.shift();
    tri_processed++;
  }

  // Degenerate case of a single triangle.
  //
  if (tri_processed==1) {
    if (single_tri_ind>=0) {
      _splat_3d_to_2d_tri_init(model, single_tri_ind, 0);
    }
  }

}

function _splat_debug_path(model, path, x, y) {
  x = ((typeof x === "undefined") ? 0 : x);
  y = ((typeof y === "undefined") ? 0 : y);

  var s = 10;
  for (var ind=1; ind<path.length; ind++) {
    var u0 = simplecopy( path[ind-1] );
    var v0 = simplecopy( path[ind] );

    u0[0] = u0[0]*s + x; u0[1] = u0[1]*s + y;
    v0[0] = v0[0]*s + x; v0[1] = v0[1]*s + y;

    g_2d.debug_cpath.push({ color:"rgba(0,0,0,0.9)", data: [ u0, v0 ] });
  }
}

function _splat_debug_tri_graph(model, tri_graph, x, y) {
  x = ((typeof x === "undefined") ? 0 : x);
  y = ((typeof y === "undefined") ? 0 : y);
  var tri_seen = {};

  for (var tri_ind in tri_graph) {

    if (!tri_seen[tri_ind]) {
      var v0 = simplecopy( model.vert2d[tri_ind] );
      _scale2d( v0, 10 );
      _trans2d( v0, x, y );
      g_2d.debug_cpath.push({ color:"rgba(255,0,0,0.5)", data: [ v0[0], v0[1] ] });
      g_2d.debug_cpath.push({ color:"rgba(0,255,0,0.5)", data: [ v0[1], v0[2] ] });
      g_2d.debug_cpath.push({ color:"rgba(0,0,255,0.5)", data: [ v0[2], v0[0] ] });
    }
    tri_seen[tri_ind] = true;

    for (var nei_ind in tri_graph[tri_ind]) {
      if (tri_seen[nei_ind]) { continue; }
      tri_seen[nei_ind] = true;

      var v0 = simplecopy( model.vert2d[nei_ind] );
      _scale2d( v0, 10 );
      _trans2d( v0, x, y );
      g_2d.debug_cpath.push({ color:"rgba(255,0,0,0.5)", data: [ v0[0], v0[1] ] });
      g_2d.debug_cpath.push({ color:"rgba(0,255,0,0.5)", data: [ v0[1], v0[2] ] });
      g_2d.debug_cpath.push({ color:"rgba(0,0,255,0.5)", data: [ v0[2], v0[0] ] });
    }

  }

}

//DEBUG
var debug_shift = [0,0];

function contour_tri_graph(model, tri_graph) {

  // Count edges.  2 == internal, 1 == external.
  //
  var edge_count = {};
  for (var tri_ind in tri_graph) {

    var e0 = _norm_edge2( model.vert2d[tri_ind][0], model.vert2d[tri_ind][1] );
    var e1 = _norm_edge2( model.vert2d[tri_ind][1], model.vert2d[tri_ind][2] );
    var e2 = _norm_edge2( model.vert2d[tri_ind][2], model.vert2d[tri_ind][0] );

    if (!(e0 in edge_count)) { edge_count[e0] = 1; }
    else { edge_count[e0]+=1; }

    if (!(e1 in edge_count)) { edge_count[e1] = 1; }
    else { edge_count[e1]+=1; }

    if (!(e2 in edge_count)) { edge_count[e2] = 1; }
    else { edge_count[e2]+=1; }

  }

  var vert_edge = {};
  var vert_val = {};
  for (var tri_ind in tri_graph) {

    for (var edge_ind=0; edge_ind<3; edge_ind++) {
      var e = _norm_edge2( model.vert2d[tri_ind][edge_ind], model.vert2d[tri_ind][(edge_ind+1)%3] );
      if (edge_count[e]==1) {
        var u = _norm_vert2( model.vert2d[tri_ind][edge_ind] );
        var v = _norm_vert2( model.vert2d[tri_ind][(edge_ind+1)%3] );

        vert_val[u] = model.vert2d[tri_ind][edge_ind];
        vert_val[v] = model.vert2d[tri_ind][(edge_ind+1)%3];

        if (!(u in vert_edge)) { vert_edge[u] = {}; }
        vert_edge[u][v] = model.vert2d[tri_ind][(edge_ind+1)%3];

        if (!(v in vert_edge)) { vert_edge[v] = {}; }
        vert_edge[v][u] = model.vert2d[tri_ind][edge_ind];
      }

    }

  }

  var vert_seen = {};
  var max_n = model.vert2d.length;


  var norm_vert;
  for (var v in vert_edge) {
    norm_vert = v;
    break;
  }

  scale=100000;

  if (norm_vert in vert_seen) { return; }
  vert_seen[norm_vert] = true;

  var clip_path = [];
  var tv = vert_val[norm_vert];
  clip_path.push({ X: Math.floor(tv[0]*scale+0.5), Y: Math.floor(tv[1]*scale+0.5) });

  var cur_path = [ vert_val[norm_vert] ];
  var cur_norm_vert = norm_vert;

  var count=0;
  while (true) {
    if (count>max_n) { console.log("ERROR!!! max_n exceed vert2d.length"); break; }

    var last_v = ".";
    for (var norm_u in vert_edge[cur_norm_vert]) {
      if (norm_u in vert_seen) { continue; }
      vert_seen[norm_u] = true;

      var tv = vert_val[norm_u];
      clip_path.push({ X: Math.floor(tv[0]*scale+0.5), Y: Math.floor(tv[1]*scale+0.5) });

      cur_path.push( vert_edge[cur_norm_vert][norm_u] );
      last_v = norm_u;
      break;
    }
    if (last_v == ".") { break; }

    cur_norm_vert = last_v;

    count++;
  }
  if (count>max_n) { return;}

  var tv = vert_val[norm_vert];
  clip_path.push({ X: Math.floor(tv[0]*scale+0.5), Y: Math.floor(tv[1]*scale+0.5) });
  cur_path.push( vert_val[norm_vert] );

  console.log( norm_vert, ">>>", clip_path, ClipperLib.SelfIntersects(clip_path) );
  _splat_debug_path(model, cur_path, debug_shift[0], debug_shift[1]);
  //debug_shift[0] += 1000;
  //debug_shift[1] += 1000;

  console.log("---------------------------------------");


  //console.log(edge_count);
  //console.log(vert_edge);

}

function do_complete_unfold() {
  var section = choose_polygon_sections(g_pepacat_model);
  var model = g_pepacat_model;
  var tri_graph;

  for (var s_ind in section) {
    tri_graph = cut_tri_section(model, section[s_ind]);
    unfold_tri_graph(model, tri_graph);
    _splat_debug_tri_graph(model, tri_graph, 1000*s_ind, 1000*s_ind);

    debug_shift[0] = 1000*s_ind;
    debug_shift[1] = 1000*s_ind;

    contour_tri_graph(model, tri_graph);
  }

  return;

  var vert_seen = {};
  var max_n = model.vert2d.length;

  for (var norm_vert in vert_edge) {
    console.log(">>>",norm_vert);

    if (norm_vert in vert_seen) { continue; }
    vert_seen[norm_vert] = true;

    var cur_path = [];
    var cur_norm_vert = norm_vert;

    var count=0;
    while (true) {
      if (count>max_n) { console.log("ERROR!!! max_n exceed vert2d.length"); break; }

      for (var norm_u in vert_edge[cur_norm_vert]) {
        if (norm_u in vert_seen) { continue; }
        vert_seen[norm_u] = true;
      }


      count++;
    }
    if (count>max_n) { break;}

  }

  console.log(edge_count);
  console.log(vert_edge);
}
