
function world(canvas_param) {
  this.canvas_name = "canvas";
  if (typeof canvas_param !== "undefined") {
    this.canvas_name = canvas_param;
  }

  this.init_flag=true;
  this.tool = null;

  this.canvas = document.getElementById(this.canvas_name);

  this.width = this.canvas.width;
  this.height = this.canvas.height;
  this.bgcolor = 0xffffff;

  this.init(this.canvas, this.width, this.height, this.bgcolor);

  this.view = {};
  this.view.cx = this.width / 2;
  this.view.cy = this.height / 2;
  this.view.x1 = 0;
  this.view.y1 = 0;
  this.view.x2 = this.width;
  this.view.y2 = this.height;

  this.zoom_max = 40.0;
  this.zoom_min = 0.001;
  //this.zoom = 0.1;   // initial zoom
  this.zoom = 1.0;
  this.zoom_factor = 7.0/8.0;

  this.setView ( this.width, this.height, this.zoom );    // set view for first time

  this.dirty_flag = true;

  this.default_line_width = 5;
  this.default_stroke_color = "rgb( 0, 160, 0 )";
  this.default_fill_color = "rgb( 0, 160, 0 )";

  this.mouse_cur_x = 0;
  this.mouse_cur_y = 0;
  this.mouse_drag = false;
  this.mouse_down = false;

  this.line_join_type = "round";

  this.grid_alpha = 0.1;

  this.pepacatModel = { init_flag:false };

  this.boundary_highlight = [];
  this.geom_highlight = [];
  this.draw_highlight = false;
  this.tri_idx_highlight = -1;
  this.geom_highlight_tri = null; //new PIXI.Graphics();
  this.geom_highlight_tri_init = false;

  this.geom_edge_highlight_init = false;
  this.geom_edge_highlight = null;

  this.geom_tri_name_init = false;
  this.geom_tri_name = null;

  this.geom_bbox = [];

  this.focus = false;

  this.state = '';
}

world.prototype.init = function(canvas, w, h, bgcolor) {
  w = ((typeof w === "undefined") ? 800 : w);
  h = ((typeof h === "undefined") ? 800 : h);
  bgcolor = ((typeof bgcolor === "undefined") ? 0xffffff : bgcolor);

  this.width = w;
  this.height = h;
  this.bgcolor = bgcolor;
  this.canvas = canvas;

  this.renderer = PIXI.autoDetectRenderer(this.width, this.height, { view: this.canvas, antialias: true, backgroundColor: this.bgcolor });
  stage = new PIXI.Container();

  stage.interactive = true;
  stage.hitArea = new PIXI.Rectangle(0, 0, this.width, this.height);
  stage.buttonMode = true;
  stage.defaultCursor = "url(img/cursor-glue.png) 3 2, auto";

  this.stage = stage;

  this.geom = [];
  this.grid = [];


  /*
  for (var ii=0; ii<10; ii++) {
    var grid_ele = new PIXI.Graphics();
    grid_ele.clear();
    this.grid.push({ x: ii*30, ex:ii*30, y: 0, ey:this.height, ele: grid_ele });

    grid_ele = new PIXI.Graphics();
    grid_ele.clear();
    this.grid.push({ x: 0, ex:this.width, y:ii*30, ey:ii*30, ele: grid_ele });
  }

  for (var ii=0, il=this.grid.length; ii<il; ii++) {
    this.stage.addChild(this.grid[ii].ele);
  }
  */



  // Set up user input callbacks (uses jquery)
  //

  // Local variable for anonymouse function
  //
  var self = this;

  // jquery identifier
  //
  var canvas_id = "#" + this.canvas_name;

  $(canvas_id).mouseup( function(e) {
    var xy = self.canvas_coords_from_global( e.pageX, e.pageY );

    if (self.tool) {
      self.tool.mouseup(e.which, xy[0], xy[1]);
      return;
    }

    self.mouse_down = false;
    self.mouse_drag = false;

    //console.log(">mouseup", e.which, xy[0], xy[1]);
  });

  $(canvas_id).mousedown( function(e) {
    var xy = self.canvas_coords_from_global( e.pageX, e.pageY );

    var x = xy[0];
    var y = xy[1];

    if (self.tool) {
      self.tool.mousedown(e.which, x, y);
      return;
    }


    self.mouse_down = true;
    self.mouse_drag = true;
    var world_coord = self.devToWorld(x,y);



    console.log(">mousedown", e.which, xy[0], xy[1], world_coord.x, world_coord.y );
  });

  $(canvas_id).mouseover( function(e) {
  });

  $(canvas_id).mouseenter( function(e) {
    var xy = self.canvas_coords_from_global( e.pageX, e.pageY );
    self.focus = true;
    //console.log(">mouseenter", xy[0], xy[1] );
  });

  $(canvas_id).mouseleave( function(e) {
    var xy = self.canvas_coords_from_global( e.pageX, e.pageY );
    self.focus = false;
    //console.log("mouseleave", xy[0], xy[1] );
  });

  $(canvas_id).mousemove( function(e) {
    var xy = self.canvas_coords_from_global( e.pageX, e.pageY );
    var x = xy[0];
    var y = xy[1];

    self.focus = true;

    if (self.tool) {
      self.tool.mousemove(e.which, x, y);
      return;
    }

    if (self.mouse_drag) {
      self.mouseDrag(x - self.mouse_cur_x, y - self.mouse_cur_y);
    }

    self.mouse_cur_x = x;
    self.mouse_cur_y = y;
  }); 


  $(canvas_id).mousewheel( function(e, delta, deltax, deltay) {
    //console.log("mousewheel:", delta, deltax, deltay);

    self.focus = true;

    if (self.tool) {
      return self.tool.mousewheel(delta);
    }

    self.adjustZoom(self.mouse_cur_x, self.mouse_cur_y, delta);

    return false;
  });

  // Needs tabindex set as well (to 0 or 1?).  Without this,
  // key presses get lost.  We'll probably need to figure out
  // something with the focus when we receive mouse enter
  // and mouse leave events but for now just set the focus on
  // init.
  //
  var xc = document.getElementById(this.canvas_name);
  xc.focus();

  $(canvas_id).keydown( function(e) {
    var key = ( e.which ? e.which : e.keyCode );
    var keycode = e.keyCode;
    var ch = String.fromCharCode(key);
    console.log("keydown", keycode, ch, e);

    if ((ch=='R') || (ch=='r'))       { self.state = "rotate"; }
    else if ((ch=='X') || (ch=='x'))  { self.state = ''; }

    return true;
  });


}

