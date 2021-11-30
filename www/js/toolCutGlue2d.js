function toolCutGlue2d(x,y, world, pepacat_model) {
  x = ((typeof x === "undefined") ? 0 : x);
  y = ((typeof y === "undefined") ? 0 : y);

  this.mouse_down = false;
  this.mouse_drag = false;
  this.mouse_cur_x = 0;
  this.mouse_cur_y = 0;

  this.anchor = [0,0];

  this.world = world;
  this.pepacat_model = pepacat_model;

  console.log(">>> toolCutGlue2d");
}

toolCutGlue2d.prototype.mousedown = function(button, mousex, mousey) {
  var world_coords = g_world.devToWorld(mousex,mousey);
  var x = world_coords.x;
  var y = world_coords.y;

  this.mouse_down = true;
  this.mouse_drag = true;

  var pm = this.pepacat_model;

  console.log("bang");

  var hit_info = this.hitinfo(x,y);
  if ((hit_info.hit) && (hit_info.has_nei)) {

    if (hit_info.type=="glue") {
      console.log("glue:", hit_info.tri_idx, hit_info.nei_tri_idx);

      this.pepacat_model.JoinTriangle(hit_info.tri_idx, hit_info.nei_tri_idx);
      _jitter();

      g_world.geom_2d_dirty = true;

    }
    else if (hit_info.type == "cut") {
      console.log("cut:", hit_info.tri_idx, hit_info.nei_tri_idx);

      /*
      var r = this.pepacat_model.Consistency();
      if (r.error) {
        console.log("CONSISTENCY ERROR:", JSON.stringify(r));
      } else {
        console.log("pre consistency ok");
      }
      */


      this.pepacat_model.SplitTriangle(hit_info.tri_idx, hit_info.nei_tri_idx);
      _jitter();

      g_world.geom_2d_dirty = true;
    }

    /*
    var r = this.pepacat_model.Consistency();
    if (r.error) {
      console.log("CONSISTENCY ERROR:", JSON.stringify(r));
    } else {
      console.log("consistency ok");
    }
    */

  }

}

// Derived from http://stackoverflow.com/a/2049593
// by user [Kornel Kisielewicz]
// retrieved 2016-11-18
//
toolCutGlue2d.prototype.sgn = function(p0, p1, p2) {
  return (p0[0] - p2[0]) * (p1[1] - p2[1]) - (p1[0] - p2[0]) * (p0[1] - p2[1]);
}

toolCutGlue2d.prototype.pnt_in_tri = function(pt, v0, v1, v2) {
  var b0 = false, b1 = false, b2 = false;

  b0 = ((this.sgn(pt, v0, v1) < 0.0) ? true : false);
  b1 = ((this.sgn(pt, v1, v2) < 0.0) ? true : false);
  b2 = ((this.sgn(pt, v2, v0) < 0.0) ? true : false);

  if ((b0==b1) && (b1==b2)) { return true; }
  return false
}


toolCutGlue2d.prototype.mouseup = function(button, x, y) {
  this.mouse_down = false;
  this.mouse_drag = false;
}



// http://stackoverflow.com/a/1501725
// code by user [Grumdrig]
// retrieved Nov 19 2016
//
function _sqr(x) { return x * x }
function _dist2(v, w) { return _sqr(v[0] - w[0]) + _sqr(v[1] - w[1]) }
function _dist_to_segment_sq(p, v, w) {
  var l2 = _dist2(v, w);
  if (l2 == 0) return _dist2(p, v);
  var t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return _dist2(p, [ v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1]) ] );
}
function _dist_to_segment(p, v, w) { return Math.sqrt(_dist_to_segment_sq(p, v, w)); }

