if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
var g_container, g_stats;
var g_camera, g_cameraTarget, g_scene, g_renderer;

var g_tris;
var g_mouseVector;
var g_mouse = new THREE.Vector2();
var g_raycaster = new THREE.Raycaster();

var g_containerWidth, g_containerHeight;
var g_redraw_3d=true;

/*
init_threeD_window();
animate();
*/

var g_edge_3 = {};

var g_threeD_state = {
  mouseinit : false,
  mousedown : false,
  firstmousedown : false,
  mousex : 0,
  mousey : 0,

  origx : 0,
  origy : 0,
  deltax : 0,
  detlay : 0,

  prevx : 0,
  prevy : 0,

  startx : 0,
  starty : 0




};

function onMouseDown( e ) {
  g_redraw_3d=true;

  g_threeD_state.firstmousedown = true;
  g_threeD_state.mousedown = true;

  g_threeD_state.startx = g_threeD_state.mousex;
  g_threeD_state.starty = g_threeD_state.mousey;

  g_threeD_state.prevx = g_mouse.x;
  g_threeD_state.prevy = g_mouse.y;
}

function onMouseUp( e ) {
  g_redraw_3d=true;

  g_threeD_state.mousedown = false;

  g_threeD_state.origx = g_threeD_state.mousex;
  g_threeD_state.origy = g_threeD_state.mousey;
}

function onMouseMove( e ) {
  g_redraw_3d=true;

  g_containerWidth = g_container.clientWidth;
  g_containerHeight = g_container.clientHeight;

  var offset = $("#threeD").offset();

  var x = e.clientX - offset.left;
  var y = e.clientY - offset.top;

  g_mouseVector.x = 2 * (e.clientX / g_containerWidth) - 1;
  g_mouseVector.y = 1 - 2 * ( e.clientY / g_containerHeight );

  g_mouse.x = ( x / g_containerWidth ) * 2 - 1;
  g_mouse.y = - ( y / g_containerHeight ) * 2 + 1;   

  if (!g_threeD_state.mouseinit) {
    g_threeD_state.startmousex = g_mouse.x;
    g_threeD_state.startmousey = g_mouse.y;

    g_threeD_state.prevmousex = g_mouse.x;
    g_threeD_state.prevmousey = g_mouse.y;

    g_threeD_state.mouseinit = true;
  }

  if (g_threeD_state.mousedown) {
    //g_threeD_state.mousex = g_mouse.x * Math.PI;
    //g_threeD_state.mousey = g_mouse.y * Math.PI;

    g_threeD_state.deltax = (g_mouse.x - g_threeD_state.prevx);
    g_threeD_state.deltay = (g_mouse.y - g_threeD_state.prevy);

    g_threeD_state.prevx += g_threeD_state.deltax;
    g_threeD_state.prevy += g_threeD_state.deltay;

    g_threeD_state.mousex += g_threeD_state.deltax ;
    g_threeD_state.mousey += g_threeD_state.deltay ;

  }

}

function _emit_line( u, v ) {
  var line_mat = new THREE.LineBasicMaterial({ color:0x000000 });
  var line_geom = new THREE.Geometry();
  line_geom.vertices.push( new THREE.Vector3( u[0], u[1], u[2] ) );
  line_geom.vertices.push( new THREE.Vector3( v[0], v[1], v[2] ) );
  var line = new THREE.Line( line_geom, line_mat );
  line._data = { type: "line" };

  return line;
}