world.prototype.setView = function( x, y, z, cx, cy ) {

  this.view.cx = ( (typeof cx === 'undefined') ? x : cx );
  this.view.cy = ( (typeof cy === 'undefined') ? y : cy );

  this.zoom = z;

  // compute the view region
	//
  var dx = this.width / (z * 2.0);
  var dy = this.height / (z * 2.0);
  this.view.x1 = this.view.cx - dx;
  this.view.y1 = this.view.cy - dy;
  this.view.x2 = this.view.cx + dx;
  this.view.y2 = this.view.cy + dy;

  this.transform = [
    [ z, 0, -this.view.x1*z ],
    [ 0, z, -this.view.y1*z ],
    [ 0, 0, 1 ]
  ];

}

world.prototype.devToWorld = function(x, y) {
  var wx = this.view.x1 + x * ( this.view.x2 - this.view.x1) / this.width;
  var wy = this.view.y1 + y * ( this.view.y2 - this.view.y1) / this.height;
    

  return { "x" : wx, "y" : wy};
}


world.prototype.adjustZoom = function(x, y, z) {
  zf = ( (z<0) ? -(1.0/z)*this.zoom_factor : z/(this.zoom_factor) );
  var newzoom = this.zoom * zf;
  if ( newzoom < this.zoom_min ) newzoom = this.zoom_min;
  if ( newzoom > this.zoom_max ) newzoom = this.zoom_max;

  // size of new view
  //
  var nx = this.width / (newzoom*2.0);
  var ny = this.height / (newzoom*2.0);

  // center of new view that puts cursor at same relative position
  //
  var rx = x / this.width;
  var ry = y / this.height;
  var w = this.devToWorld ( x, y );
  w.x = w.x - nx*2.0*rx + nx;
  w.y = w.y - ny*2.0*ry + ny;

  this.setView( w.x, w.y, newzoom );

  this.dirty_flag = true;
}

world.prototype.adjustPan = function(x, y) {
 var z = this.zoom;
 this.setView( this.view.cx - x/z, this.view.cy - y/z, z );

 this.dirty_flag = true;
}

