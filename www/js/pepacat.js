/* library for pepacat.
 *    
 * - flatten triangles onto plane
 * - join triangle strips
 * - test for self intersection (requires clipperlib)
 * - adorn triangle groups with tabs
 *
 */


// Functions:
// PepacatModel(model_raw_bytes?)
//   pm.TriGroupBoundingBox(tri_group)
//   pm.SplitTriangle(fix_tri_idx, mov_tri_idx)
//   pm.JoinTriangle(fix_tri_idx, mov_tri_idx)
//   pm.HeuristicUnfold(info)
//   pm.TriGroupSelfIntersects(tri_group)
//

var PEPACAT_EPSILON = 0.000001;
var PEPACAT_EPSILON_SQ = PEPACAT_EPSILON*PEPACAT_EPSILON;
var sly = {}, clipper = {};

if (typeof module !== 'undefined') {

  var stl = require("stl");
  var fs = require("fs");
  sly = require("sylvester");
  numeric = require("numeric");
  clipper = require("./clipper.js");
  var ClipperLib = clipper;

  var MODEL_FN = "../../www/models/Bunny-LowPoly.stl";

} else {

  sly = Sylvester;
  sly.Vector = Vector;
  sly.Matrix = Matrix;
  sly.Line = Line;

  clipper = ClipperLib;

}

function print_tri_gp(tri, pfx) {
  pfx = ((typeof pfx === "undefined") ? "" : pfx);
  for (var idx=0; idx<3; idx++) {
    console.log(String(pfx) + tri[idx][0], tri[idx][1], tri[idx][2]);
  }
  console.log(String(pfx) + tri[0][0], tri[0][1], tri[0][2])
  console.log("\n");
}

function print_tri_2d_gp(tri, pfx) {
  pfx = ((typeof pfx === "undefined") ? "" : pfx);
  for (var idx=0; idx<3; idx++) {
    console.log(String(pfx) + tri[idx][0], tri[idx][1]);
  }
  console.log(String(pfx) + tri[0][0], tri[0][1]);
  console.log(String(pfx) + "\n");
}

// `pgns` is an array of objects that have 'X' and 'Y' as keys.
// Everything is done in integer math.
//
function clip_union(rop_pgns, pgns) {
  var clpr = new ClipperLib.Clipper();
  var joinType = ClipperLib.JoinType.jtRtound;
  var fillType = ClipperLib.PolyFillType.pftPositive;
  var subjPolyType = ClipperLib.PolyType.ptSubject;
  var clipPolyType = ClipperLib.PolyType.ptClip;
  var clipType = ClipperLib.ClipType.ctUnion;

  //clpr.AddPolygons( pgns, subjPolyType );
  clpr.AddPaths( pgns, subjPolyType, true );
  clpr.Execute(clipType, rop_pgns, fillType, fillType);
}

function clip_area(pgns) {
  var area = 0.0;
  for (var i=0; i<pgns.length; i++) {
    area += ClipperLib.Clipper.Area(pgns[i]);
  }
  return area;
}

//TESTING

function clipper_test0() {

  var pgn = [];

  pgn.push({X:0, Y:0});
  pgn.push({X:1000, Y:0});
  pgn.push({X:1000, Y:1000});
  pgn.push({X:0, Y:1000});

  var rop_pgn = [];

  clip_union(rop_pgn, [pgn]);

  console.log("#ok");
  for (var i=0; i<rop_pgn.length; i++) {
    console.log(rop_pgn[i]);
  }
}

function clipper_test1() {

  var pgn0 = [], pgn1=[];

  pgn0.push({X:0, Y:0});
  pgn0.push({X:1000, Y:0});
  pgn0.push({X:1000, Y:1000});
  pgn0.push({X:0, Y:1000});

  pgn1.push({X:-100, Y:400});
  pgn1.push({X:1200, Y:400});
  pgn1.push({X:1200, Y:600});
  pgn1.push({X:-100, Y:600});

  var rop_pgn = [];

  clip_union(rop_pgn, [pgn0, pgn1]);

  console.log("#ok");
  for (var i=0; i<rop_pgn.length; i++) {
    for (var j=0; j<rop_pgn[i].length; j++) {
      console.log(rop_pgn[i][j].X, rop_pgn[i][j].Y);
    }
    console.log("");
  }

  console.log("#area", ClipperLib.Clipper.Area(rop_pgn[0]));

}

function clipper_test2() {

  var pgn0 = [], pgn1=[], pgn2=[];

  pgn0.push({X:0, Y:0});
  pgn0.push({X:1000, Y:0});
  pgn0.push({X:1000, Y:200});
  pgn0.push({X:0, Y:200});

  pgn1.push({X:-100, Y:0});
  pgn1.push({X:0, Y:0});
  pgn1.push({X:500, Y:1000});
  pgn1.push({X:400, Y:1000});

  pgn2.push({X:1000, Y:0});
  pgn2.push({X:1200, Y:0});
  pgn2.push({X:500, Y:1000});
  pgn2.push({X:400, Y:1000});

  var rop_pgn = [];

  var inp_pgns = [pgn0, pgn1, pgn2];

  for (var i=0; i<inp_pgns.length; i++) {
    console.log("#", i);
    for (var j=0; j<inp_pgns[i].length; j++)  {
      console.log(inp_pgns[i][j].X, inp_pgns[i][j].Y);
    }
    console.log("");
  }

  clip_union(rop_pgn, inp_pgns);

  console.log("#ok", rop_pgn.length);
  for (var i=0; i<rop_pgn.length; i++) {
    for (var j=0; j<rop_pgn[i].length; j++) {
      console.log(rop_pgn[i][j].X, rop_pgn[i][j].Y);
    }
    console.log("");
  }

  console.log("#area", clip_area(rop_pgn));

  for (var i=0; i<rop_pgn.length; i++) {
    console.log("#area [" + i + "]", ClipperLib.Clipper.Area(rop_pgn[i]));
  }

}

//clipper_test2();
//process.exit();
//TESTING


function Area(tri) {
  var u = sly.Vector.create([ tri[1][0] - tri[0][0], tri[1][1] - tri[0][1], tri[1][2] - tri[0][2] ]);
  var v = sly.Vector.create([ tri[2][0] - tri[0][0], tri[2][1] - tri[0][1], tri[2][2] - tri[0][2] ]);
  var uv = u.cross(v);
  //return uv.distanceFrom([0,0,0])/2.0;
  return uv.distanceFrom([0,0,1])/2.0;
}

function Area2D(tri) {
  var u = sly.Vector.create([ tri[1][0] - tri[0][0], tri[1][1] - tri[0][1], 1 ]);
  var v = sly.Vector.create([ tri[2][0] - tri[0][0], tri[2][1] - tri[0][1], 1 ]);
  var uv = u.cross(v);
  //return uv.distanceFrom([0,0,0])/2.0;

  //console.log(u,v,uv);

  return uv.distanceFrom([0,0,1])/2.0;
}

function FlattenTriangle(tri, norm) {
  var u = sly.Vector.create(tri[0]);
  var v = sly.Vector.create(tri[1]);
  var w = sly.Vector.create(tri[2]);
  var n = sly.Vector.create(norm);

  var uv = u.subtract(v);
  var vw = v.subtract(w);
  var uw = u.subtract(w);

  var cross = uv.cross(uw);
  var pp = cross.dot(norm);

  if (pp<0) { var t = v; v = w; w = t; }

  var d0 = v.distanceFrom(u);
  var d1 = w.distanceFrom(u);

  var a = uv.angleFrom(uw);

  var flat_tri = [ [0,0,1], [d0, 0, 1], [0,0,1] ];

  flat_tri[2][0] = d1*Math.cos(a);
  flat_tri[2][1] = d1*Math.sin(a);

  return flat_tri;
}

function TransformTriangle2D(tri, dv, ang, ang_anchor) {
  var t = [ sly.Vector.create(tri[0]),
            sly.Vector.create(tri[1]),
            sly.Vector.create(tri[2]) ];
  var v = sly.Vector.create(dv);
  var Z = sly.Line.create([ang_anchor[0],ang_anchor[1],ang_anchor[2]], [0,0,1]);

  for (var i=0; i<3; i++) {
    t[i] = t[i].add(v);
    t[i] = t[i].rotate(ang, Z);
  }

  return [
    [t[0].elements[0], t[0].elements[1], t[0].elements[2]],
    [t[1].elements[0], t[1].elements[1], t[1].elements[2]],
    [t[2].elements[0], t[2].elements[1], t[2].elements[2]]
  ];

}

function _mA(ang) {
  return [ [ Math.cos(ang), -Math.sin(ang), 0 ], [ Math.sin(ang), Math.cos(ang), 0 ], [ 0, 0, 1 ] ];
}

function _mT(dx, dy) {
  return [ [ 1, 0, dx ], [ 0,1, dy ], [ 0, 0, 1 ] ];
}


// Assumes both triangles are already on the x-y (z=1) plane.
// Fix tri0 and align the appropriate edge of tri1 to tri0.
//
function Align2DTriangles(tri0, e0_idx0, e0_idx1, tri1, e1_idx0, e1_idx1) {
  var t0 = [ sly.Vector.create(tri0[0]),
             sly.Vector.create(tri0[1]),
             sly.Vector.create(tri0[2]) ];

  var t1 = [ sly.Vector.create(tri1[0]),
             sly.Vector.create(tri1[1]),
             sly.Vector.create(tri1[2]) ];

  // Translation tri1 to tri0's vertex origin of
  // the edge they share.
  //
  var dv = t0[e0_idx1].subtract(t1[e1_idx0]);

  for (var idx=0; idx<3; idx++) {
    t1[idx] = t1[idx].add(dv);
  }

  //print_tri_2d_gp( [ t1[0].elements, t1[1].elements, t1[2].elements], "###" );

  var ox = tri0[e0_idx1][0];
  var oy = tri0[e0_idx1][1];
  var oz = tri0[e0_idx1][2];

  // Calculate both edge vectors for each triangle.
  //
  var v0 = t0[e0_idx1].subtract(t0[e0_idx0]);
  var v1 = t1[e1_idx0].subtract(t1[e1_idx1]);


  // Find the angle between them
  //
  var ang = v0.angleFrom(v1);

  // angleFrom returns 0 to pi.  v0 and v1 sit on the z=0
  // plane and if v1 is 'to the left of' v0, then the
  // angle should be negative to take into account
  // that the v1 vector has 'flipped' around.
  //
  var v0v1 = v0.cross(v1);
  if (v0v1.elements[2] > 0) { ang = -ang; }

  var Z = sly.Line.create([ox,oy,1], [0,0,1]);

  for (var idx=0; idx<3; idx++) {
    t1[idx] = t1[idx].rotate(ang, Z);
  }


  //console.log("# ang:", ang);

  var ret = {
    "a":ang,
    "v": [ dv.elements[0], dv.elements[1], dv.elements[2] ],
    "anchor": [ox, oy, 1],

    // Assumes Tv with numeric
    //
    //"T": numeric.dot( _mA(ang) , _mT(dv.elements[0], dv.elements[1]) ),
    "T": numeric.dot( _mT(ox, oy), numeric.dot( _mA(ang), numeric.dot( _mT(-ox, -oy), _mT(dv.elements[0], dv.elements[1]))) ),
    //"T": _mA(ang),

    "tri": [
      [ t1[0].elements[0], t1[0].elements[1], t1[0].elements[2] ],
      [ t1[1].elements[0], t1[1].elements[1], t1[1].elements[2] ],
      [ t1[2].elements[0], t1[2].elements[1], t1[2].elements[2] ]
    ]
  };

  return ret;

}