function r() { return Math.random()*0.5 + 0.25; }
function init_threeD_window() {
  g_container = document.getElementById( "threeD" );

  g_containerWidth = g_container.clientWidth;
  g_containerHeight = g_container.clientHeight;

  if (g_containerHeight <= 0) { g_containerHeight = 1; }
  var aspect = g_containerWidth / g_containerHeight;

  g_camera = new THREE.PerspectiveCamera( 35, aspect, 1, 15 );
  g_camera.position.set( 3, 0.15, 3 );

  g_cameraTarget = new THREE.Vector3( 0, -0.25, 0 );

  g_scene = new THREE.Scene();
  g_scene.fog = new THREE.Fog( 0x72645b, 2, 15 );

  g_tris = new THREE.Scene();
  g_projector = new THREE.Projector();
  g_mouseVector = new THREE.Vector3();

/*
  window.addEventListener( 'mousemove', onMouseMove, false );
  window.addEventListener( 'mousedown', onMouseDown, false );
  window.addEventListener( 'mouseup', onMouseUp, false );
  window.addEventListener( 'resize', onWindowResize, false );
*/

  g_container.addEventListener( 'mousemove', onMouseMove, false );
  g_container.addEventListener( 'mousedown', onMouseDown, false );
  g_container.addEventListener( 'mouseup', onMouseUp, false );
  g_container.addEventListener( 'resize', onWindowResize, false );

  // Ground

  var plane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry( 40, 40 ),
    new THREE.MeshPhongMaterial( { color: 0x999999, specular: 0x101010 } )
  );
  plane.rotation.x = -Math.PI/2;
  plane.position.y = -0.8;
  plane.ignore = true;
  g_scene.add( plane );

  plane.receiveShadow = true;

  var loader = new THREE.STLLoader();


  // Binary files

  var material = new THREE.MeshPhongMaterial({
    //color: 0xAAAAAA, specular: 0x111111, shininess: 200, side : THREE.DoubleSide
    color: 0xAAAAAA, specular: 0x111111, shininess: 200
  });


  loader.load( './models/Bunny-LowPoly.stl', function ( geometry ) {
  //loader.load( './models/david_low_poly.stl', function ( geometry ) {
  //loader.load( './models/david_low_poly_1024.stl', function ( geometry ) {
    var verts = geometry.attributes.position.array;
    var n = verts.length;

    var rr = Math.random();

    var cent = [0,0,0];
    var m = 1;


    for (var ind=0; ind<n; ind+=9) {

      cent[0] += verts[ind+0] + verts[ind+3] + verts[ind+6];
      cent[1] += verts[ind+1] + verts[ind+4] + verts[ind+7];
      cent[2] += verts[ind+2] + verts[ind+5] + verts[ind+8];
      m+=3;

    }

    cent[0] /= m;
    cent[1] /= m;
    cent[2] /= m;

    g_pepacat_model.vert_raw = verts;

    for (var ind=0; ind<n; ind+=9) {

      var uniq_r = Math.floor( 127.9 * Math.random() );
      uniq_r += 64;

      var uniq_g = Math.floor( 127.9 * Math.random() );
      uniq_g += 64;

      var uniq_b = Math.floor( 127.9 * Math.random() );
      uniq_b += 64;

      var c = "rgb(" + uniq_r + "," + uniq_g + "," + uniq_b + ")";

      var tri_mat = new THREE.MeshPhongMaterial({
        color : c,
        shading : THREE.FlatShading,
        specular: 0x000000, shininess: 0,
        side : THREE.DoubleSide
      });

      var v0 = new THREE.Vector3( verts[ind+0], verts[ind+1], verts[ind+2] );
      var v1 = new THREE.Vector3( verts[ind+3], verts[ind+4], verts[ind+5] );
      var v2 = new THREE.Vector3( verts[ind+6], verts[ind+7], verts[ind+8] );

      var y0 = verts[ind+1];
      var y1 = verts[ind+4];
      var y2 = verts[ind+7];

      var ya = (y0+y1+y2)/3.0;

      var tri_geom = new THREE.Geometry();
      tri_geom.vertices.push( v0 );
      tri_geom.vertices.push( v1 );
      tri_geom.vertices.push( v2 );
      tri_geom.faces.push( new THREE.Face3(0,1,2) );

      var tri_mesh = new THREE.Mesh( tri_geom, tri_mat );

      g_pepacat_model.vert3d.push( [ verts[ind+0], verts[ind+1], verts[ind+2] ] );
      g_pepacat_model.vert3d.push( [ verts[ind+3], verts[ind+4], verts[ind+5] ] );
      g_pepacat_model.vert3d.push( [ verts[ind+6], verts[ind+7], verts[ind+8] ] );

      //david
      var s = .10800;
      var sx = s;
      var sy = s;
      var sz = s;

      var r = (Math.random() + (ya*ya/100.0))*s*3;
      r = 0;


      tri_mesh.position.set( -cent[0]*s, -(cent[1]-r)*s, -cent[2]*s );
      //tri_mesh.rotation.set( 0, 0, 0 );

      //bunny
      var s = .00800;
      var sx = s;
      var sy = s;
      var sz = s;

      //tri_mesh.position.set( 0, - 0.37, - 0.6 );
      //tri_mesh.position.set( -0.1, - 0.37, - 0.0 );
      //tri_mesh.position.set( -0.1, - Math.random()/10.5 - .3, 0.0);

      //bunny
      tri_mesh.position.set( -0.0, - 0.65, - 0.0 );
      tri_mesh.rotation.set( - Math.PI / 2, 0, 0 );

      tri_mesh.scale.set( sz,sy,sz );
      tri_mesh.castShadow = true;
      //tri_mesh.receiveShadow = true;

      tri_mesh._data = { raw_ind: ind, tri_ind : Math.floor(ind/9), type:"tri" };
      g_pepacat_model.tri_mesh.push( tri_mesh );
      g_pepacat_model.tri_geom.push( tri_geom );

      g_scene.add( tri_mesh );


      //TESTING
      // fooling around with lines
      //

      var l_u = [verts[ind+0], verts[ind+1], verts[ind+2]];
      var l_v = [verts[ind+3], verts[ind+4], verts[ind+5]];
      var l_w = [verts[ind+6], verts[ind+7], verts[ind+8]];

      var e0 = _norm_edge3(l_u, l_v);
      var e1 = _norm_edge3(l_u, l_w);
      var e2 = _norm_edge3(l_v, l_w);

      if (!(e0 in g_edge_3)) {
        var line = _emit_line( l_u, l_v );
        g_edge_3[e0] = line;

        var ss = sx;

        line.position.set( -cent[0]*s, -(cent[1]-r)*s, -cent[2]*s );
        line.position.set( -0.0, - 0.65, - 0.0 );
        line.rotation.set( - Math.PI / 2, 0, 0 );
        line.scale.set( ss,ss,ss );
        g_scene.add(line);
      }

      if (!(e1 in g_edge_3)) {
        var line = _emit_line( l_u, l_w );
        g_edge_3[e1] = line;

        var ss = sx;

        line.position.set( -cent[0]*s, -(cent[1]-r)*s, -cent[2]*s );
        line.position.set( -0.0, - 0.65, - 0.0 );
        line.rotation.set( - Math.PI / 2, 0, 0 );
        line.scale.set( ss,ss,ss );
        g_scene.add(line);
      }

      if (!(e2 in g_edge_3)) {
        var line = _emit_line( l_v, l_w );
        g_edge_3[e2] = line;

        var ss = sx;

        line.position.set( -cent[0]*s, -(cent[1]-r)*s, -cent[2]*s );
        line.position.set( -0.0, - 0.65, - 0.0 );
        line.rotation.set( - Math.PI / 2, 0, 0 );
        line.scale.set( ss,ss,ss );
        g_scene.add(line);
      }

      /*
      var line_mat = new THREE.LineBasicMaterial({ color:0x000000 });
      var line_geom = new THREE.Geometry();
      line_geom.vertices.push( new THREE.Vector3( verts[ind+0], verts[ind+1], verts[ind+2] ) );
      line_geom.vertices.push( new THREE.Vector3( verts[ind+3], verts[ind+4], verts[ind+5] ) );
      line_geom.vertices.push( new THREE.Vector3( verts[ind+6], verts[ind+7], verts[ind+8] ) );
      line_geom.vertices.push( new THREE.Vector3( verts[ind+0], verts[ind+1], verts[ind+2] ) );
      var line = new THREE.Line( line_geom, line_mat );
      line._data = { type: "line" };

      line.position.set( -cent[0]*s, -(cent[1]-r)*s, -cent[2]*s );
      line.position.set( -0.0, - 0.65, - 0.0 );
      line.rotation.set( - Math.PI / 2, 0, 0 );
      line.scale.set( sz,sy,sz );

      g_scene.add(line);
      */

      //
      //TESTING


    }

    pepacat_init( g_pepacat_model );


    //DEBUG
    x0 = _tri_unfold_single( g_pepacat_model, 53, 244, true );
    x1 = _tri_unfold_single( g_pepacat_model, 244, 41, false );

    var t0 = simplecopy(x0);
    var t1 = simplecopy(x1);
    _scale2d(t0[0], 10) ; _scale2d(t0[1],10) ;
    _scale2d(t1[0], 10) ; _scale2d(t1[1],10) ;
    //g_2d.debug_geom = [ t0[0], t0[1], t1[0], t1[1] ];

    console.log(t0);
    g_2d.debug_cpath.push( { color:"rgba(255,0,0,0.5)", data: [t0[0][0], t0[0][1]] } );
    g_2d.debug_cpath.push( { color:"rgba(0,255,0,0.5)", data: [t0[0][1], t0[0][2]] } );
    g_2d.debug_cpath.push( { color:"rgba(0,0,255,0.5)", data: [t0[0][2], t0[0][0]] } );

    g_2d.debug_cpath.push( { color:"rgba(255,0,0,0.5)", data: [t0[1][0], t0[1][1]] } );
    g_2d.debug_cpath.push( { color:"rgba(0,255,0,0.5)", data: [t0[1][1], t0[1][2]] } );
    g_2d.debug_cpath.push( { color:"rgba(0,0,255,0.5)", data: [t0[1][2], t0[1][0]] } );

    //g_2d.debug_cpath.push( { color:"rgba(255,0,0,0.5)", data: [t1[0][0], t1[0][1]] } );
    //g_2d.debug_cpath.push( { color:"rgba(0,255,0,0.5)", data: [t1[0][1], t1[0][2]] } );
    //g_2d.debug_cpath.push( { color:"rgba(0,0,255,0.5)", data: [t1[0][2], t1[0][0]] } );

    g_2d.debug_cpath.push( { color:"rgba(255,0,0,0.5)", data: [t1[1][0], t1[1][1]] } );
    g_2d.debug_cpath.push( { color:"rgba(0,255,0,0.5)", data: [t1[1][1], t1[1][2]] } );
    g_2d.debug_cpath.push( { color:"rgba(0,0,255,0.5)", data: [t1[1][2], t1[1][0]] } );

    for (var i=0; i<3; i++) { }
    //g_2d.debug_geom = [ t1[0], t1[1] ];


    __debug(g_pepacat_model, 53);
    __debug(g_pepacat_model, 244);
    __debug(g_pepacat_model, 41);


  });



  // Lights

  g_scene.add( new THREE.AmbientLight( 0x777777 ) );

  addShadowedLight( 1, 1, 1, 0xffffff, 1.35 );
  addShadowedLight( 0.5, 1, -1, 0xffaa00, 1 );

  // renderer

  g_renderer = new THREE.WebGLRenderer( { antialias: true } );
  g_renderer.setClearColor( g_scene.fog.color );
  g_renderer.setPixelRatio( window.devicePixelRatio );
  //g_renderer.setSize( window.innerWidth, window.innerHeight );
  g_renderer.setSize( g_containerWidth, g_containerHeight );

  g_renderer.gammaInput = true;
  g_renderer.gammaOutput = true;

  g_renderer.shadowMapEnabled = true;
  g_renderer.shadowMapCullFace = THREE.CullFaceBack;

  g_container.appendChild( g_renderer.domElement );

  // stats

  g_stats = new Stats();
  g_stats.domElement.style.position = 'absolute';
  g_stats.domElement.style.top = '0px';
  g_container.appendChild( g_stats.domElement );

  //

  window.addEventListener( 'resize', onWindowResize, false );

}