world.prototype.mouseDrag = function( dx, dy )
{
  this.adjustPan(dx, dy);
  this.dirty_flag = true;
}



world.prototype.canvas_coords_from_global = function(x,y) {
  var rect = this.canvas.getBoundingClientRect();
  var rl = rect.left;
  var rt = rect.top;

  var scrollx = window.scrollX;
  var scrolly = window.scrollY;

  return [ x - rl - scrollx, y - rt - scrolly ];
}


world.prototype.clearBBox = function() {
  for (var i=0, il=this.geom_bbox.length; i<il; i++) {
    var ele = this.geom_bbox[i];
    ele.clear();
    ele.renderable=false;
  }
}

world.prototype.drawBBox = function() {
  var count=0;
  for (var gn in this.pepacatModel.trigroup2d) {
    count++;
  }

  for (var i=this.geom_bbox.length; i<count; i++) {
    var ele = new PIXI.Graphics();
    ele.clear();
    this.geom_bbox.push(ele);
    this.stage.addChild(this.geom_bbox[i]);
  }

  var line_alpha = 0.5;
  var line_width = 1;
  var line_color = 0x773333;

  count=0;
  for (var gn in this.pepacatModel.trigroup2d) {
    var group = this.pepacatModel.trigroup2d[gn];

    var bbox = group.bbox;

    var v0 = this.w2D(bbox.lx, bbox.ly);
    var v1 = this.w2D(bbox.ux, bbox.uy);


    var ele = this.geom_bbox[count];
    ele.clear();
    ele.renderable=true;
    ele.lineStyle(line_width, line_color, line_alpha);
    ele.moveTo(v0[0], v0[1]);
    ele.lineTo(v0[0], v1[1]);
    ele.lineTo(v1[0], v1[1]);
    ele.lineTo(v1[0], v0[1]);
    ele.lineTo(v0[0], v0[1]);
    count++;
  }

  for (var i=count, il=this.geom_bbox.length; i<il; i++) {
    var ele = this.geom_bbox[i];
    ele.clear();
    ele.renderable=false;
  }
}

world.prototype.drawGrid = function() {

  var lt = Math.pow ( 10, Math.floor( Math.log( this.view.x2-this.view.x1 ) / Math.log(10) ) );
  var gridstep = lt / 10.0 ;

  var x_start = gridstep * (Math.floor( this.view.x1 /gridstep));    // round = int()
  var x_stop = gridstep * (Math.floor( this.view.x2 / gridstep)+1);  // round = int()
  if ( x_start > x_stop ) { t = x_start; x_start = x_stop; x_stop = t; }

  var y_start = gridstep * (Math.floor( this.view.y1 / gridstep));
  var y_stop = gridstep * (Math.floor( this.view.y2 / gridstep)+1);
  if ( y_start > y_stop ) { t = start; y_start = y_stop; y_stop = t; }

  var line_count = 0;

  for (var x=x_start; x<x_stop; x+=gridstep) { line_count++; }
  for (var y=y_start; y<y_stop; y+=gridstep) { line_count++; }

  if (line_count > this.grid.length) {

    for (var ii=this.grid.length; ii<line_count; ii++) {
      var grid_ele = new PIXI.Graphics();
      grid_ele.clear();
      this.grid.push({x:0, ex:0, y:0, ey:0, ele: grid_ele});
      this.stage.addChild(this.grid[ii].ele);
    }

  }

  var alpha = 0.0625;
  var color = 0x777777;
  var lwidth = 2;

  var M = this.transform;

  var idx = 0;
  for (var x=x_start; x<x_stop; x+=gridstep) {
    var g = this.grid[idx];
    var ele = g.ele;

    var x1t = M[0][0]*x + M[0][1]*this.view.y1 + M[0][2];
    var y1t = M[1][0]*x + M[1][1]*this.view.y1 + M[1][2];

    var x2t = M[0][0]*x + M[0][1]*this.view.y2 + M[0][2];
    var y2t = M[1][0]*x + M[1][1]*this.view.y2 + M[1][2];

    ele.clear();
    ele.renderable=true;
    ele.lineStyle(lwidth, color, alpha);
    ele.moveTo(x1t, y1t);
    ele.lineTo(x2t, y2t);
    idx++;
  }

  for (var y=y_start; y<y_stop; y+=gridstep) {
    var g = this.grid[idx];
    var ele = g.ele;

    var x1t = M[0][0]*this.view.x1 + M[0][1]*y + M[0][2];
    var y1t = M[1][0]*this.view.x1 + M[1][1]*y + M[1][2];

    var x2t = M[0][0]*this.view.x2 + M[0][1]*y + M[0][2];
    var y2t = M[1][0]*this.view.x2 + M[1][1]*y + M[1][2];

    ele.clear();
    ele.renderable=true;
    ele.lineStyle(lwidth, color, alpha);

    ele.moveTo(x1t, y1t);
    ele.lineTo(x2t, y2t);
    idx++;
  }

  for (; idx<this.grid.length; idx++) {
    this.grid[idx].ele.renderable=false;
  }

}