function PepacatModel() {

  this.tri_mesh_3d = [];
  this.tri_geom_3d = [];

  // Array of traignles from original model
  // Immutable after first population.
  //
  this.tri3d = [];

  // array of normals for each of the triangles.
  // Immutable after first population.
  //
  this.trn3d = [];


  // 2D flattened triangles from the 3d list.
  // Meant to be pretty much immutable after initial flattening.
  //
  this.tri2d = [];


  // Map edges to the triangles connected to them
  //
  this.edge3d_adjmap = {};

  // key is src->dst tri index.  Element is src_edge, dst_edge
  //
  this.tri_adjmap = {};

  // 2d layers for unfolding and rendering
  //
  this.layer2d = {
    "skel" : {}, // base skeleton
    "cut" : {},  // out boundary of cut item
    "score" : {} // scoring
  };

  this.info = {
    "tab" : "trapezoid",
    "tab_height": 0.125,
    "tab_angle" : Math.PI/6.0,
    "tab_x" : 0,

    "print_sheet" : "A3",

    //"premul" : 100000,
    "premul" : 10000000,
    "scoring": "solid", // "dashed"
    "numbering": "tab" // label tabs
  };

  this.info.tab_x = this.info.tab_height / Math.tan(this.info.tab_angle);

  // key is the group name.
  // trigroup2d[<name>]:
  //   dirty : needs updating
  //   anchor_tri_idx : index of triangle used to anchor realization
  //   G :
  //   bbox: bounding box of ralized triangle group
  //   tri_idx_map[<tri_index>]:
  //       nei_tri_idx_map : map of connected neightbors.  Elements are { src_edge : [ src0, src1 ], dst_edge : [ dst0, dst1 ] },
  //                         where src is from tri_index, and dst is from the neighbor tri index
  //       tri2d : realization of triangle (2d) (post tranfsormation, actual realization)
  //       T : transform of triangle (2d)
  //       adorn : array of tab adornments ("none", "trapezoid") for each edge (idx,idx+1).
  //       visited : internal use when updating group
  //        
  //
  this.trigroup2d = {};

  this.edge3d_adjmap = {};
  this.tri_idx_trigroup_lookback = {};

}

PepacatModel.prototype.ExportJSON = function(a, b) {
  var json = {};

  json["tri3d"] = this.tri3d;
  json["trn3d"] = this.trn3d;
  json["tri2d"] = this.tri2d;
  json["tri_adjmap"] = this.tri_adjmap;

  json["layer2d"] = this.layer2d;

  json["info"] = this.info;
  json["trigroup2d"] = this.trigroup2d;
  json["edge3d_adjmap"] = this.edge3d_adjmap;
  json["tri_idx_trigroup_lookback"] = this.tri_idx_trigroup_lookback;

  return JSON.stringify(json);
}

PepacatModel.prototype.allclose = function(a, b) {
  var n = a.length;
  var m = b.length;
  if (n!=m) { return false; }

  var eps = 1.0 / this.info.premul;

  for (var ii=0; ii<n; ii++) {
    var del = Math.abs(a[ii] - b[ii]);
    if (del > eps) { return false; }
  }
  return true;
}

PepacatModel.prototype.LoadSTLFile = function(fn) {
  var facets = stl.toObject(fs.readFileSync(fn));

  var norms = [];
  var verts = [];

  var data = facets.facets;

  for (var ii=0, il=data.length; ii<il; ii++) {
    norms.push(data[ii].normal);
    verts.push(data[ii].verts);

    //console.log(data[ii].normal);
    //console.log(data[ii].verts);
  }

  //console.log(facets);

  return this.LoadModel(verts, norms);
}

PepacatModel.prototype.LoadModel = function(_verts, _norms) {
  var m = this.info.premul;

  var adjmap = {};

  var N = _verts.length;

  //for (var idx=0; idx<facets.facets.length; idx++) {
  for (var idx=0; idx<N; idx++) {
    //var verts = facets.facets[idx].verts;
    //var norm = facets.facets[idx].normal;
    var verts = _verts[idx];
    var norm = _norms[idx];
    this.tri3d.push( [ verts[0], verts[1], verts[2] ] );

    var cur_idx = this.tri3d.length-1;

    // Calculate the implied normal
    //
    var u = sly.Vector.create(verts[0]);
    var v = sly.Vector.create(verts[1]);
    var w = sly.Vector.create(verts[2]);
    var uv = u.subtract(v);
    var vw = v.subtract(w);
    var n = uv.cross(vw).toUnitVector();

    // If the stored normal doesn't exist, populate it with the calculated normal
    //
    if ((norm[0]*norm[0] + norm[1]*norm[1] + norm[2]*norm[2]) < 0.5) {
      this.trn3d.push(n.elements);
    }
   
    // Otherwise make sure the normal directions smatch.  If they don't,
    // re-orient the stored vectors.
    //
    else {
      this.trn3d.push( norm );

      var rep_norm = sly.Vector.create(norm);
      if (n.dot(rep_norm) < 0) {
        var t = this.tri3d[cur_idx][2];
        this.tri3d[cur_idx][2] = this.tri3d[cur_idx][0];
        this.tri3d[cur_idx][0] = t;

        console.log("swapping");
      }
    }

    for (var ii=0; ii<3; ii++) {

      var jj = (ii+1)%3;

      var key =
        String(Math.round(m*verts[ii][0])) + "," +
        String(Math.round(m*verts[ii][1])) + "," +
        String(Math.round(m*verts[ii][2])) +
        ":" +
        String(Math.round(m*verts[jj][0])) + "," +
        String(Math.round(m*verts[jj][1])) + "," +
        String(Math.round(m*verts[jj][2]));

      if (key in adjmap) {
        adjmap[key].info.push( { "tri_index":idx, "edge":[ii,jj] } );
      } else {
        adjmap[key] = {};
        adjmap[key]["info"] = [ { "tri_index":idx, "edge":[ii,jj] } ];
      }

      key =
        String(Math.round(m*verts[jj][0])) + "," +
        String(Math.round(m*verts[jj][1])) + "," +
        String(Math.round(m*verts[jj][2])) +
        ":" +
        String(Math.round(m*verts[ii][0])) + "," +
        String(Math.round(m*verts[ii][1])) + "," +
        String(Math.round(m*verts[ii][2]));

      if (key in adjmap) {
        adjmap[key].info.push( { "tri_index":idx, "edge":[ii,jj] } );
      } else {
        adjmap[key] = {};
        adjmap[key]["info"] = [ { "tri_index":idx, "edge":[ii,jj] } ];
      }

    }

    this.tri2d.push( FlattenTriangle(this.tri3d[cur_idx], this.trn3d[cur_idx]) );

  }

  this.edge3d_adjmap = adjmap;

  for (var key in adjmap) {
    if (adjmap[key].info.length != 2) { continue; }

    var info = adjmap[key].info;
    this.edge3d_adjmap[key]["map"] = {};
    this.edge3d_adjmap[key].map[info[0].tri_index] = { "nei_index": info[1].tri_index, "edge": info[0].edge };
    this.edge3d_adjmap[key].map[info[1].tri_index] = { "nei_index": info[0].tri_index, "edge": info[1].edge };

    var idx0 = info[0].tri_index;
    var idx1 = info[1].tri_index;

    if (!(idx0 in this.tri_adjmap)) {
      this.tri_adjmap[idx0] = {};
    }
    this.tri_adjmap[idx0][idx1] = { "src_edge" : info[0].edge, "dst_edge" : info[1].edge };

    if (!(idx1 in this.tri_adjmap)) {
      this.tri_adjmap[idx1] = {};
    }
    this.tri_adjmap[idx1][idx0] = { "src_edge" : info[1].edge, "dst_edge" : info[0].edge };
  }

  this.tri_idx_trigroup_lookback = {};

  // initialize trigroup
  //
  for (var idx=0; idx<this.tri3d.length; idx++) {

    var trigroupname = idx;

    // first entry is a row...
    //
    this.trigroup2d[trigroupname] = {
      "dirty" : true,
      "anchor_tri_idx" : idx,
      "G" : {},
      "tri_idx_map": {}
    };

    this.trigroup2d[trigroupname].tri_idx_map[idx] = {
      "tri2d": this.tri2d[idx],
      "T": [[1,0,0],[0,1,0],[0,0,1]],
      "adorn": [ "trapezoid", "trapezoid", "trapezoid" ],
      "nei_tri_idx_map": {}
    };

    this.trigroup2d[trigroupname].G[idx] = { "tri3d": this.tri3d[idx] };

    this.tri_idx_trigroup_lookback[idx] = trigroupname;
  }

  return this;
}

// Some sanity checking to make sure our structures are consistent.
//
PepacatModel.prototype.Consistency = function() {

  var count=0;
  var S = this.info.premul;
  var idx_group = {};

  //S = Math.floor(this.info.premul/100);

  // test realization
  for (var group_name in this.trigroup2d) {
    var g = this.trigroup2d[group_name];

    for (var tri_idx in g.tri_idx_map) {
      var src_tri2d = g.tri_idx_map[tri_idx].tri2d;
      for (var nei_idx in g.tri_idx_map[tri_idx].nei_tri_idx_map) {
        var edge = g.tri_idx_map[tri_idx].nei_tri_idx_map[nei_idx];
        var nei_tri2d = g.tri_idx_map[nei_idx].tri2d;

        var akey = _key2d(src_tri2d[edge.src_edge[0]][0], src_tri2d[edge.src_edge[0]][1], S);
        var bkey = _key2d(nei_tri2d[edge.dst_edge[1]][0], nei_tri2d[edge.dst_edge[1]][1], S);
        if (akey != bkey) {
          return {
            error: true,
            message: "vertex mismatch " + tri_idx + "->" + nei_idx + " (" + akey + "!=" + bkey + ")"
          };
        }

        akey = _key2d(src_tri2d[edge.src_edge[1]][0], src_tri2d[edge.src_edge[1]][1], S);
        bkey = _key2d(nei_tri2d[edge.dst_edge[0]][0], nei_tri2d[edge.dst_edge[0]][1], S);
        if (akey != bkey) {
          return {
            error: true,
            message: "vertex mismatch " + tri_idx + "->" + nei_idx + " (" + akey + "!=" + bkey + ")"
          };
        }


      }
    }
  }

  for (var gn in this.trigroup2d) {
    var g = this.trigroup2d[gn];

    if (("deleted" in g) && (g.deleted)) {
      return {
        error: true,
        message: "group " + gn + " marked as deleted"
      };
    }

    for (var tri_idx in g.tri_idx_map) {

      if (tri_idx in idx_group) {
        if (idx_group[tri_idx] != gn) {
          return { error: true, message: "tri_idx " + tri_idx + " group doesn't match (seen " + idx_group[tri_idx] + " but currently on group " + gn + ")" };
        }
      }
      idx_group[tri_idx] = gn;

      for (var nei_tri_idx in g.tri_idx_map[tri_idx].nei_tri_idx_map) {
        if (!(tri_idx in this.tri_adjmap)) { return { error: true, message: "tri_idx " + tri_idx + " not in tri_adjmap" }; }
        if (!(nei_tri_idx in this.tri_adjmap[tri_idx])) { return { error: true, message: "tri_idx " + tri_idx + " -> " + nei_tri_idx + " not in tri_adjmap" }; }
        if (!(nei_tri_idx in this.tri_adjmap)) { return { error: true, message: "nei_tri_idx " + nei_tri_idx + " not in tri_adjmap" }; }
        if (!(tri_idx in this.tri_adjmap[nei_tri_idx])) { return { error: true, message: "nei_tri_idx " + nei_tri_idx + " -> " + tri_idx + " not in tri_adjmap" }; }

        if (!(tri_idx in this.tri2d)) { return { error: true, message: "tri_idx " + tri_idx + " not in tri2d" }; }
        if (!(nei_tri_idx in this.tri2d)) { return { error: true, message: "nei_tri_idx " + nei_tri_idx + " not in tri2d" }; }

        if (nei_tri_idx in idx_group) {
          if (idx_group[nei_tri_idx] != gn) {
            return {
              error: true,
              message: "nei_tri_idx " + nei_tri_idx + " (from tri_idx " + tri_idx + ") group doesn't match (seen " + idx_group[nei_tri_idx] + " but currently on group " + gn + ")"
            };
          }
        }
        idx_group[nei_tri_idx] = gn;

        var src_edge = g.tri_idx_map[tri_idx].nei_tri_idx_map[nei_tri_idx].src_edge;
        var dst_edge = g.tri_idx_map[tri_idx].nei_tri_idx_map[nei_tri_idx].dst_edge;

        if ( ((src_edge[0]+1)%3) != src_edge[1] ) {
          return {
            error: true,
            message: "tri_idx " + tri_idx + " -> " + nei_tri_idx + " src_edge misalignment: " + JSON.stringify(src_edge)
          };
        }

        if ( ((dst_edge[0]+1)%3) != dst_edge[1] ) {
          return {
            error: true,
            message: "tri_idx " + tri_idx + " -> " + nei_tri_idx + " dst_edge misalignment: " + JSON.stringify(dst_edge)
          };
        }


        //?

      }

      var tri2d = g.tri_idx_map[tri_idx].tri2d;
      var T = g.tri_idx_map[tri_idx].T;
      var _tri2d = numeric.dot(this.tri2d[tri_idx], numeric.transpose(T));

      for (var ii=0; ii<3; ii++) {
        var a = Math.round(tri2d[ii][0] * S);
        var b = Math.round(_tri2d[ii][0] * S);
        if (a!=b) { return { error: true, message: "tri_idx " + tri_idx + " doesn't match realization (vertex " + ii + ",  0) ( " + a + " != " + b + " )" }; }

        a = Math.round(tri2d[ii][1] * S);
        b = Math.round(_tri2d[ii][1] * S);
        if (a!=b) { return { error: true, message: "tri_idx " + tri_idx + " doesn't match realization (vertex " + ii + ",  1) ( " + a + " != " + b + " )" }; }
      }

    }

  }

  for (var tri_idx in this.tri_idx_trigroup_lookback) {
    if (this.tri_idx_trigroup_lookback[tri_idx] != idx_group[tri_idx]) {
      return {
        error:true,
        message: "tri_idx " + tri_idx + " tri_idx_trigroup_lookback mismatch (tri_idx_trigroup_lookback " + this.tri_idx_trigroup_lookback[tri_idx] + " != " + idx_group[tri_idx] + ")"
      };
    }
  }

  for (var tri_idx in this.tri_adjmap) {
    if (!(tri_idx in idx_group)) {
      return { error: true, message: "tri_idx " + tri_idx + " in tri_adjmap doesn't appear in a trigroup2d"};
    }
  }

  return { error:false, message:"", debug: count };
}

