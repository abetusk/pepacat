
var g_container2d;
var g_containerWidth2d;
var g_containerHeight2d;

var g_canvas2d;
var g_painter;

var g_2d = {
  debug_geom: [],
  mouse_x: 0,
  mouse_y: 0,
  mouse_drag : false
};

function canvas_coords_from_global(x, y) {
  var rect = g_canvas2d.getBoundingClientRect();

  var rl = rect.left;
  var rt = rect.top;
  var scrollx = window.scrollX;
  var scrolly = window.scrollY;

  return [ x - rl - scrollx, y - rt - scrolly ];
}

function loop2d() {

  if (g_painter.dirty_flag) {
    g_painter.startDraw();
    g_painter.drawGrid();


    for (var i=0; i<g_2d.debug_geom.length; i++) {
      g_painter.drawPath(g_2d.debug_geom[i], 0, 0, "rgba(128,128,128,0.8)", 2, true);
    }

    g_painter.endDraw();
  }
  g_painter.dirty_flag=false;

  requestAnimationFrame(loop2d);
}

function mousedrag2d(dx, dy) {
  g_painter.adjustPan(dx,dy);
  g_painter.dirty_flag=true;
}

function mousedown2d(button, x, y) {
  if (button==3) { g_2d.mouse_drag = true; }
}

function mouseup2d(button, x, y) {
  if (button==3) { g_2d.mouse_drag = false; }
}

function mousemove2d(x, y) {
  if (g_2d.mouse_drag) {
    mousedrag2d(x-g_2d.mouse_x, y-g_2d.mouse_y);
  }
  g_2d.mouse_x = x;
  g_2d.mouse_y = y;
  g_painter.dirty_flag=true;
}

function mouseenter2d(x, y) {
  g_2d.mouse_x = x;
  g_2d.mouse_y = y;
}

function mouseleave2d(x, y) {
  g_2d.mouse_x = x;
  g_2d.mouse_y = y;
}

function mousewheel2d(delta) {
  g_painter.adjustZoom(g_2d.mouse_x, g_2d.mouse_y, delta);
  g_painter.dirty_flag=true;
}

function init_twoD_window() {

  //DEBUG
  g_2d.debug_geom.push( [ [0,0], [100,0], [50,50] ] );
  //DEBUG

  g_painter = new bleepsixRender("canvas");
  g_painter.setGrid(2);

  g_canvas2d = $("#canvas")[0];
  g_container2d = document.getElementById("twoD");

  g_containerWidth2d = g_container2d.clientWidth;
  g_containerHeight2d = g_container2d.clientHeight;

  if (g_containerHeight2d <= 0) { g_containerHeight2d = 1; }
  var aspect = g_containerWidth2d / g_containerHeight2d;

  requestAnimationFrame(loop2d, 1);

  $(g_container2d).focus( function(ev) { });

  $(g_container2d).mousedown( function(ev) {
    var xy = canvas_coords_from_global(ev.pageX, ev.pageY);
    mousedown2d(ev.which, xy[0], xy[1]);
  });

  $(g_container2d).mouseup( function(ev) {
    var xy = canvas_coords_from_global(ev.pageX, ev.pageY);
    mouseup2d(ev.which, xy[0], xy[1]);
  });

  $(g_container2d).mouseenter( function(ev) {
    var xy = canvas_coords_from_global(ev.pageX, ev.pageY);
    mouseenter2d(xy[0], xy[1]);
  });

  $(g_container2d).mouseleave( function(ev) {
    var xy = canvas_coords_from_global(ev.pageX, ev.pageY);
    mouseleave2d(xy[0], xy[1]);
  });

  $(g_container2d).mousemove( function(ev) {
    var xy = canvas_coords_from_global(ev.pageX, ev.pageY);
    mousemove2d(xy[0], xy[1]);
  });

  $(g_container2d).mousewheel( function(ev, delta, detlaX, deltaY) {
    mousewheel2d(delta);
    return false;
  });

  $(g_container2d).resize( function(ev) {
    console.log("2d resize>>>", ev);
  });

  // get rid of right click menu popup
  //
  $(g_container2d).bind("contextmenu", function(e) { return false; });

}