function addShadowedLight( x, y, z, color, intensity ) {

  var directionalLight = new THREE.DirectionalLight( color, intensity );
  directionalLight.position.set( x, y, z )
  g_scene.add( directionalLight );

  directionalLight.castShadow = true;

  var d = 1;
  directionalLight.shadowCameraLeft = -d;
  directionalLight.shadowCameraRight = d;
  directionalLight.shadowCameraTop = d;
  directionalLight.shadowCameraBottom = -d;

  directionalLight.shadowCameraNear = 1;
  directionalLight.shadowCameraFar = 4;

  directionalLight.shadowMapWidth = 1024;
  directionalLight.shadowMapHeight = 1024;

  directionalLight.shadowBias = -0.005;
  directionalLight.shadowDarkness = 0.15;

}

function onWindowResize() {

  //var div = document.getElementById("threeD");
  var w = g_container.clientWidth;
  var h = g_container.clientHeight;
  if (h<=0) { h = 1; }

  g_camera.aspect = w / h;
  g_camera.updateProjectionMatrix();

  g_renderer.setSize( w, h );

  //containerWidth = w;
  //containerHeight = h;
  console.log("resize>>>", w, h );

}

function animate() {

  requestAnimationFrame( animate );

  if (g_redraw_3d) {
    g_redraw_3d=false;
    render();
  }


  g_stats.update();

}