PepacatModel.prototype.TriGroupBoundingBox = function(tri_group) {
  var tri_idx_map = tri_group.tri_idx_map;
  var first = true;
  var bbox = { "lx":0, "ux":0, "ly":0, "uy":0, "bbox":[[0,0],[0,0]] };
  for (var tri_idx in tri_idx_map) {
    var tri = tri_idx_map[tri_idx].tri2d;
    for (var ii=0; ii<tri.length; ii++) {
      if (first) {
        bbox.lx = tri[ii][0];
        bbox.ux = tri[ii][0];

        bbox.ly = tri[ii][1];
        bbox.uy = tri[ii][1];

      }

      if (tri[ii][0] < bbox.lx) { bbox.lx = tri[ii][0]; }
      if (tri[ii][0] > bbox.ux) { bbox.ux = tri[ii][0]; }
      if (tri[ii][1] < bbox.ly) { bbox.ly = tri[ii][1]; }
      if (tri[ii][1] > bbox.uy) { bbox.uy = tri[ii][1]; }
      first = false;
    }
  }

  bbox.bbox[0][0] = bbox.lx;
  bbox.bbox[0][1] = bbox.ly;

  bbox.bbox[1][0] = bbox.ux;
  bbox.bbox[1][1] = bbox.uy;

  return bbox;
}

PepacatModel.prototype.TriGroupSelfIntersects = function(tri_group) {
  var maxarea = this.TriGroupMaxArea(tri_group);
  var cliparea = this.TriGroupClipArea(tri_group);
  return ((Math.abs(maxarea-cliparea) < (2.0/this.info.premul)) ? false : true);
}

PepacatModel.prototype.TriGroupTranslate = function(group, dx, dy) {
  var rep_idx = -1;
  var T = _mT(dx, dy);
  for (var tri_idx in group.tri_idx_map) {
    if (rep_idx == -1) { rep_idx = tri_idx; }
		group.tri_idx_map[tri_idx].T = numeric.dot(T, group.tri_idx_map[tri_idx].T);
		var _tri2d = numeric.dot(this.tri2d[tri_idx], numeric.transpose(group.tri_idx_map[tri_idx].T));
		group.tri_idx_map[tri_idx].tri2d = _tri2d;
  }
	group.bbox = this.TriGroupBoundingBox(group);
}

PepacatModel.prototype.TriGroupRotate = function(group, px, py, rad) {
  var aT = _mT(-px, -py);
  var bT = _mT(px, py);
	var R = _mA(rad);
  var rep_idx = -1;

  for (var tri_idx in group.tri_idx_map) {
    if (rep_idx == -1) { rep_idx = tri_idx; }
		group.tri_idx_map[tri_idx].T = numeric.dot(bT, numeric.dot(R, numeric.dot(aT, group.tri_idx_map[tri_idx].T)));
		var _tri2d = numeric.dot(this.tri2d[tri_idx], numeric.transpose(group.tri_idx_map[tri_idx].T));
		group.tri_idx_map[tri_idx].tri2d = _tri2d;
  }
	group.bbox = this.TriGroupBoundingBox(group);
}


PepacatModel.prototype.TriGroupName = function(tri_idx) {
  return this.tri_idx_trigroup_lookback[tri_idx];
}

PepacatModel.prototype.FindEdge = function(src_tri_idx, dst_tri_idx) {

  var verts = this.tri3d[src_tri_idx];

  for (var ii=0; ii<3; ii++) {
    var jj = (ii+1)%3;

    var key = 
      String(Math.round(m*verts[ii][0])) + "," +
      String(Math.round(m*verts[ii][1])) + "," +
      String(Math.round(m*verts[ii][2])) +
      ":" +
      String(Math.round(m*verts[jj][0])) + "," +
      String(Math.round(m*verts[jj][1])) + "," +
      String(Math.round(m*verts[jj][2]));

    if (!(key in this.edge3d_adjmap)) { continue; }

    if (dst_tri_idx in this.edge3d_adjmap[key].map) {
      return this.edge3d_adjmap[key].map;
    }

  }

  return null;

}

function VecNum(n, x, y, dx, dy) {
  n = Math.round(n);
  x = ((typeof x === "undefined") ? 0 : x);
  y = ((typeof y === "undefined") ? 0 : y);

  dx = ((typeof dx === "undefined") ? 1 : dx);
  dy = ((typeof dy === "undefined") ? -1 : -dy);

  var rvec = [];

  var dxw = 1.5*dx;
  var dyw = 1.5*dy;

  while (true) {
    var v = n%10;
    n/=10;

    if (v == 0) {
      rvec.push([x, y]);
      rvec.push([x+dx, y]);
      rvec.push([x+dx, y+dy]);
      rvec.push([x,y+dy]);
      rvec.push([x,y]);
    } else if (v==1) {
      rvec.push([x,y]);
      rvec.push([x,y+dy]);
    } else if (v==2) {
      rvec.push([x+dx, y]);
      rvec.push([x,y]);
      rvec.push([x,y+dy/2]);
      rvec.push([x+dx, y+dy/2]);
      rvec.push([x+dx, y+dy]);
      rvec.push([x,y+dy]);
    } else if (v==3) {
      rvec.push([x,y]);
      rvec.push([x+dx,y]);
      rvec.push([x+dx,y+dy]);
      rvec.push([x,y+dy]);
      rvec.push([]);
      rvec.push([x,y+dy/2]);
      rvec.push([x+dx,y+dy/2]);
    } else if (v==4) {
      rvec.push([x+dx,y]);
      rvec.push([x+dx,y+dy]);
      rvec.push([x, y+dy/2]);
      rvec.push([x+dx,y+dy/2]);
    } else if (v==5) {
      rvec.push([x,y]);
      rvec.push([x+dx,y]);
      rvec.push([x+dx,y+dy/2]);
      rvec.push([x,y+dy/2]);
      rvec.push([x,y+dy]);
      rvec.push([x+dx,y+dy]);
    } else if (v==6) {
      rvec.push([x,y]);
      rvec.push([x+dx,y]);
      rvec.push([x+dx,y+dy/2]);
      rvec.push([x,y+dy/2]);
      rvec.push([x,y+dy]);
      rvec.push([x,y]);
    } else if (v==7) {
      rvec.push([x,y]);
      rvec.push([x+dx,y+dy]);
      rvec.push([x,y+dy]);
    } else if (v==8) {
      rvec.push([x, y]);
      rvec.push([x+dx, y]);
      rvec.push([x+dx, y+dy]);
      rvec.push([x,y+dy]);
      rvec.push([x, y]);
      rvec.push([]);
      rvec.push([x,y+dy/2]);
      rvec.push([x+dx,y+dy/2]);
    } else if (v==9) {
      rvec.push([x,y]);
      rvec.push([x+dx,y]);
      rvec.push([x+dx,y+dy/2]);
      rvec.push([x,y+dy/2]);
      rvec.push([x,y+dy]);
      rvec.push([x+dx,y+dy]);
      rvec.push([]);
      rvec.push([x+dx,y]);
      rvec.push([x+dx,y+dy]);
    }


    rvec.push([]);
    x -= dxw;


    n = Math.floor(n);

    if (n<1) { break; }
  }

  return rvec;
}


function PrintNum(n, x, y) {
  n = Math.round(n);

  var dx = 1;
  var dy = 1;

  var dxw = 2;
  var dyw = 2;

  while (true) {
    var v = n%10;
    n/=10;

    if (v == 0) {
      console.log(x, y);
      console.log(x+dx, y);
      console.log(x+dx, y+dy);
      console.log(x,y+dy);
      console.log(x,y);
    } else if (v==1) {
      console.log(x,y);
      console.log(x,y+dy);
    } else if (v==2) {
      console.log(x+dx, y);
      console.log(x,y);
      console.log(x,y+dy/2);
      console.log(x+dx, y+dy/2);
      console.log(x+dx, y+dy);
      console.log(x,y+dy);
    } else if (v==3) {
      console.log(x,y);
      console.log(x+dx,y);
      console.log(x+dx,y+dy);
      console.log(x,y+dy);
      console.log("");
      console.log(x,y+dy/2);
      console.log(x+dx,y+dy/2);
    } else if (v==4) {
      console.log(x+dx,y);
      console.log(x+dx,y+dy);
      console.log(x, y+dy/2);
      console.log(x+dx,y+dy/2);
    } else if (v==5) {
      console.log(x,y);
      console.log(x+dx,y);
      console.log(x+dx,y+dy/2);
      console.log(x,y+dy/2);
      console.log(x,y+dy);
      console.log(x+dx,y+dy);
    } else if (v==6) {
      console.log(x,y);
      console.log(x+dx,y);
      console.log(x+dx,y+dy/2);
      console.log(x,y+dy/2);
      console.log(x,y+dy);
      console.log(x,y);
    } else if (v==7) {
      console.log(x,y);
      console.log(x+dx,y+dy);
      console.log(x,y+dy);
    } else if (v==8) {
      console.log(x, y);
      console.log(x+dx, y);
      console.log(x+dx, y+dy);
      console.log(x,y+dy);
      console.log(x, y);
      console.log("");
      console.log(x,y+dy/2);
      console.log(x+dx,y+dy/2);
    } else if (v==9) {
      console.log(x,y);
      console.log(x+dx,y);
      console.log(x+dx,y+dy/2);
      console.log(x,y+dy/2);
      console.log(x,y+dy);
      console.log(x+dx,y+dy);
      console.log("");
      console.log(x+dx,y);
      console.log(x+dx,y+dy);
    }


    console.log("");
    x -= dxw;


    n = Math.floor(n);

    if (n<1) { break; }
  }
}

