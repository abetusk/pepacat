function toolNav2d(x,y, world, pepacat_model) {
  x = ((typeof x === "undefined") ? 0 : x);
  y = ((typeof y === "undefined") ? 0 : y);

  this.mouse_down = false;
  this.mouse_drag = false;
  this.mouse_cur_x = 0;
  this.mouse_cur_y = 0;

  this.anchor = [0,0];

  this.world = world;
  this.pepacat_model = pepacat_model;

  console.log(">>> toolNav2d");
}

toolNav2d.prototype.mousedown = function(button, mousex, mousey) {
  var world_coords = g_world.devToWorld(mousex,mousey);
  var x = world_coords.x;
  var y = world_coords.y;

  this.mouse_down = true;
  this.mouse_drag = true;

  var pm = this.pepacat_model;

  console.log("toolNav2d mousedown:", x, y);

}

// Derived from http://stackoverflow.com/a/2049593
// by user [Kornel Kisielewicz]
// retrieved 2016-11-18
//
function _sgn(p0, p1, p2) {
  //return (p0.x - p2.x) * (p1.y - p2.y) - (p1.x - p2.x) * (p0.y - p2.y);
  return (p0[0] - p2[0]) * (p1[1] - p2[1]) - (p1[0] - p2[0]) * (p0[1] - p2[1]);
}

function _pnt_in_tri(pt, v1, v2, v3) {
  var b0 = false, b1 = false, b2 = false;

  b0 = ((_sgn(pt, v1, v2) < 0.0) ? true : false);
  b1 = ((_sgn(pt, v2, v3) < 0.0) ? true : false);
  b2 = ((_sgn(pt, v3, v1) < 0.0) ? true : false);

  if ((b0==b1) && (b1==b2)) { return true; }
  return false
}


toolNav2d.prototype.mouseup = function(button, x, y) {
  this.mouse_down = false;
  this.mouse_drag = false;
}

toolNav2d.prototype.mousemove = function(button, mousex, mousey) {
  //this.world.draw_highlight=false;

  if (this.mouse_drag) {

    this.world.mouseDrag(mousex - this.mouse_cur_x, mousey - this.mouse_cur_y);
  } else {
    var world_coords = g_world.devToWorld(mousex,mousey);
    var x = world_coords.x;
    var y = world_coords.y;

    var pm = this.pepacat_model;

    var hit_group = null;
    var hit = false;
    for (var gn in pm.trigroup2d) {
      var group = pm.trigroup2d[gn];
      var bbox = group.bbox;

      if ((x < bbox.lx) || (x > bbox.ux) ||
          (y < bbox.ly) || (y > bbox.uy)) {
        continue;
      }

      hit=true;
      hit_group = gn;
      break;
    }

    if (hit) {
      //console.log(">>> got bbox hit, group", hit_group);

      this.state = "move";
      this.selected_group_name = hit_group;

      var group = pm.trigroup2d[hit_group];
      var hit_tri = false;

      for (var tri_idx in group.tri_idx_map) {
        var tri = group.tri_idx_map[tri_idx].tri2d;
        if (_pnt_in_tri( [x,y], tri[0], tri[1], tri[2])) {
          threeD_highlight_tri(tri_idx);
          this.world.updateHighlight(tri_idx);
          this.world.draw_highlight=true;
          hit_tri = true;
          break;
        }
      }

      if (!hit_tri) {
        threeD_unhighlight_tri();
        this.world.clearHighlight();
        this.world.draw_highlight=false;
      }

    } else {
      threeD_unhighlight_tri();
      this.world.clearHighlight();
      this.world.draw_highlight=false;
    }

  }

  this.mouse_cur_x = mousex;
  this.mouse_cur_y = mousey;
}


toolNav2d.prototype.mousewheel = function(delta, x, y) {
  x = ((typeof x === "undefined") ? this.mouse_cur_x : x );
  y = ((typeof y === "undefined") ? this.mouse_cur_y : y );
  this.world.adjustZoom(x, y, delta);
  g_world.geom_2d_dirty = true;
  return false;
}