//var g_world = { init_flag:false };
function init_twoD_window() {
  g_world = new world("canvas");
  init_debug();
  requestAnimationFrame(loop2d);
}

function loop2d() {
  if (g_world.init_flag) { g_world.animate(); }
  requestAnimationFrame(loop2d);
}


var g_graphicElement = [];
var g_geom = [];

function init_debug() {

  //DISABLE
  return;

  for (var ii=0; ii<10; ii++) {
    var geom_ele = {};
    var ele = new PIXI.Graphics();
    ele.clear();

    var alpha = Math.random() + 0.25;
    if (alpha>1.0) { alpha=1.0; }
    if (alpha<0.0) { alpha=0.0; }

    ele.lineStyle(2, 0xff2222, alpha);

    var x = g_world.width/2;
    var y = g_world.height/2;
    x=0; y=0;

    var dx = (Math.random()-0.5)*100;
    var dy = (Math.random()-0.5)*100;

    geom_ele.type = "line";

    ele.moveTo(x+dx, y+dy);
    geom_ele.x = x+dx;
    geom_ele.y = y+dy;

    dx = (Math.random()-0.5)*100;
    dy = (Math.random()-0.5)*100;

    ele.lineTo(x+dx, y+dy);
    geom_ele.ex = x+dx;
    geom_ele.ey = y+dy;

    g_graphicElement.push(ele);
    g_geom.push(geom_ele);
  }

  for (var ii=0, il=g_graphicElement.length; ii<il; ii++) {
    g_world.stage.addChild(g_graphicElement[ii]);
  }

}

var g_count = 0.0;
var tf = true;
var g_ticker = 0, g_TICK=10;
var g_bool = false;

world.prototype.T2D = function(T, x,y) {
  var tx = T[0][0]*x + T[0][1]*y + T[0][2];
  var ty = T[1][0]*x + T[1][1]*y + T[1][2];
  return [tx,ty];
}

world.prototype.w2D = function(x,y) {
  var tx = this.transform[0][0]*x + this.transform[0][1]*y + this.transform[0][2];
  var ty = this.transform[1][0]*x + this.transform[1][1]*y + this.transform[1][2];
  return [tx,ty];
}

function _pm_sqr(x) { return x * x; }
function _pm_dist2(v, w) { return _sqr(v[0] - w[0]) + _sqr(v[1] - w[1]); }
function _pm_dist(v, w) { return Math.sqrt(_sqr(v[0] - w[0]) + _sqr(v[1] - w[1])); }

world.prototype.drawTriName = function(render) {
  render = ( (typeof render === "undefined") ? false : render );

  if (!this.geom_tri_name_init) {
    this.geom_tri_name = new PIXI.Graphics();
    this.geom_tri_name.clear();
    this.geom_tri_name.renderable = false;
    this.stage.addChild(this.geom_tri_name);
    this.geom_tri_name_init = true;
  }

  if (!render) {
    this.geom_tri_name.clear();
    this.geom_tri_name.renderable = false;
    return;
  }

  var line_width = 1;
  var line_color = 0x555555;
  var line_alpha = 0.5;


  this.geom_tri_name.clear();
  this.geom_tri_name.lineStyle(line_width, line_color, line_alpha);
  this.geom_tri_name.renderable = true;

  for (var gn in this.pepacatModel.trigroup2d) {
    var group = this.pepacatModel.trigroup2d[gn];
    for (var tri_idx in group.tri_idx_map) {
      var tri = group.tri_idx_map[tri_idx].tri2d;
      var cx = (tri[0][0] + tri[1][0] + tri[2][0])/3.0;
      var cy = (tri[0][1] + tri[1][1] + tri[2][1])/3.0;
      var ds = Math.min( _pm_dist(tri[0], tri[1]), _pm_dist(tri[1], tri[2]), _pm_dist(tri[0], tri[2]) ) / 10.0;
      var num_vec = VecNum(tri_idx, cx, cy, ds, ds);

      for (var ii=0, il=num_vec.length; ii<il; ii++) {
        if (num_vec[ii].length==0) { continue; }
        num_vec[ii] = this.w2D(num_vec[ii][0], num_vec[ii][1]);
      }

      var move_to_flag = true;
      for (var ii=0, il=num_vec.length; ii<il; ii++) {
        if (num_vec[ii].length==0) {
          move_to_flag = true;
          continue;
        }

        if (move_to_flag) {
          this.geom_tri_name.moveTo(num_vec[ii][0], num_vec[ii][1]);
          move_to_flag = false;
          continue;
        }

        this.geom_tri_name.lineTo(num_vec[ii][0], num_vec[ii][1]);
        move_to_flag = false;
      }

    }
  }
}