PepacatModel.prototype.PrintTriGroup = function(group_name, dx, dy) {
  dx = ((typeof dx === "undefined") ? 0.0 : dx);
  dy = ((typeof dy === "undefined") ? 0.0 : dy);
  if (!(group_name in this.trigroup2d)) {
    console.log("### tri group", group_name, "not found");
    return;
  }

  console.log("# tri group", group_name);

  if (this.trigroup2d[group_name].dirty) {
    this.RecalculateTriGroup(group_name);
  }

  var g = this.trigroup2d[group_name];
  for (var tri_idx in g.tri_idx_map) {
    var ele = g.tri_idx_map[tri_idx];
    console.log( ele.tri2d[0][0] + dx, ele.tri2d[0][1] + dy );
    console.log( ele.tri2d[1][0] + dx, ele.tri2d[1][1] + dy);
    console.log( ele.tri2d[2][0] + dx, ele.tri2d[2][1] + dy);
    console.log( ele.tri2d[0][0] + dx, ele.tri2d[0][1] + dy);
    console.log("");

    var cx = 0, cy = 0;
    for (var ii=0; ii<3; ii++) {
      cx += ele.tri2d[ii][0];
      cy += ele.tri2d[ii][1];
    }
    cx /= 3;
    cy /= 3;

    PrintNum( parseInt(tri_idx), cx + dx, cy + dy);

    for (var nei_tri_idx in ele.nei_tri_idx_map) {
      var nei_edge = g.tri_idx_map[tri_idx].nei_tri_idx_map[nei_tri_idx];

      var nei_ele = g.tri_idx_map[nei_tri_idx];

      var nei_v0 = nei_ele.tri2d[nei_edge.dst_edge[0]];
      var nei_v1 = nei_ele.tri2d[nei_edge.dst_edge[1]];

      console.log("###>> nei_v0", nei_v0, "nei_v1", nei_v1);

      var alpha = 0.4;
      var beta = 0.6;

      var tx=0, ty=0;
      tx += (alpha*nei_v0[0] + beta*nei_v1[0]);
      ty += (alpha*nei_v0[1] + beta*nei_v1[1]);

      var ax = -(nei_v0[1] - nei_v1[1])/100.0;
      var by = (nei_v0[0] - nei_v1[0])/100.0;

      tx += dx + ax;
      ty += dy + by;

      var ds = 0.25;

      console.log( tx - ds, ty - ds );
      console.log( tx + ds, ty - ds );
      console.log( tx + ds, ty + ds );
      console.log( tx - ds, ty + ds );
      console.log( tx - ds, ty - ds );
      console.log("");

    }

  }

}

// recalculate realization of tri2d in tri group
//
// TODO
PepacatModel.prototype.RecalculateTriGroup = function(gn) {

  return;
}


PepacatModel.prototype._unfold = function(group, tri_idx, debug) {
  //debug = ((typeof debug === "undefined") ? false : debug);
  var g = group;

  //if (debug) {
  //  console.log("#_unfold,", tri_idx, "  group:", JSON.stringify(group), ", tri_idx:", JSON.stringify(tri_idx));
  //}

  for (var nei_tri_idx in g.tri_idx_map[tri_idx].nei_tri_idx_map) {

  //for (var nei_tri_idx in this.tri_adjmap[tri_idx]) {
    //if (!(nei_tri_idx in g.tri_idx_map[tri_idx].nei_tri_idx_map)) { continue; }
    //if (!(nei_tri_idx in g.tri_idx_map)) { continue; }
    if (g.tri_idx_map[nei_tri_idx].visited) { continue; }

    var src_edge = this.tri_adjmap[tri_idx][nei_tri_idx].src_edge;
    var nei_edge = this.tri_adjmap[tri_idx][nei_tri_idx].dst_edge;

    var src_tri = g.tri_idx_map[tri_idx].tri2d;
    var nei_tri = this.tri2d[nei_tri_idx];

    var z = Align2DTriangles( src_tri, src_edge[0], src_edge[1],
                              nei_tri, nei_edge[0], nei_edge[1] );

    if (debug) {
      console.log("_unfold, aligning", tri_idx, "->", nei_tri_idx);
    }
    //if (debug) {
    //  console.log("#  ", tri_idx, "->", nei_tri_idx, "z:", JSON.stringify(z));
    //}

    g.tri_idx_map[nei_tri_idx].tri2d = z.tri;
    g.tri_idx_map[nei_tri_idx].T = z.T;
    g.tri_idx_map[nei_tri_idx].visited = true;

    this._unfold(group, nei_tri_idx, debug);
  }



}

function __min_vert_nod(idx0, e0, idx1, e1) {
  idx0 = parseInt(idx0);
  e0 = parseInt(e0);
  idx1 = parseInt(idx1);
  e1 = parseInt(e1);

  if (idx0<idx1) {
    return [idx0, e0];
  }
  else if (idx1<idx0) {
    return [idx1,e1];
  }

  if (e0<e1) {
    return [idx0, e0];
  }
  return [idx1,e1];
}

PepacatModel.prototype._adorn__boundary = function(tri_idx, debug) {
}

// Recursively go through canon_vert to find all in teh grup and put the vertex identifier
// into bag.
//
PepacatModel.prototype._canon_collect_v = function(canon_vert, bag, cur_idx, cur_v) {
  var key = cur_idx + ":" + cur_v;
  if (canon_vert[key].visited) { return; }

  bag[key] = { idx: cur_idx, v: cur_v };
  canon_vert[key].visited = true;
  for (var nei_key  in canon_vert[key].nei) {
    this._canon_collect_v(canon_vert, bag, canon_vert[key].nei[nei_key].dst_idx, canon_vert[key].nei[nei_key].dst_v);
  }

}

// populate vert_node with the representatives name for each vertex (key) as it appers in canon_vert
//
PepacatModel.prototype._find_canon_vert = function(canon_vert, vert_node) {
  var idx, v;

  for (var key0 in canon_vert) {

    if (canon_vert[key0].visited) { continue; }

    var bag = {};
    this._canon_collect_v(canon_vert, bag, canon_vert[key0].idx, canon_vert[key0].v);

    // find minimum idx/v for representative vertex
    //
    idx = -1; v = -1;
    for (var k in bag) {
      if ((parseInt(idx) == -1) || (parseInt(bag[k].idx) < parseInt(idx))) {
        idx = bag[k].idx;
        v = bag[k].v;
      } else if ((parseInt(bag[k].idx) == parseInt(idx)) && (parseInt(bag[k].v) < parseInt(v))) {
        v = bag[k].v;
      }
    }

    // update all in the group to the representative
    //
    for (var k in bag) {
      vert_node[k] = { idx: idx, v: v };
    }

  }

}

