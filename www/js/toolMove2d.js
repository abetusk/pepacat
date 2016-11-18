function toolMove2d(x,y, world, pepacat_model) {
  x = ((typeof x === "undefined") ? 0 : x);
  y = ((typeof y === "undefined") ? 0 : y);

  this.mouse_down = false;
  this.mouse_drag = false;
  this.mouse_cur_x = 0;
  this.mouse_cur_y = 0;

  this.anchor = [0,0];

  this.world = world;
  this.pepacat_model = pepacat_model;

  this.state = "nav";

  console.log(">>> toolMove2d");
}

toolMove2d.prototype.mousedown = function(button, mousex, mousey) {
  var world_coords = g_world.devToWorld(mousex,mousey);
  var x = world_coords.x;
  var y = world_coords.y;

  // We're moving something
  //
  if (this.state == "move") { return; }

  this.mouse_down = true;
  this.mouse_drag = true;

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
    console.log(">>> got hit", hit_group);

    this.state = "move";
    this.selected_group_name = hit_group;

    return;
  }

  var rb = 10;
  var hit_group = null;
  var hit = false;
  for (var gn in pm.trigroup2d) {
    var group = pm.trigroup2d[gn];
    var bbox = group.bbox;

    if ((x < (bbox.lx-rb)) || (x > (bbox.ux+rb)) ||
        (y < (bbox.ly-rb)) || (y > (bbox.uy+rb))) {
      continue;
    }

    if ((x < bbox.lx) || (x > bbox.ux) ||
        (y < bbox.ly) || (y > bbox.uy)) {
      hit=true;
      hit_group = gn;
      break;
    }

  }

  if (hit) {
    console.log(">>> got rotate hit", hit_group);

    this.state = "rotate";
    this.selected_group_name = hit_group;

    var bbox = this.pepacat_model.trigroup2d[hit_group].bbox;

    this.anchor = [ (bbox.lx + bbox.ux)/2.0, (bbox.ly + bbox.uy)/2.0 ];

    return;
  }

  console.log("toolMove2d mousedown:", x, y);
}



toolMove2d.prototype.mouseup = function(button, x, y) {
  this.mouse_down = false;
  this.mouse_drag = false;
  this.state = "nav";
}

toolMove2d.prototype.mousemove = function(button, x, y) {
  if (this.mouse_drag) {

    if (this.state == "move") {
      var world_coords_orig = g_world.devToWorld(this.mouse_cur_x, this.mouse_cur_y)
      var world_coords_cur = g_world.devToWorld(x,y);

      var dx = world_coords_cur.x - world_coords_orig.x;
      var dy = world_coords_cur.y - world_coords_orig.y;

      var group = this.pepacat_model.trigroup2d[this.selected_group_name];
      this.pepacat_model.TriGroupTranslate(group, dx, dy);
    } else if (this.state == "rotate") {
      var prv = g_world.devToWorld(this.mouse_cur_x, this.mouse_cur_y)
      var cur = g_world.devToWorld(x,y);

      var u = Vector.create([prv.x - this.anchor[0], prv.y - this.anchor[1], 0]);
      var v = Vector.create([cur.x - this.anchor[0], cur.y - this.anchor[1], 0]);

      var ang = u.angleFrom(v);
      var sgn = u.cross(v);
      if (sgn.elements[2] < 0) {
        ang = -ang;
      }
      var group = this.pepacat_model.trigroup2d[this.selected_group_name];
      this.pepacat_model.TriGroupRotate(group, this.anchor[0], this.anchor[1], ang);

    } else {
      this.world.mouseDrag(x - this.mouse_cur_x, y - this.mouse_cur_y);
    }
  }

  this.mouse_cur_x = x;
  this.mouse_cur_y = y;
}


toolMove2d.prototype.mousewheel = function(delta, x, y) {
  x = ((typeof x === "undefined") ? this.mouse_cur_x : x );
  y = ((typeof y === "undefined") ? this.mouse_cur_y : y );
  this.world.adjustZoom(x, y, delta);
}