// x,y in world coords
//
toolCutGlue2d.prototype.hitinfo = function(x, y) {
  var hit_info = { hit:false, has_nei:false };
  var pm = this.pepacat_model;
  var hit_group_name = null;

  for (var gn in pm.trigroup2d) {
    var bbox = pm.trigroup2d[gn].bbox;

    if ((x < bbox.lx) || (x > bbox.ux) ||
        (y < bbox.ly) || (y > bbox.uy)) {
      continue;
    }

    hit_group_name = gn;
    break;
  }
  if (!hit_group_name) { return hit_info; }

  var group = pm.trigroup2d[hit_group_name];

  // Go through each triangle in the triangle group
  // that we hit the bounding box for and test for
  // mouse pointer inclusion.
  //
  for (var tri_idx in group.tri_idx_map) {
    var tri = group.tri_idx_map[tri_idx].tri2d;

    // If the mouse pointer is within the triangle, pick
    // it.
    //
    if (this.pnt_in_tri( [x,y], tri[0], tri[1], tri[2])) {
      //threeD_highlight_tri(tri_idx);
      //this.world.updateHighlight(tri_idx);
      //this.world.draw_highlight=true;

      var nei_list = [];
      var src_group = pm.TriGroupName(tri_idx);

      // A triangle can neighbor multiple triangles, so
      // put each neighbor not already in this group into
      // a list to figure out which edge we should highlight
      // (if any).
      //
      for (var nei_tri_idx in pm.tri_adjmap[tri_idx]) {
        var dst_group = pm.TriGroupName(nei_tri_idx);

        var src_edge = pm.tri_adjmap[tri_idx][nei_tri_idx].src_edge;

        if (src_group == dst_group) {
          nei_list.push({ tri_idx: nei_tri_idx, type: "cut", src_edge : src_edge });
          continue;
        }

        nei_list.push({ tri_idx: nei_tri_idx, type: "glue", src_edge : src_edge  });
      }

      hit_info.hit = true;
      hit_info.tri_idx = tri_idx;

      // No neighbors, maybe it's a triangle island for some reason?
      //
      if (nei_list.length==0) { break; }

      var cur_nei_type = nei_list[0].type;
      var cur_nei_tri_idx = nei_list[0].tri_idx;
      var dist = _dist_to_segment( [x,y], tri[ nei_list[0].src_edge[0] ], tri[ nei_list[0].src_edge[1] ] );
      for (var ii=1; ii<nei_list.length; ii++) {
        var nei_tri_idx = nei_list[ii].tri_idx;

        var a = nei_list[ii].src_edge[0];
        var b = nei_list[ii].src_edge[1];

        var d = _dist_to_segment( [x,y], tri[a], tri[b] );
        if (d<dist) {
          dist = d;
          cur_nei_type = nei_list[ii].type;
          cur_nei_tri_idx = nei_tri_idx;
        }

      }

      // We have neighbor information, fill it in.
      //
      hit_info.has_nei = true;
      hit_info.nei_tri_idx = cur_nei_tri_idx;
      hit_info.type = cur_nei_type;

      // We've found our triangle, break out 
      //
      break;
    }
  }

  return hit_info;
}

toolCutGlue2d.prototype.mousemove = function(button, mousex, mousey) {

  console.log("mosuemove");

  if (this.mouse_drag) {
    this.world.mouseDrag(mousex - this.mouse_cur_x, mousey - this.mouse_cur_y);
  }

  var world_coords = g_world.devToWorld(mousex,mousey);
  var x = world_coords.x;
  var y = world_coords.y;

  var hit_info = this.hitinfo(x,y);

  if (hit_info.hit) {
    var tri_idx = hit_info.tri_idx;
    threeD_unhighlight_tri();
    threeD_highlight_tri(tri_idx);
    this.world.updateHighlight(tri_idx);
    this.world.draw_highlight=true;

    if (hit_info.has_nei) {
      if (hit_info.type == "glue") {
        this.world.highlightGlueEdge(tri_idx, hit_info.nei_tri_idx);
      } else {
        this.world.highlightCutEdge(tri_idx, hit_info.nei_tri_idx);
      }
    } else {
      this.world.unhighlightEdge();
    }

  }
  else {

    threeD_unhighlight_tri();
    this.world.unhighlightEdge();
    this.world.clearHighlight();
    this.world.draw_highlight=false;
  }

  this.mouse_cur_x = mousex;
  this.mouse_cur_y = mousey;
}


toolCutGlue2d.prototype.mousewheel = function(delta, x, y) {
  x = ((typeof x === "undefined") ? this.mouse_cur_x : x );
  y = ((typeof y === "undefined") ? this.mouse_cur_y : y );
  this.world.adjustZoom(x, y, delta);

  g_world.geom_2d_dirty = true;
  this.mousemove(null, x,y);
  return false;
}