// Create the boundary without any decorations.
//
PepacatModel.prototype._skel_boundary = function(tri_idx, debug) {
  debug = ((typeof debug === "undefined") ? false : debug);
  var group_name = this.TriGroupName(tri_idx);
  var group = this.trigroup2d[group_name];
  var ele = this.trigroup2d[group_name].tri_idx_map[tri_idx];

  //var vert_node = {};

  var canon_vert = {};

  // Verticies overlap on triangles, sometimes more than two (think of a 'fan').
  // To trace the boundary in order, we need to find which boundary
  // edges are valid (actually on boundaires) and which are 'internal'.
  // We want to take a representative vertex to use as boundary point.
  // canon_vert creates the data structure that holds 'neighboring' vertices that
  // sit on top of each other so we can populate vert_node with the canonical name
  // for each vertex point.
  //
  for (var tri_idx in group.tri_idx_map) {
    for (var nei_idx in group.tri_idx_map[tri_idx].nei_tri_idx_map) {
      var edge = group.tri_idx_map[tri_idx].nei_tri_idx_map[nei_idx];

      var key0 = tri_idx + ":" + edge.src_edge[0];
      var key1 = nei_idx + ":" + edge.dst_edge[1];

      if (!(key0 in canon_vert)) { canon_vert[key0] = { visited: false, idx: tri_idx, v: edge.src_edge[0], nei: {} }; }
      if (!(key1 in canon_vert)) { canon_vert[key1] = { visited: false, idx: nei_idx, v: edge.dst_edge[1], nei: {} }; }
      canon_vert[key0].nei[key1] = { src_idx: tri_idx, src_v: edge.src_edge[0], dst_idx: nei_idx, dst_v: edge.dst_edge[1], visited: false }
      canon_vert[key1].nei[key0] = { src_idx: nei_idx, src_v: edge.dst_edge[1], dst_idx: tri_idx, dst_v: edge.src_edge[0], visited: false }
    }
  }

  // populate vert_node with the representative name for each vertex 'cluster'.
  //
  var vert_node = {};
  this._find_canon_vert(canon_vert, vert_node);

  // Fill in verticies which only have a single representation
  //
  for (var tri_idx in group.tri_idx_map) {
    for (var ii=0; ii<3; ii++) {
      var key = tri_idx + ":" + ii;
      if (!(key in vert_node)) {
        vert_node[key] = { idx: tri_idx, v: ii };
      }
    }
  }



  if (debug) {
  for (var key in vert_node) {
    console.log("# vert_node[", key, "]:", JSON.stringify(vert_node[key]));
  }
  }


  // Collect population for each representative in vert_node.
  // The key is the 'representative' vertex and the values is an
  // object with a key for each of the triangle verticies that
  // fall on the same representative.
  //
  var vert_pop_map = {};
  for (var key in vert_node) {
    var nod = vert_node[key];
    var rep_key = nod.idx + ":" + nod.v;
    if (!(rep_key in vert_pop_map)) { vert_pop_map[rep_key] = {}; }
    vert_pop_map[rep_key][key] = true;
  }

  if (debug) {
    console.log("#vert_pop_map");
  for (var key in vert_pop_map) {
    console.log("#", key, JSON.stringify(vert_pop_map[key]));
  }
  }

  var border_edge = {};

  var key0, key1, key_v0, key_v1, edge_key;
  var src_idx, dst_idx, src_v, dst_v;

  // initialize border edge map (to all true)
  //
  for (var tri_idx in group.tri_idx_map) {
    for (var ii=0; ii<3; ii++) {
      jj = (ii+1)%3;
      key0 = tri_idx + ":" + ii;
      key1 = tri_idx + ":" + jj;

      src_idx = vert_node[key0].idx;
      src_v = vert_node[key0].v;

      dst_idx = vert_node[key1].idx;
      dst_v = vert_node[key1].v;

      key_v0 = vert_node[key0].idx + ":" + vert_node[key0].v;
      key_v1 = vert_node[key1].idx + ":" + vert_node[key1].v;
      edge_key = key_v0 + ";" + key_v1;
      border_edge[edge_key] = {
        src_idx : src_idx,
        src_v: src_v,
        dst_idx: dst_idx,
        dst_v: dst_v,
        orig_idx: tri_idx,
        orig_v: ii,
        border: true,
        visited: false
      };
    }
  }


  // mark edges that aren't on the border as not border edges.
  //
  var tot_edge_count = 0;
  for (var tri_idx in group.tri_idx_map) {

    for (var nei_idx in group.tri_idx_map[tri_idx].nei_tri_idx_map) {
      var edge = group.tri_idx_map[tri_idx].nei_tri_idx_map[nei_idx];

      key0 = tri_idx + ":" + edge.src_edge[0];
      key1 = tri_idx + ":" + edge.src_edge[1];
      key_v0 = vert_node[key0].idx + ":" + vert_node[key0].v;
      key_v1 = vert_node[key1].idx + ":" + vert_node[key1].v;
      edge_key = key_v0 + ";" + key_v1;
      border_edge[edge_key].border = false;

      key0 = nei_idx + ":" + edge.dst_edge[0];
      key1 = nei_idx + ":" + edge.dst_edge[1];
      key_v0 = vert_node[key0].idx + ":" + vert_node[key0].v;
      key_v1 = vert_node[key1].idx + ":" + vert_node[key1].v;
      edge_key = key_v0 + ";" + key_v1;
      border_edge[edge_key].border = false;

      tot_edge_count += 2;

    }
  }

  var cur_vert = null;
  var vert_jump = {};

  // Create the vert_jump map that we'll use to traverse the vertices on 
  // the border.
  //
  var border_edge_count = 0;
  for (var k in border_edge) {
    if (debug) {
    console.log("# border_edge:", k, JSON.stringify(border_edge[k]));
    }

    if (!border_edge[k].border) { continue; }

    border_edge_count++;

    src_idx = border_edge[k].src_idx;
    src_v = border_edge[k].src_v;

    dst_idx = border_edge[k].dst_idx;
    dst_v = border_edge[k].dst_v;

    var src_key = src_idx + ":" + src_v;
    var dst_key = dst_idx + ":" + dst_v;


    if (src_key in vert_jump) {
      console.log("#ERROR: multiple sources for boundary: src_key:", src_key, ", dst_key:", dst_key, "from border_edge:", k, border_edge[k]);
      return null;
    }

    if (debug) {
    console.log("#vert_map: adding src_key:", src_key, ", dst_key:", dst_key);
    }


    vert_jump[src_key] = {
      src_idx: src_idx,
      src_v: src_v,
      dst_key:dst_key,
      dst_idx: dst_idx,
      dst_v: dst_v,
      orig_idx: border_edge[k].orig_idx,
      orig_v: border_edge[k].orig_v,
      visited: false
    };
    if (!cur_vert) { cur_vert = src_idx + ":" + src_v; }

    if (debug) {
    console.log("#", src_idx +  ":" + src_v, "->", dst_idx + ":" + dst_v );
    console.log( group.tri_idx_map[src_idx].tri2d[src_v][0], group.tri_idx_map[src_idx].tri2d[src_v][1] );
    console.log( group.tri_idx_map[dst_idx].tri2d[dst_v][0], group.tri_idx_map[dst_idx].tri2d[dst_v][1] );
    console.log("");
    }

  }

  var border = [];
  var x, y;

  if (debug) {
    console.log("#\n#vert_map:");
  for (var k in vert_jump) {
    console.log("#", k, JSON.stringify(vert_jump[k]));
  }
  }

  //DEBUG
  var adorn_state = "tab";

  var first_x, first_y;
  var prev_x, prev_y;
  var first = true;

  // finally walk the vert_jump map to create the border
  //
  var visited_count=0;
  while (!vert_jump[cur_vert].visited) {
    vert_jump[cur_vert].visited = true;
    visited_count++;

    var nod = vert_jump[cur_vert];

    src_idx = nod.src_idx;
    src_v   = nod.src_v;

    dst_idx = nod.dst_idx;
    dst_v   = nod.dst_v;

    var orig_idx = nod.orig_idx;
    var orig_v = nod.orig_v;

    x = group.tri_idx_map[src_idx].tri2d[src_v][0];
    y = group.tri_idx_map[src_idx].tri2d[src_v][1];

    var nx = group.tri_idx_map[src_idx].tri2d[(src_v+1)%3][0];
    var ny = group.tri_idx_map[src_idx].tri2d[(src_v+1)%3][1];

    if (adorn_state == "skel") {
      border.push( [x,y, { idx: src_idx, v: src_v }] );
    }
    else if (adorn_state == "tab") {
      if (!first) {
        var adorn_type = group.tri_idx_map[orig_idx].adorn[orig_v];
        if (adorn_type == "trapezoid") {
          this._adorn_2d(border, adorn_type, prev_x, prev_y, x, y, { angle: Math.PI/3 });
        }
      }
    }

    cur_vert = dst_idx + ":" + dst_v;

    if (!(cur_vert in vert_jump)) {
      console.log("#ERROR: could not find next vertex in vert_jump:", cur_vert);
      return null;
    }

    if (first) {
      first_x = x;
      first_y = y;
    }

    prev_x = x;
    prev_y = y;
    first = false;
  }

  if (adorn_state == "tab") {
    border.push([prev_x, prev_y]);

    //debug
    border.push([first_x, first_y]);
  }

  if (debug) {
  console.log("");
  for (var ii=0, il=border.length; ii<il; ii++) {
    console.log(border[ii][0], border[ii][1]);
  }
  console.log("");
  }

  return border;
}

PepacatModel.prototype._adorn_2d = function(boundary, adorn_type, x0, y0, x1, y1, info) {
  if (adorn_type == "none") {
    boundary.push([x0,y0]);
    return;
  }

  var ang = Math.PI/3;
  var f = 0.8;

  if (adorn_type == "trapezoid") {
    var dvx = x1-x0;
    var dvy = y1-y0;

    var c = Math.cos(ang);
    var s = Math.sin(ang);

    var rx =  c*dvx + s*dvy;
    var ry = -s*dvx + c*dvy;

    var l = Math.sqrt(dvx*dvx + dvy*dvy);
    var tl = l * f;
    //var r = l / c;
    var r = (1-f) / (2*c);

    boundary.push([x0,y0]);
    boundary.push([ x0+r*rx, y0+r*ry ]);
    boundary.push([ x0+r*rx + f*dvx, y0+r*ry + f*dvy ]);
    return;

  }
}

PepacatModel.prototype.TriGroupAdorn = function(tri_idx, adorn_info) {
  var default_adorn_info = { shape : "trapezoid", angle : 2*Math.PI/3 };
  adorn_info = ((typeof adorn_info === "undefined") ? default_adorn_info : adorn_info );

  var boundary = this._skel_boundary(tri_idx);

  var gn = this.TriGroupName(tri_idx);
  var g = this.trigroup2d[gn];

  for (var tri_idx in g.tri_idx_map) {
    g.tri_idx_map[tri_idx].adorn[0] = "none";
    g.tri_idx_map[tri_idx].adorn[1] = "none";
    g.tri_idx_map[tri_idx].adorn[2] = "none";
  }

  for (var ii=0, il=boundary.length; ii<il; ii++) {
    var idx = boundary[ii][2].idx;
    var v = boundary[ii][2].v;

    g.tri_idx_map[idx].adorn[v] = "trapezoid";
  }

}

PepacatModel.prototype.TriGroupUnfold = function(group_name, debug) {
  //debug = (((typeof debug) === "undefined") ? false : debug);

  var g = this.trigroup2d[group_name];
  var anch_tri_idx = g.anchor_tri_idx;

  //var str = "#";

  if (debug) {
    console.log("TriGroupUnfold, group_name", group_name, ", anchor tri", anch_tri_idx);
  }

  for (var idx in g.tri_idx_map) { g.tri_idx_map[idx].visited = false; }
  g.tri_idx_map[anch_tri_idx].visited = true;

  this._unfold(g, anch_tri_idx, debug);

  // Force edge alignemnt between shared triangles.
  // Kind of hacky?  We want to prevent round off error, especially
  // when we use vertices as keys.
  //
  var m = this.trigroup2d[group_name].tri_idx_map;
}

function _key2d(x,y,S) {
  return String(Math.round(S * x)) + "," + String(Math.round(y*S));
}


PepacatModel.prototype.TriRealized2D = function(tri_idx) {
  var gn = this.TriGroupName(tri_idx);
  if (typeof gn === "undefined") { return; }
  return this.trigroup2d[gn].tri_idx_map[tri_idx].tri2d;
}

PepacatModel.prototype.TriGroupMaxArea = function(group) {
  var trimap = group.tri_idx_map;
  var S = this.info.premul;
  var max_area = 0.0;
  for (var tri_idx in trimap) {
    var tri = trimap[tri_idx].tri2d;
    //console.log("#>>> trigroupmaxarea", JSON.stringify(tri));

    var t_tri = [];
    for (var ii=0; ii<tri.length; ii++) {
      var t_v = [];
      for (var jj=0; jj<tri[ii].length; jj++) {
        t_v.push(Math.round(S*tri[ii][jj]));
      }
      t_tri.push(t_v);
    }
    //max_area += Area2D(tri);
    max_area += Area2D(t_tri);
  }
  return max_area / (S*S);
}

PepacatModel.prototype.TriGroupClipArea = function(group) {
  var g = group;

  var boundary = this.TriGroupBoundary(group);
  var S = this.info.premul;

  var clip_boundary = [];
  for (var i=0, il=boundary.length; i<il; i++) {
    clip_boundary.push({X: Math.round(S*boundary[i][0]), Y: Math.round(S*boundary[i][1])});
  }

  var union_boundary = [];

  clip_union(union_boundary, [clip_boundary]);

  if (union_boundary.length!=1) { return 0.0; }

  var area = clip_area(union_boundary);
  area /= (S*S);
  return area;

}


// Walk the boundary of the triangle group, adding to an array of
// 2d points (array of arrays) to ultimately return.
//
PepacatModel.prototype.TriGroupBoundary = function(group) {
  var have_rep_tri = false;
  var rep_tri = null;

  for (var tri_idx in group.tri_idx_map) {
    rep_tri = tri_idx;
    have_rep_tri = true;
    break;
  }

  if (!(have_rep_tri)) { return []; }
  return this._skel_boundary(rep_tri);
}

