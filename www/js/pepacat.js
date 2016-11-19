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
        if (a!=b) { return { error: true, message: "tri_idx " + tri_idx + " doesn't match realization (vertex " + ii + ",  0)" }; }

        a = Math.round(tri2d[ii][1] * S);
        b = Math.round(_tri2d[ii][1] * S);
        if (a!=b) { return { error: true, message: "tri_idx " + tri_idx + " doesn't match realization (vertex " + ii + ",  1)" }; }
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
  var T = _mT(dx, dy);
  for (var tri_idx in group.tri_idx_map) {
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

  for (var tri_idx in group.tri_idx_map) {
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

PepacatModel.prototype.SplitTriangle = function(fix_tri_idx, mov_tri_idx, debug) {
  debug = ((typeof debug === "undefined") ? false : debug);
  var fix_trigroup_name = this.TriGroupName(fix_tri_idx);
  var mov_trigroup_name = this.TriGroupName(mov_tri_idx);
  if (fix_trigroup_name !== mov_trigroup_name) { return [fix_trigroup_name]; }

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

  var fix_anchor_idx = parseInt(fix_idx_list[0]);
  for (var ii=0; ii<fix_idx_list.length; ii++) {
    if (fix_anchor_idx > parseInt(fix_idx_list[ii])) {
      fix_anchor_idx = parseInt(fix_idx_list[ii]);
    }
  }

  var mov_anchor_idx = parseInt(nei_idx_list[0]);
  for (var ii=0; ii<nei_idx_list.length; ii++) {
    if (mov_anchor_idx > parseInt(nei_idx_list[ii])) {
      mov_anchor_idx = parseInt(nei_idx_list[ii]);
    }
  }

  fix_trigroup_name = fix_anchor_idx;
  mov_trigroup_name = mov_anchor_idx;
  var new_trigroup_name = mov_tri_idx;

  if (!(fix_trigroup_name in this.trigroup2d)) {
    this.trigroup2d[fix_trigroup_name] = {};
    this.trigroup2d[fix_trigroup_name].G = {};
    this.trigroup2d[fix_trigroup_name].tri_idx_map = {};
  }
  this.trigroup2d[fix_trigroup_name].dirty = true;
  this.trigroup2d[fix_trigroup_name].anchor_tri_idx = fix_anchor_idx;

  if (!(mov_trigroup_name in this.trigroup2d)) {
    this.trigroup2d[mov_trigroup_name] = {};
    this.trigroup2d[mov_trigroup_name].G = {};
    this.trigroup2d[mov_trigroup_name].tri_idx_map = {};
  }
  this.trigroup2d[mov_trigroup_name].dirty = true;
  this.trigroup2d[mov_trigroup_name].anchor_tri_idx = mov_anchor_idx;

  /*
  // Crate the new triangle group as necessary and update it.
  //
  if (!(new_trigroup_name in this.trigroup2d)) {
    this.trigroup2d[new_trigroup_name] = {};
    this.trigroup2d[new_trigroup_name].G = {};
    this.trigroup2d[new_trigroup_name].tri_idx_map = {};
  }
  this.trigroup2d[new_trigroup_name].dirty = true;
  this.trigroup2d[new_trigroup_name].anchor_tri_idx = move_tri_idx;
  */

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

  this.visited = {};
  for (var tri_idx in this.trigroup2d[fix_trigroup_name]) { this.visited[tri_idx] = false; }
  this.TriGroupUnfold(fix_trigroup_name);

  //var cliparea = this.TriGroupClipArea(fix_trigroup_name);
  var fgr = this.trigroup2d[fix_trigroup_name];
  var cliparea = this.TriGroupClipArea(fgr);

  this.visited = {};
  for (var tri_idx in this.trigroup2d[mov_trigroup_name]) { this.visited[tri_idx] = false; }
  this.TriGroupUnfold(mov_trigroup_name);

  //cliparea = this.TriGroupClipArea(mov_trigroup_name);
  var mgr = this.trigroup2d[mov_trigroup_name];
  cliparea = this.TriGroupClipArea(mgr);

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
  var gg = new PepacatModel(MODEL_FN);

  var x = gg.JoinTriangle(0, 59);
  var y = gg.JoinTriangle(107, 4);
  var a0 = gg.JoinTriangle(73, 158);
  var a1 = gg.JoinTriangle(4, 158);
  var z = gg.JoinTriangle(59, 107, true);
  gg.PrintTriGroup(0, true);
}

function test1() {
  var gg = new PepacatModel(MODEL_FN);

  var x = gg.JoinTriangle(0, 59);
  var y = gg.JoinTriangle(107, 4);
  var a0 = gg.JoinTriangle(78, 158);
  var a1 = gg.JoinTriangle(4, 158);
  var z = gg.JoinTriangle(59, 107);
  gg.PrintTriGroup(0);

  gg.DebugPrint();
}

function test2() {

  var gg = new PepacatModel(MODEL_FN);
  var x = gg.JoinTriangle(0, 59);
  var y = gg.JoinTriangle(107, 4);
  var a0 = gg.JoinTriangle(78, 158);
  var a1 = gg.JoinTriangle(4, 158);
  var z = gg.JoinTriangle(59, 107);

  var tg = gg.JoinTriangle(273,260);
  tg = gg.JoinTriangle(61,192);
  tg = gg.JoinTriangle(260,192);

  gg.PrintTriGroup(0);

  gg.PrintTriGroup(tg, 50, 50);
  gg.DebugPrint();
}

function test3() {

  var gg = new PepacatModel(MODEL_FN);
  var x = gg.JoinTriangle(0, 59);
  var y = gg.JoinTriangle(107, 4);
  var a0 = gg.JoinTriangle(78, 158);
  var a1 = gg.JoinTriangle(4, 158);
  var z = gg.JoinTriangle(59, 107);

  var gr = gg.trigroup2d[x];

  gg.PrintTriGroup(x);
  gg.TriGroupBoundary(gr);

  console.log("## self intersect?", gg.TriGroupSelfIntersects(gg.trigroup2d[0]));
}

function test4() {

  var gg = new PepacatModel(MODEL_FN);
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

  gg.PrintTriGroup(0);

  //gg.PrintTriGroup(tg, 50, 50);
  //gg.DebugPrint();


  console.log("## self intersect?", gg.TriGroupSelfIntersects(gg.trigroup2d[0]));
}

function test5() {

  var gg = new PepacatModel(MODEL_FN);
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

  console.log("## self intersect?", gg.TriGroupSelfIntersects(gg.trigroup2d[0]));
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

  //console.log("#>> tricount hints", info.cur_tri_count, info.max_tri_count_hint);

  if (info.cur_tri_count >= info.max_tri_count_hint) { return null; }

  var count=0;
  for (var dst_idx in this.tri_adjmap[tri_idx]) {
    if (this.tri_idx_visited[dst_idx]) { continue; }

    //console.log("## trying", tri_idx, dst_idx);

    var n0 = sly.Vector.create(this.trn3d[tri_idx]);
    var n1 = sly.Vector.create(this.trn3d[dst_idx]);

    var a = n0.angleFrom(n1);
    if (a > info.normal_angle_cutoff) { continue; }


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

    this._heur_unfold2(info, join_group_name, dst_idx);


    return join_group_name;
  }

  //console.log("### ret group_name", group_name);

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

  console.log("### tg", tg);
  
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


  if (!r.error) {
    console.log("ok");
    console.log(r);
  }
  else {
    console.log("error:", r.message);
  }

}

if (typeof module !== 'undefined') {
  console.log("#TESTING", MODEL_FN);
  test6();
}

//test6();
//test3();