world.prototype.clearHighlight = function() {
  for (var ii=0, il=this.geom_highlight.length; ii<il; ii++) {
    var ele = this.geom_highlight[ii];
    ele.clear();
    ele.renderable=false;
  }

  if (!this.geom_highlight_tri_init) {

    this.geom_highlight_tri = new PIXI.Graphics();
    this.geom_highlight_tri.clear();
    this.geom_highlight_tri.renderable = false;
    this.stage.addChild(this.geom_highlight_tri);
    this.geom_highlight_tri_init = true;
  }


  var ele = this.geom_highlight_tri;
  ele.clear();
  ele.renderable=false;

  this.draw_highlight=false;
}

world.prototype.unhighlightEdge = function() {
  if (!this.geom_edge_highlight_init) {
    var ele = new PIXI.Graphics();
    ele.clear();
    ele.renderable = false;
    this.stage.addChild(ele);
    this.geom_edge_highlight = ele;
    this.geom_edge_highlight_init = true;
  }

  var ele = this.geom_edge_highlight;
  ele.clear();
  ele.renderable = false;
}

world.prototype.highlightCutEdge = function(src_idx, dst_idx) {
  var pm = this.pepacatModel;

  var edge = pm.tri_adjmap[src_idx][dst_idx];

  var src_group = pm.TriGroupName(src_idx);
  var src_tri = pm.trigroup2d[src_group].tri_idx_map[src_idx].tri2d;

  var dst_group = pm.TriGroupName(dst_idx);
  var dst_tri = pm.trigroup2d[dst_group].tri_idx_map[dst_idx].tri2d;

  if (src_group != dst_group) { return; }

  if (!this.geom_edge_highlight_init) {
    var ele = new PIXI.Graphics();
    ele.clear();
    ele.renderable = false;
    this.stage.addChild(ele);
    this.geom_edge_highlight = ele;
    this.geom_edge_highlight_init = true;
  }

  var a = edge.src_edge[0];
  var b = edge.src_edge[1];

  var src_pnt = this.w2D( src_tri[a][0], src_tri[a][1] );
  var dst_pnt = this.w2D( src_tri[b][0], src_tri[b][1] );


  var line_width = 10;
  var line_color = 0x778800;
  var line_alpha = 0.5;


  var ele = this.geom_edge_highlight;
  ele.clear();
  ele.renderable = true;
  ele.lineStyle(line_width, line_color, line_alpha);
  ele.moveTo( src_pnt[0], src_pnt[1] );
  ele.lineTo( dst_pnt[0], dst_pnt[1] );

  //console.log("highlight edge:", src_pnt[0], src_pnt[1], dst_pnt[0], dst_pnt[1] );

}