PepacatModel.prototype._TriGroupBoundary = function(group) {

  var g = group;

  var vertex_map = {};
  var trimap = group.tri_idx_map;

  var S = this.info.premul;

  var cur_key = null;

  // We create a vertex map of all vertices that we
  // can traverse when creating our boundary.
  //
  var count=0;
  for (var tri_idx in trimap) {
    var tri = trimap[tri_idx].tri2d;

    // We take the source vertex on each edge as the representative
    // to indicate the edge.  `src_v` holds the vertices that are
    // permissible to traverse.  We mark vertex indexes in `src_v`
    // with `0` when there is an edge shared with the current triangle
    // (`tri_idx`) to one of it's neighbors.
    //
    var src_v = [1,1,1];
    for (var nei_idx in trimap[tri_idx].nei_tri_idx_map) {
      var edge = trimap[tri_idx].nei_tri_idx_map[nei_idx].src_edge;
      src_v[edge[0]] = 0;

      //DEBUG
      //var dst_edge = trimap[tri_idx].nei_tri_idx_map[nei_idx].dst_edge;
      //console.log("#queueing skip " + tri_idx + "->" + nei_idx + ", src(" + JSON.stringify(edge) + "), dst(" + JSON.stringify(dst_edge) + ")");
    }

    for (var ii=0; ii<3; ii++) {
      jj = (ii+1)%3;
      if (src_v[ii]==0) {

        //DEBUG
        //console.log("#skipping tri_idx", tri_idx, "edge (", ii, (ii+1)%3, ")", _key2d(tri[ii][0], tri[ii][1], S));

        continue;
      }

      var vert_key = _key2d(tri[ii][0], tri[ii][1], S);
      if (!(vert_key in vertex_map)) {
        vertex_map[vert_key] = {};
      }
      vertex_map[vert_key]["next"] = [tri[jj][0], tri[jj][1]];
      vertex_map[vert_key]["cur"] = [tri[ii][0], tri[ii][1]];
      vertex_map[vert_key]["visited"] = false;
      vertex_map[vert_key]["tri_idx"] = tri_idx;

      //DEBUG
      //console.log("vertex_map++", tri_idx, vert_key, "next:", vertex_map[vert_key].next, "cur:", vertex_map[vert_key].cur, "(" + ii, jj +")" );

      if (!cur_key) { cur_key = vert_key; }

      count++;
    }

    //DEBUG
    //console.log("");

  }

  //DEBUG
  //console.log("---\n\n\n\n----\n\n\n")

  var boundary = [];

  var first_vert = [];
  var cur_count = 0;
  while (cur_count < count) {

    if (!(cur_key in vertex_map)) { console.log("### ERROR, key not found", cur_key, vertex_map, group.anchor_tri_idx); return; }
    if (vertex_map[cur_key].visited) { console.log("### ERROR, already visited", cur_key); break; }

    var ent = vertex_map[cur_key];
    if (cur_count==0) {
      boundary.push([ent.cur[0],ent.cur[1]]);
      first_vert.push(ent.cur[0]);
      first_vert.push(ent.cur[1]);
    }
    boundary.push([ent.next[0], ent.next[1]]);
    cur_count++;

    vertex_map[cur_key].visited = true;


    //DEBUG
    var old_key = cur_key;
    var old_idx = vertex_map[cur_key].tri_idx;

    cur_key = _key2d(ent.next[0], ent.next[1], S);

    //DEBUG
    //console.log("tri_idx", old_idx, "...", old_key, " -> ", cur_key);

  }

  return boundary;
}

PepacatModel.prototype.GatherNeighbors = function(tri_group, tri_idx) {
  if (tri_group.tri_idx_map[tri_idx].visited) { return []; }

  tri_group.tri_idx_map[tri_idx].visited = true;
  var R = [tri_idx];

  for (var nei_tri_idx in tri_group.tri_idx_map[tri_idx].nei_tri_idx_map) {
    var r = this.GatherNeighbors(tri_group, nei_tri_idx);
    for (var ii=0; ii<r.length; ii++) {
      R.push(r[ii]);
    }
  }

  return R;
}

PepacatModel.prototype.TriGroupChangeName = function(group_name, new_group_name, new_anchor_tri_idx) {
  var orig_group = this.trigroup2d[group_name];
  if (!orig_group) { return; }
  if (new_group_name in this.trigroup2d) { return; }
  if (group_name == new_group_name) {

    //DEBUG
    console.log("## TriGroupChangeName: group_name (" + group_name + ") == new_group_name (" + new_group_name + "), skipping");

    return;
  }

  this.trigroup2d[new_group_name] = orig_group;
  delete this.trigroup2d[group_name];

  if (typeof new_anchor_tri_idx !== "undefined") {
    this.trigroup2d[new_group_name].anchor_tri_idx = new_anchor_tri_idx;
  }

  for (var tri_idx in this.trigroup2d[new_group_name].tri_idx_map) {
    this.tri_idx_trigroup_lookback[tri_idx] = new_group_name;
  }

}

// Take two triangles (referenced by their index) and split them along their edge
// into two triangle groups.
// The algorithm proceeds as follows:
//   * delete the edge in trigroup2d[fixgroup].tri_idx_map
//   * rename the fixed group and set new anchor as fix_tri_idx
//   * delete the associated links in the fixed group and move them
//     over to the newly created 'move' group
//   * update bounding box information
//
// Assuming things worked, return an arry with the 'fixed' group and the newly created
// 'move' group, in that order.
//
PepacatModel.prototype.SplitTriangle = function(fix_tri_idx, mov_tri_idx, debug) {
  debug = ((typeof debug === "undefined") ? false : debug);
  var fix_trigroup_name = this.TriGroupName(fix_tri_idx);
  var mov_trigroup_name = this.TriGroupName(mov_tri_idx);

  // Already split, return with group information.
  //
  if (fix_trigroup_name !== mov_trigroup_name) { return [fix_trigroup_name, mov_trigroup_name]; }

  if (this.trigroup2d[fix_trigroup_name].dirty) {
    this.visited = {};
    for (var tri_idx in this.trigroup2d[fix_trigroup_name]) {
      this.visited[tri_idx] = false;
    }
    this.TriGroupUnfold(fix_trigroup_name);
  }

  var tri_group = this.trigroup2d[fix_trigroup_name];
  var tri_idx_map = tri_group.tri_idx_map[fix_tri_idx];
  var nei_tri_idx_map = tri_idx_map.nei_tri_idx_map;

  var edges = nei_tri_idx_map[mov_tri_idx];

  // save a copy of the original index list to make sure the edge deletion
  // creates a new group.
  //
  for (var tri_idx in tri_group.tri_idx_map) { tri_group.tri_idx_map[tri_idx].visited = false; }
  var orig_idx_list = this.GatherNeighbors(tri_group, fix_tri_idx);

  for (var tri_idx in tri_group.tri_idx_map) { tri_group.tri_idx_map[tri_idx].visited = false; }

  // delete the edge
  //
  delete this.trigroup2d[fix_trigroup_name].tri_idx_map[fix_tri_idx].nei_tri_idx_map[mov_tri_idx];
  delete this.trigroup2d[fix_trigroup_name].tri_idx_map[mov_tri_idx].nei_tri_idx_map[fix_tri_idx];

  var fix_idx_list = this.GatherNeighbors(tri_group, fix_tri_idx);
  var nei_idx_list = this.GatherNeighbors(tri_group, mov_tri_idx);

  // We've removed an edge but the triagle group still remains.
  // Just return.
  //
  if (orig_idx_list.length === fix_idx_list.length) { return [fix_trigroup_name]; }
  if (fix_idx_list.length === 0) { return [fix_trigroup_name]; }

  // Change the group name of the triangle group with the fixed triangle
  // to vaoid name collisions.  Update the anchor in the fixed group.
  //

  //DEBUG
  /*
  console.log("");
  var g = this.trigroup2d[fix_trigroup_name];
  for (var idx in g.tri_idx_map) {
    console.log("tri_idx:", idx);
    for (var nei_idx in g.tri_idx_map[idx].nei_tri_idx_map) {
      console.log(fix_trigroup_name, "anch:" + g.anchor_tri_idx, ", edge:", idx, "->", nei_idx);
    }
  }
  */

  this.TriGroupChangeName(fix_trigroup_name, fix_tri_idx, fix_tri_idx);

  //if (debug) { console.log("split: old fix name", fix_trigroup_name, "new name", fix_tri_idx); }

  fix_trigroup_name = fix_tri_idx;


  //DEBUG
  /*
  console.log("");
  var g = this.trigroup2d[fix_trigroup_name];
  for (var idx in g.tri_idx_map) {
    console.log("tri_idx:", idx);
    for (var nei_idx in g.tri_idx_map[idx].nei_tri_idx_map) {
      console.log(fix_trigroup_name, "anch:" + g.anchor_tri_idx, ", edge:", idx, "->", nei_idx);
    }
  }
  */


  mov_trigroup_name = mov_tri_idx;

  /*
  if (debug) {
    console.log("split: mov group name", mov_trigroup_name);
    console.log("fixed idx list:", JSON.stringify(fix_idx_list));
    console.log("nei idx list:", JSON.stringify(nei_idx_list));
  }
  */

  // Crate the new triangle group as necessary and update it.
  //
  if (!(mov_trigroup_name in this.trigroup2d)) {
    this.trigroup2d[mov_trigroup_name] = {};
    this.trigroup2d[mov_trigroup_name].G = {};
    this.trigroup2d[mov_trigroup_name].tri_idx_map = {};
  } else {
    this.trigroup2d[mov_trigroup_name].tri_idx_map = {};
  }
  this.trigroup2d[mov_trigroup_name].dirty = true;
  this.trigroup2d[mov_trigroup_name].anchor_tri_idx = mov_tri_idx;


  // Delete any neighbors that appear in the new triangle group
  // from the 'fixed' triangled group.
  //
  for (var ii=0; ii<fix_idx_list.length; ii++) {
    var nei_idx = fix_idx_list[ii];

    if (!(nei_idx in this.trigroup2d[fix_trigroup_name].tri_idx_map)) {

      if (nei_idx in this.trigroup2d[mov_trigroup_name].tri_idx_map) {
        this.trigroup2d[fix_trigroup_name].tri_idx_map[nei_idx] =
          this.trigroup2d[mov_trigroup_name].tri_idx_map[nei_idx];
        delete this.trigroup2d[mov_trigroup_name].tri_idx_map[nei_idx];

        this.tri_idx_trigroup_lookback[nei_idx] = fix_trigroup_name;

      } else {
        console.log("### ERROR: nei_idx", nei_idx, "not found in mov_trigroup_name", mov_trigroup_name);
      }
    }

  }

  // Delete any neighbors that appear in the 'fixed' triangle group
  // from the newly created triangled group.
  //
  for (var ii=0; ii<nei_idx_list.length; ii++) {
    var nei_idx = nei_idx_list[ii];

    if (!(nei_idx in this.trigroup2d[mov_trigroup_name].tri_idx_map)) {

      if (nei_idx in this.trigroup2d[fix_trigroup_name].tri_idx_map) {
        this.trigroup2d[mov_trigroup_name].tri_idx_map[nei_idx] =
          this.trigroup2d[fix_trigroup_name].tri_idx_map[nei_idx];
        delete this.trigroup2d[fix_trigroup_name].tri_idx_map[nei_idx];

        this.tri_idx_trigroup_lookback[nei_idx] = mov_trigroup_name;

      } else {
        console.log("### ERROR: nei_idx", nei_idx, "not found in fix_trigroup_name", fix_trigroup_name);
      }
    }
  }

  //DEBUG
  /*
  console.log("");
  console.log("mov trigroup:");
  var g = this.trigroup2d[mov_trigroup_name];
  for (var idx in g.tri_idx_map) {
    console.log("tri_idx:", idx, JSON.stringify(g.tri_idx_map[idx].tri2d) );
    for (var nei_idx in g.tri_idx_map[idx].nei_tri_idx_map) {
      console.log(mov_trigroup_name, "anch:" + g.anchor_tri_idx, ", edge:", idx, "->", nei_idx);
    }
  }
  */


  this.visited = {};
  for (var tri_idx in this.trigroup2d[fix_trigroup_name].tri_idx_map) {
    this.visited[tri_idx] = false;
  }
  this.TriGroupUnfold(fix_trigroup_name);

  //DEBUG
  /*
  console.log("");
  var g = this.trigroup2d[fix_trigroup_name];
  for (var idx in g.tri_idx_map) {
    console.log("tri_idx:", idx);
    for (var nei_idx in g.tri_idx_map[idx].nei_tri_idx_map) {
      console.log(fix_trigroup_name, "anch:" + g.anchor_tri_idx, ", edge:", idx, "->", nei_idx);
    }
  }
  */

  //var cliparea = this.TriGroupClipArea(fix_trigroup_name);

  if (0) {
  var fgr = this.trigroup2d[fix_trigroup_name];
  var cliparea = this.TriGroupClipArea(fgr);
  }

  this.visited = {};
  for (var tri_idx in this.trigroup2d[mov_trigroup_name].tri_idx_map) { this.visited[tri_idx] = false; }
  this.TriGroupUnfold(mov_trigroup_name);


  //cliparea = this.TriGroupClipArea(mov_trigroup_name);
  if (0) {
  var mgr = this.trigroup2d[mov_trigroup_name];
  cliparea = this.TriGroupClipArea(mgr);
  }


  this.trigroup2d[fix_trigroup_name].bbox = this.TriGroupBoundingBox(this.trigroup2d[fix_trigroup_name]);
  this.trigroup2d[mov_trigroup_name].bbox = this.TriGroupBoundingBox(this.trigroup2d[mov_trigroup_name]);

  return [fix_trigroup_name, mov_trigroup_name];
}