function render() {

  var timer = Date.now() * 0.0005;

  if (!g_threeD_state.firstmousedown) {
    g_threeD_state.mousex = timer;
    g_redraw_3d = true;
  }

  var xx = Math.PI * g_threeD_state.mousex;
  var yy = Math.PI * g_threeD_state.mousey;

  var R = 3.0;
  var camv = [ Math.cos( xx ), yy, Math.sin( xx ) ];
  var r = Math.sqrt( (camv[0]*camv[0]) + (camv[1]*camv[1]) + (camv[2]*camv[2]) );
  if (r < 0.1) { r = 1; }
  g_camera.position.x = camv[0]*R/r;
  g_camera.position.y = -camv[1]*R/r;
  g_camera.position.z = camv[2]*R/r;


  g_camera.lookAt( g_cameraTarget );

  //pick testing
  //

  g_raycaster.setFromCamera( g_mouse, g_camera );
  var intersects = g_raycaster.intersectObjects( g_scene.children );

  var first = true;

  for (var i=0; i<intersects.length; i++) {
    if (intersects[i].object.ignore) { continue; }
    intersects[i].object.orig_color =
      intersects[i].object.material.color.getHex();
    if (first)
    {
      intersects[i].object.material.color.set(0xff0000);

      var x = intersects[i].object;
      var geom = x.geometry;

      if (g_threeD_state.mousedown) {
        if (intersects[i].object._data.type == "tri")
          console.log("tri>>>", intersects[i].object._data.tri_ind);
      }

    }
    first = false;
  }

  //
  //pick testing

  g_renderer.render( g_scene, g_camera );

  for (var i=0; i<intersects.length; i++) {
    if (intersects[i].object.ignore) { continue; }
    intersects[i].object.material.color.setHex( intersects[i].object.orig_color );
  }

}