world.prototype.highlightGlueEdge = function(src_idx, dst_idx) {
  var pm = this.pepacatModel;

  var edge = pm.tri_adjmap[src_idx][dst_idx];

  var src_group = pm.TriGroupName(src_idx);
  var src_tri = pm.trigroup2d[src_group].tri_idx_map[src_idx].tri2d;

  var dst_group = pm.TriGroupName(dst_idx);
  var dst_tri = pm.trigroup2d[dst_group].tri_idx_map[dst_idx].tri2d;

  if (!this.geom_edge_highlight_init) {
    var ele = new PIXI.Graphics();
    ele.clear();
    ele.renderable = false;
    this.stage.addChild(ele);
    this.geom_edge_highlight = ele;
    this.geom_edge_highlight_init = true;
  }

  var src_pnt = this.w2D( (src_tri[edge.src_edge[0]][0] + src_tri[edge.src_edge[1]][0])/2.0,
                          (src_tri[edge.src_edge[0]][1] + src_tri[edge.src_edge[1]][1])/2.0 );
  var dst_pnt = this.w2D( (dst_tri[edge.dst_edge[0]][0] + dst_tri[edge.dst_edge[1]][0])/2.0,
                          (dst_tri[edge.dst_edge[0]][1] + dst_tri[edge.dst_edge[1]][1])/2.0 );


  var line_width = 10;
  var line_color = 0x770000;
  var line_alpha = 0.5;


  var ele = this.geom_edge_highlight;
  ele.clear();
  ele.renderable = true;
  ele.lineStyle(line_width, line_color, line_alpha);
  ele.moveTo( src_pnt[0], src_pnt[1] );
  ele.lineTo( dst_pnt[0], dst_pnt[1] );

  //console.log("highlight edge:", src_pnt[0], src_pnt[1], dst_pnt[0], dst_pnt[1] );

}


world.prototype.updateHighlight = function(tri_idx) {
  var gn = this.pepacatModel.TriGroupName(tri_idx);
  var group = this.pepacatModel.trigroup2d[gn];
  var boundary = this.pepacatModel.TriGroupBoundary(group);

  console.log(">>>>", gn, group.anchor_tri_idx, typeof(boundary));

  if ((typeof this.geom_highlight === "undefined") || (typeof boundary === "undefined")) {
    console.log("updateHighlight >>>", this.geom_highlight, boundary, "group name (boudnary)", gn);
  }

  if (this.geom_highlight.length < boundary.length) {
    for (var ii=this.geom_highlight.length, il=boundary.length; ii<il; ii++) {
      var geom_ele = new PIXI.Graphics();
      geom_ele.clear();
      this.geom_highlight.push(geom_ele);
      this.stage.addChild(this.geom_highlight[ii]);
    }
  }

  this.tri_idx_highlight = tri_idx;
  this.boundary_highlight = boundary;
}

world.prototype.drawHighlight = function() {
  var boundary = this.boundary_highlight;

  var line_width = 3;
  var line_color = 0x770000;
  var line_alpha = 0.5;
  var fill_color = 0x330000;

  for (var ii=1, il=boundary.length; ii<il; ii++) {
    var ele = this.geom_highlight[ii];

    var v0 = this.w2D(boundary[ii-1][0], boundary[ii-1][1]);
    var v1 = this.w2D(boundary[ii][0], boundary[ii][1]);

    ele.clear();
    ele.renderable=true;
    ele.lineStyle(line_width, line_color, line_alpha);
    ele.moveTo(v0[0], v0[1]);
    ele.lineTo(v1[0], v1[1]);
  }

  for (var ii=boundary.length, il=this.geom_highlight.length; ii<il; ii++) {
    var ele = this.geom_highlight[ii];
    ele.clear();
    ele.renderable=false;
  }

  if (this.tri_idx_highlight>=0) {

    if (!this.geom_highlight_tri_init) {

      this.geom_highlight_tri = new PIXI.Graphics();
      this.geom_highlight_tri.clear();
      this.geom_highlight_tri.renderable = false;
      this.stage.addChild(this.geom_highlight_tri);
      this.geom_highlight_tri_init = true;
    }


    var tri_idx = this.tri_idx_highlight;


    var tri = this.pepacatModel.TriRealized2D(tri_idx);


    var v0 = this.w2D(tri[0][0], tri[0][1]);
    var v1 = this.w2D(tri[1][0], tri[1][1]);
    var v2 = this.w2D(tri[2][0], tri[2][1]);

    //console.log(">>>", tri_idx, JSON.stringify(v0), JSON.stringify(v1), JSON.stringify(v2) );

    this.geom_highlight_tri.clear();
    this.geom_highlight_tri.renderable=true;
    this.geom_highlight_tri.beginFill(fill_color);
    this.geom_highlight_tri.lineStyle(line_width, line_color, line_alpha);
    this.geom_highlight_tri.moveTo(v0[0], v0[1]);
    this.geom_highlight_tri.lineTo(v1[0], v1[1]);
    this.geom_highlight_tri.lineTo(v2[0], v2[1]);
    //this.geom_highlight_tri.lineTo(v0[0], v0[1]);
    this.geom_highlight_tri.endFill();
  }


}