PepacatModel.prototype.JoinTriangle = function(fix_tri_idx, mov_tri_idx, debug) {
  debug = ((typeof debug === "undefined") ? false : debug);
  var fix_trigroup_name = this.TriGroupName(fix_tri_idx);
  var mov_trigroup_name = this.TriGroupName(mov_tri_idx);
  if (fix_trigroup_name === mov_trigroup_name) { return null; }

  if (!(fix_tri_idx in this.tri_adjmap)) { return null; }
  var fix_map = this.tri_adjmap[fix_tri_idx];

  if (!(mov_tri_idx in fix_map)) { return null; }
  var fix_edge = this.tri_adjmap[fix_tri_idx][mov_tri_idx].src_edge;
  var mov_edge = this.tri_adjmap[fix_tri_idx][mov_tri_idx].dst_edge;

  //console.log("#>>", fix_trigroup_name);

  if (this.trigroup2d[fix_trigroup_name].dirty) {
    this.TriGroupUnfold(fix_trigroup_name);
  }

  if (this.trigroup2d[mov_trigroup_name].dirty) {
    this.TriGroupUnfold(mov_trigroup_name);
  }

  var fix_anchor_tri_idx = this.trigroup2d[fix_trigroup_name].anchor_tri_idx;
  var mov_anchor_tri_idx = this.trigroup2d[mov_trigroup_name].anchor_tri_idx;

  var fix_tri = this.trigroup2d[fix_trigroup_name].tri_idx_map[fix_tri_idx].tri2d;
  var mov_tri = this.tri2d[mov_tri_idx];

  // Align2DTriangles does the magic of realizing the mov_tri in relation
  // to the fix tri along the edge they share (or the edges specified).
  // Thte return structure also has the transformation of the moved triangle
  // relative to it's `tri2d` entry in the PepacatModel structure.
  //
  var z = Align2DTriangles( fix_tri, fix_edge[0], fix_edge[1],
                            mov_tri, mov_edge[0], mov_edge[1] );

  // Update hte 'mov' triangle group with the newly aligned triangle and make it the new
  // anchor triangle.
  //

  var fix_trigroup = this.trigroup2d[fix_trigroup_name];
  var mov_trigroup = this.trigroup2d[mov_trigroup_name];

  // We unfoled the moved group using the newly moved triangle as
  // a realization anchor point to seed the other triangles off of.
  //
  mov_trigroup.tri_idx_map[mov_tri_idx].tri2d = z.tri;
  mov_trigroup.tri_idx_map[mov_tri_idx].T = z.T;
  mov_trigroup.anchor_tri_idx = mov_tri_idx;

  mov_trigroup.dirty = true;

  this.TriGroupUnfold(mov_trigroup_name, debug);

  // Copy over the newly realized moved triangles into our fixed triangle
  // group.
  //
  for (var tri_idx in mov_trigroup.tri_idx_map) {
    fix_trigroup.tri_idx_map[tri_idx] = mov_trigroup.tri_idx_map[tri_idx];
  }

  // Joine the two groups along the edge for the two trianlges selected and
  // update misc. information (dirty, bbox).
  //
  fix_trigroup.tri_idx_map[fix_tri_idx].nei_tri_idx_map[mov_tri_idx] = 
    { "src_edge" : [fix_edge[0], fix_edge[1]], "dst_edge": [mov_edge[0], mov_edge[1]] };
  fix_trigroup.tri_idx_map[mov_tri_idx].nei_tri_idx_map[fix_tri_idx] =
    { "src_edge" : [mov_edge[0], mov_edge[1]], "dst_edge": [fix_edge[0], fix_edge[1]] };
  fix_trigroup.dirty = false;
  fix_trigroup.bbox = this.TriGroupBoundingBox(fix_trigroup);

  // debug - mark as deleted.
  // remove the moved group from the trigroup2d structure.
  //
  mov_trigroup.deleted = true;
  delete this.trigroup2d[mov_trigroup_name];

  // Finally, update the lookback structure so we can reverse lookup
  // the group from the triangle index.
  //
  for (var tri_idx in this.trigroup2d[fix_trigroup_name].tri_idx_map) {
    this.tri_idx_trigroup_lookback[tri_idx] = fix_trigroup_name;
  }

  fix_trigroup.deleted = false;

  return fix_trigroup_name;
}



PepacatModel.prototype.DebugPrint = function() {
  var adjmap = this.edge3d_adjmap;

  var n = this.tri3d.length;

  console.log("#length: tri3d:", this.tri3d.length, ", trn3d:", this.trn3d.length, ", tri2d:", this.tri2d.length);

  var area3d = 0.0;
  for (var i=0; i<n; i++) {
    for (var ii=0; ii<3; ii++) {
      console.log("###tri3d[" + i + "][" + ii + "]", this.tri3d[i][ii][0], this.tri3d[i][ii][1], this.tri3d[i][ii][2]);
    }
    console.log("###trn3d[" + i + "]", this.trn3d[i][0], this.trn3d[i][1], this.trn3d[i][2]);
    console.log("###");

    var aa = Area(this.tri3d[i]);
    var ft = FlattenTriangle(this.tri3d[i], this.trn3d[i]);
    var bb = Area(ft);

    console.log("### ?? 3d area:", aa, "2d area:", bb);

    area3d += Area(this.tri3d[i]);
  }

  for (var key in this.tri_adjmap) {
    console.log("#>> tri_adjmap", key, JSON.stringify(this.tri_adjmap[key]));
  }

  console.log("## area3d:" , area3d);

  var area2d = 0.0;
  for (var i=0; i<n; i++) {
    for (var ii=0; ii<3; ii++) {
      console.log("##tri2d[" + i + "][" + ii + "]", this.tri2d[i][ii][0], this.tri2d[i][ii][1], this.tri2d[i][ii][2]);
    }
    console.log("##tri2d[" + i + "][" + 0 + "]", this.tri2d[i][0][0], this.tri2d[i][0][1], this.tri2d[i][0][2]);

    console.log("##tri2d");

    area2d += Area(this.tri2d[i]);
  }

  console.log("## area2d:" , area2d);

  var count =0;
  for (var key in adjmap) {
    if (adjmap[key].info.length != 2) {
      console.log("##### skipping", key);
      continue;
    }

    var info = adjmap[key].info;

    console.log("#>>> edge3d_adjmap", JSON.stringify(key), JSON.stringify(adjmap[key]));

    count++;
  }

  console.log("## triangle groups");
  for (var group_name in this.trigroup2d) {
    var group = this.trigroup2d[group_name];
    console.log("### group", group_name);
    console.log("### anchor_tri_idx", group.anchor_tri_idx);
    console.log("### dirty", group.dirty);
    console.log("### G", JSON.stringify(group.G));

    for (var tri_idx in group.tri_idx_map) {
      console.log("#### tri_idx", tri_idx);
      console.log("#### tri", JSON.stringify(group.tri_idx_map[tri_idx].tri2d));
      console.log("#### T", JSON.stringify(group.tri_idx_map[tri_idx].T));
      console.log("#### adorn", JSON.stringify(group.tri_idx_map[tri_idx].adorn));
      console.log("#### visited", JSON.stringify(group.tri_idx_map[tri_idx].visited));
      for (var nei_tri_idx in group.tri_idx_map[tri_idx].nei_tri_idx_map) {
        console.log("##### nei_tri_idx_map (", tri_idx, "->", nei_tri_idx, " :", JSON.stringify(group.tri_idx_map[tri_idx].nei_tri_idx_map[nei_tri_idx]));
      }
    }
  }

}

function test0() {
  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);

  var x = gg.JoinTriangle(0, 59);

  var y = gg.JoinTriangle(107, 4);
  var a0 = gg.JoinTriangle(73, 158);
  var a1 = gg.JoinTriangle(4, 158);
  var z = gg.JoinTriangle(59, 107, true);

  var gn = gg.TriGroupName(0);
  gg.PrintTriGroup(gn, true);

  var ret = gg.Consistency();
  console.log(JSON.stringify(ret));
}

function test1() {
  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);

  var x = gg.JoinTriangle(0, 59);
  var y = gg.JoinTriangle(107, 4);
  var a0 = gg.JoinTriangle(78, 158);
  var a1 = gg.JoinTriangle(4, 158);
  var z = gg.JoinTriangle(59, 107);

  var tg = gg.TriGroupName(0);
  gg.PrintTriGroup(tg);

  gg.DebugPrint();

  var ret = gg.Consistency();
  console.log(JSON.stringify(ret));
}

function test2() {

  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);

  var x = gg.JoinTriangle(0, 59);
  var y = gg.JoinTriangle(107, 4);
  var a0 = gg.JoinTriangle(78, 158);
  var a1 = gg.JoinTriangle(4, 158);
  var z = gg.JoinTriangle(59, 107);

  var tg = gg.JoinTriangle(273,260);
  tg = gg.JoinTriangle(61,192);
  tg = gg.JoinTriangle(260,192);

  tg = gg.TriGroupName(0);
  gg.PrintTriGroup(tg);

  tg = gg.TriGroupName(260);
  gg.PrintTriGroup(tg, 50, 50);
  gg.DebugPrint();
}

function test3() {

  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);

  var x = gg.JoinTriangle(0, 59);
  var y = gg.JoinTriangle(107, 4);
  var a0 = gg.JoinTriangle(78, 158);
  var a1 = gg.JoinTriangle(4, 158);
  var z = gg.JoinTriangle(59, 107);

  var gr = gg.trigroup2d[x];

  gg.PrintTriGroup(x);
  gg.TriGroupBoundary(gr);

  var tg = gg.TriGroupName(0);
  console.log("## self intersect for group " + tg + "?", gg.TriGroupSelfIntersects(gg.trigroup2d[tg]));
}

function test4() {

  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);

  var x = gg.JoinTriangle(0, 59);
  var y = gg.JoinTriangle(107, 4);
  var a0 = gg.JoinTriangle(78, 158);
  var a1 = gg.JoinTriangle(4, 158);
  var z = gg.JoinTriangle(59, 107);
  var xx = gg.JoinTriangle(0,73);

  console.log("## xx", xx);
  console.log("## z", z);

  /*
  var tg = gg.JoinTriangle(273,260);
  tg = gg.JoinTriangle(61,192);
  tg = gg.JoinTriangle(260,192);
  */

  var tg = gg.TriGroupName(0);
  gg.PrintTriGroup(tg);

  //gg.PrintTriGroup(tg, 50, 50);
  //gg.DebugPrint();


  var tg = gg.TriGroupName(0);
  console.log("## self intersect for group " + tg + "?", gg.TriGroupSelfIntersects(gg.trigroup2d[tg]));
}

function test5() {
  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);

  var x = gg.JoinTriangle(0, 59);
  var y = gg.JoinTriangle(107, 4);
  var a0 = gg.JoinTriangle(78, 158);
  var a1 = gg.JoinTriangle(4, 158);
  var z = gg.JoinTriangle(59, 107);
  var xx = gg.JoinTriangle(0,73);

  var tg = gg.TriGroupName(0);
  gg.PrintTriGroup(tg);


  gg.SplitTriangle(4, 107);

  console.log("## xx", xx);
  console.log("## z", z);

  tg = gg.TriGroupName(0);
  gg.PrintTriGroup(tg, -50, 50);

  tg = gg.TriGroupName(4);
  gg.PrintTriGroup(tg, 50, -50);

  tg = gg.TriGroupName(0);
  console.log("## self intersect for group " + tg + "?", gg.TriGroupSelfIntersects(gg.trigroup2d[tg]));
}

PepacatModel.prototype._heur_unfold = function(info, group_name, tri_idx) {
  var g = this.trigroup2d[group_name];

  //console.log("#>> tricount hints", info.cur_tri_count, info.max_tri_count_hint);

  if (info.cur_tri_count >= info.max_tri_count_hint) { return null; }

  var count=0;
  for (var dst_idx in this.tri_adjmap[tri_idx]) {
    if (this.tri_idx_visited[dst_idx]) { continue; }

    //console.log("## trying", tri_idx, dst_idx);

    var join_group_name = this.JoinTriangle(tri_idx, dst_idx);
    var join_group = this.trigroup2d[join_group_name];
    if (this.TriGroupSelfIntersects(join_group)) {
      this.SplitTriangle(tri_idx, dst_idx);

      //console.log("## intersection, split", tri_idx, dst_idx);

      count++;
      if (count >= info.branch) {
        info.cur_backtrack++;
        return null;
      }

      continue;
    }

    this.tri_idx_visited[dst_idx] = true;

    //console.log("# keeping", tri_idx, dst_idx, " recurring on join_group", join_group_name);

    info.cur_tri_count++;

    this._heur_unfold(info, join_group_name, dst_idx);


    return join_group_name;
  }

  //console.log("### ret group_name", group_name);

  return group_name;

}

PepacatModel.prototype._heur_unfold2 = function(info, group_name, tri_idx) {
  var g = this.trigroup2d[group_name];

  if (info.cur_tri_count >= info.max_tri_count_hint) { return group_name; }

  var count=0;
  for (var dst_idx in this.tri_adjmap[tri_idx]) {
    if (this.tri_idx_visited[dst_idx]) { continue; }

    var n0 = sly.Vector.create(this.trn3d[tri_idx]);
    var n1 = sly.Vector.create(this.trn3d[dst_idx]);

    var a = n0.angleFrom(n1);
    if (a > info.normal_angle_cutoff) { continue; }


    var join_group_name = this.JoinTriangle(tri_idx, dst_idx);
    var join_group = this.trigroup2d[join_group_name];


    //console.log("trying to join", tri_idx, dst_idx);

    if (this.TriGroupSelfIntersects(join_group)) {

      //console.log("  nope");

      this.SplitTriangle(tri_idx, dst_idx);

      //console.log("splitting", tri_idx, dst_idx);

      count++;
      if (count >= info.branch) {
        info.cur_backtrack++;
        var xg = this.TriGroupName(tri_idx);
        return xg;
      }

      continue;
    }

    //console.log("joined", tri_idx, dst_idx);

    this.tri_idx_visited[dst_idx] = true;

    info.cur_tri_count++;

    this._heur_unfold2(info, join_group_name, dst_idx);

    // Name might ahve changed, get the new one.
    //
    var xg = this.TriGroupName(tri_idx);
    return xg;

    //return join_group_name;
  }

  //console.log("### ret group_name", group_name);

  var xg = this.TriGroupName(tri_idx);
  return xg;

  // old
  return group_name;

}

PepacatModel.prototype.HeuristicUnfold = function(info) {
  if ((typeof info === "undefined")) {
    info = {
      "cur_backtrack": 0,
      "backtrack" : 1,
      "branch" : 5,
      "normal_angle_cutoff" : Math.PI/4.0,
      //"normal_angle_cutoff" : Math.PI/8.0,
      "cur_tri_count" : 0,
      "min_tri_count_hint" : 10,
      "max_tri_count_hint" : 100,
      "direction": [0,0,0]
    }
  }

  var group_name_list = [];

  this.tri_idx_visited = {};
  for (var src_idx in this.tri_adjmap) {
    this.tri_idx_visited[src_idx] = false;
  }

  var tg;
  var px = 0, py = 0;
  var max_x = 1000;
  for (var src_idx in this.tri_adjmap) {
    if (this.tri_idx_visited[src_idx]) { continue; }

    var gn = this.tri_idx_trigroup_lookback[src_idx];

    info.cur_backtrack=0;
    info.cur_tri_count=0;

    //console.log("\n\n\n\n\nunfold: basetri", src_idx);

    this.tri_idx_visited[src_idx] = true;
    tg = this._heur_unfold2(info, gn, src_idx);
    tg = this._heur_unfold2(info, tg, src_idx);
    var T = _mT(px, py);

    var group = this.trigroup2d[tg];

    for (var tri_idx in group.tri_idx_map) {
      group.tri_idx_map[tri_idx].T = numeric.dot(T, group.tri_idx_map[tri_idx].T);
      var _tri2d = numeric.dot(this.tri2d[tri_idx], numeric.transpose(group.tri_idx_map[tri_idx].T));
      group.tri_idx_map[tri_idx].tri2d = _tri2d;
    }

    px+=150;
    if (px >= max_x) {
      py+=200;
      px = 0;
    }

    group.bbox = this.TriGroupBoundingBox(group);


  }
 
}

function test6() {

  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);

  /*
  var x = gg.JoinTriangle(0, 59);
  var y = gg.JoinTriangle(107, 4);
  var a0 = gg.JoinTriangle(78, 158);
  var a1 = gg.JoinTriangle(4, 158);
  var z = gg.JoinTriangle(59, 107);
  var xx = gg.JoinTriangle(0,73);

  gg.PrintTriGroup(0);

  gg.SplitTriangle(4, 107);

  console.log("## xx", xx);
  console.log("## z", z);

  gg.PrintTriGroup(0, -50, 50);
  gg.PrintTriGroup(4, 50, -50);
  */

  gg.HeuristicUnfold();

  console.log("heuristic unfold done, testing\n");

  /*
  console.log(">>>>>>>");
  var g = gg.trigroup2d[105];
  for (var tri_idx in g.tri_idx_map) {
    for (var nei_tri_idx in g.tri_idx_map[tri_idx].nei_tri_idx_map) {
      console.log("[105]", tri_idx, "->", nei_tri_idx);
    }
  }
  console.log(">>>>>>>");

  console.log(">>>>>>>");
  var g = gg.trigroup2d[26];
  for (var tri_idx in g.tri_idx_map) {
    for (var nei_tri_idx in g.tri_idx_map[tri_idx].nei_tri_idx_map) {
      console.log("[26]", tri_idx, "->", nei_tri_idx);
    }
  }
  console.log(">>>>>>>");
  */

  //gg.PrintTriGroup(105);

  // BUG: somethings failing when these two tri groups
  // are joined by this triangle...
  //
  gg.JoinTriangle(68, 150, true);
  var r = gg.Consistency();
  console.log(JSON.stringify(r));

  gg.SplitTriangle(68, 150, true);
  r = gg.Consistency();
  console.log(JSON.stringify(r));

  var gn = gg.TriGroupName(68);
  console.log(">>> groupname of tri 68:", gn);

  var new_group_name = 500;
  console.log("changing group name", gn, "to", new_group_name);

  gg.TriGroupChangeName(gn, new_group_name);
  r = gg.Consistency();
  console.log(JSON.stringify(r));

  gg.JoinTriangle(68, 150, true);
  var r = gg.Consistency();
  console.log(JSON.stringify(r));

  gg.SplitTriangle(150, 68, true);
  r = gg.Consistency();
  console.log(JSON.stringify(r));

}

function test7() {
  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);

  var sched = [
    { a:'j', t: [7, 45]},
    { a:'j', t: [45, 9]},
    { a:'j', t: [9, 168]},
    { a:'j', t: [168, 203]},
    { a:'j', t: [7,254]},
    { a:'j', t: [254, 104]},
    { a:'j', t: [104,229]},
    { a:'s', t: [104,229]}
  ];

  for (var ii=0, il=sched.length; ii<il; ii++) {

    if (sched[ii].a == 'j') {
      gg.JoinTriangle(sched[ii].t[0], sched[ii].t[1]);
    } else if (sched[ii].a == 's') {
      gg.SplitTriangle(sched[ii].t[0], sched[ii].t[1], true);
    }

    var r = gg.Consistency();
    var msg = "ok";
    if (r.error) {
      msg = r.message;
    }
    console.log(ii, JSON.stringify(sched[ii]), msg);
  }

}

function test8() {

  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);
  gg.HeuristicUnfold();

  var tri_idxs = [ 53, 44, 263, 41 ];
  for (var ii=0; ii<tri_idxs.length; ii++) {
    var tri_idx = tri_idxs[ii];
    var gn = gg.TriGroupName(tri_idx);
    console.log("idx", tri_idx, "group", gn);
  }

  var group_name = gg.TriGroupName(tri_idxs[0]);

  console.log("#deprecated...");
}

function test9() {
  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);

  var sched = [
    { a:'j', t: [7, 45]},
    { a:'j', t: [45, 9]},
    { a:'j', t: [9, 168]},
    { a:'j', t: [168, 203]},
    { a:'j', t: [7,254]},
    { a:'j', t: [254, 104]},
    { a:'j', t: [104,229]},
    { a:'s', t: [104,229]}
  ];

  for (var ii=0, il=sched.length; ii<il; ii++) {

    if (sched[ii].a == 'j') {
      gg.JoinTriangle(sched[ii].t[0], sched[ii].t[1]);
    } else if (sched[ii].a == 's') {
      gg.SplitTriangle(sched[ii].t[0], sched[ii].t[1], true);
    }

    /*
    var r = gg.Consistency();
    var msg = "ok";
    if (r.error) {
      msg = r.message;
    }
    console.log(ii, JSON.stringify(sched[ii]), msg);
    */
  }

  console.log("#...");

  var debug = true;

  var rep_tri = 7;

  var boundary = gg._skel_boundary(rep_tri, debug);

  if ((typeof boundary === "undefined") || (boundary.length==0)) {
    console.log("ERROR: boundary undefined or 0 length:", JSON.stringify(boundary));
    return null;
  }


  console.log("### >>>>boundary");
  
  for (var ii=0, il=boundary.length; ii<il; ii++) {
    console.log(boundary[ii][0], boundary[ii][1]);
  }
  console.log("### <<<<boundary");

  var gn = gg.TriGroupName(rep_tri);
  var gr = gg.trigroup2d[gn];

  var _b = gg.TriGroupBoundary(gr);
  console.log("");
  for (var ii=0, il=_b.length; ii<il; ii++) {
    console.log(_b[ii][0], _b[ii][1]);
  }
  console.log("");

  console.log("#... -->", gg.allclose(boundary, _b));
}

function test10() {
  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);

  gg.HeuristicUnfold();

  return;

  var tri_list = ["0","3","5","22","28","29","31","35","46","51","52","61","64","65","73","74","76","77","85","88","94","106","123","132","158","172","183","186","192","193","234","252"];
  var tri_map = {};
  for (var ii=0; ii<tri_list.length; ii++) {
    var tri_idx = parseFloat(tri_list[ii]);
    tri_map[tri_idx] = true;
  }

}

// daorn test
function test11() {
  var gg = new PepacatModel();
  gg.LoadSTLFile(MODEL_FN);

  gg.HeuristicUnfold();

  gg.TriGroupAdorn(276);

  var gn = gg.TriGroupName(276);

  for (var tri_idx in gg.trigroup2d[gn].tri_idx_map) {
    console.log(tri_idx,
        gg.trigroup2d[gn].tri_idx_map[tri_idx].adorn[0],
        gg.trigroup2d[gn].tri_idx_map[tri_idx].adorn[1],
        gg.trigroup2d[gn].tri_idx_map[tri_idx].adorn[2]);
  }

}

if (typeof module !== 'undefined') {
  console.log("#TESTING", MODEL_FN);
  test9();
  //test7();
  //test11();
}

//test6();
//test3();