world.prototype.drawGeometry = function() {
  var tg2d = this.pepacatModel.trigroup2d;

  var tri2d = [];
  var T = [];

  line_count=0;
  for (var gname in tg2d) {
    var gr = tg2d[gname];
    for (var tri_idx in gr.tri_idx_map) {
      tri2d = gr.tri_idx_map[tri_idx].tri2d;
      T = gr.tri_idx_map[tri_idx].T;
      line_count+=3;
    }
  }

  if (line_count > this.geom.length) {
    for (var ii=this.geom.length; ii<line_count; ii++) {
      var geom_ele = new PIXI.Graphics();
      geom_ele.clear();
      this.geom.push(geom_ele);
      this.stage.addChild(this.geom[ii]);
    }

  }

  var line_alpha = 0.5;
  var line_width = 1;
  var line_color = 0x777777;


  line_count=0;
  for (var gname in tg2d) {
    var gr = tg2d[gname];
    for (var tri_idx in gr.tri_idx_map) {
      tri2d = gr.tri_idx_map[tri_idx].tri2d;

      var v0 = this.w2D(tri2d[0][0], tri2d[0][1]);
      var v1 = this.w2D(tri2d[1][0], tri2d[1][1]);
      var v2 = this.w2D(tri2d[2][0], tri2d[2][1]);

      var ele = this.geom[line_count];
      ele.clear();
      ele.renderable=true;
      ele.lineStyle(line_width, line_color, line_alpha);
      ele.moveTo(v0[0], v0[1]);
      ele.lineTo(v1[0], v1[1]);
      line_count++;

      ele = this.geom[line_count];
      ele.clear();
      ele.renderable=true;
      ele.lineStyle(line_width, line_color, line_alpha);
      ele.moveTo(v1[0], v1[1]);
      ele.lineTo(v2[0], v2[1]);
      line_count++;

      ele = this.geom[line_count];
      ele.clear();
      ele.renderable=true;
      ele.lineStyle(line_width, line_color, line_alpha);
      ele.moveTo(v2[0], v2[1]);
      ele.lineTo(v0[0], v0[1]);
      line_count++;

    }
  }


}

world.prototype.animate = function() {

  this.drawTriName(true);

  if (this.pepacatModel.init_flag) {
    this.drawGeometry();
  }

  if (this.draw_highlight) {
    this.drawHighlight();
  }

  //if (this.draw_edge_highlight) { this.drawEdgeHighlight(); }

  /*
  g_ticker++;
  if (g_ticker>=g_TICK) {
    if (tf) { tf = false; }
    else { tf = true; }
    g_ticker=0;
  }

  g_count += 0.125*0.125;
  if (g_count > (2*Math.PI)) { g_count -= 2*Math.PI; }

  for (var ii=0, il=g_graphicElement.length; ii<il; ii++) {

    var x = g_world.width/2;
    var y = g_world.heighth/2;

    x = g_geom[ii].x;
    y = g_geom[ii].y;
    var ex = g_geom[ii].ex;
    var ey = g_geom[ii].ey;

    var v = [x,y,1];
    var tx = this.transform[0][0]*v[0] + this.transform[0][1]*v[1] + this.transform[0][2]*v[2];
    var ty = this.transform[1][0]*v[0] + this.transform[1][1]*v[1] + this.transform[1][2]*v[2];
    x = tx;
    y = ty;

    v = [ex, ey, 1];
    var tex = this.transform[0][0]*v[0] + this.transform[0][1]*v[1] + this.transform[0][2]*v[2];
    var tey = this.transform[1][0]*v[0] + this.transform[1][1]*v[1] + this.transform[1][2]*v[2];
    ex = tex;
    ey = tey;

    var ele = g_graphicElement[ii];

    var count = g_count;
    ele.clear();
    ele.lineStyle(2, 0xff2222, 0.5);
    ele.moveTo(x , y);
    ele.lineTo(ex, ey);

    if (!g_bool) {
      console.log(ele.transform);
      g_bool=true;
    }

  }
  */

  this.drawGrid();

  this.drawBBox();

  this.renderer.render(stage);
  //requestAnimationFrame( this.animate );
}


