if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
var g_container, g_stats;
var g_camera, g_cameraTarget, g_scene, g_renderer;

var g_tris;
var g_mouseVector;
var g_mouse = new THREE.Vector2();
var g_raycaster = new THREE.Raycaster();

var g_containerWidth, g_containerHeight;

/*
init_threeD_window();
animate();
*/

var g_threeD_state = {
  mousedown : false,
  mousex : 0,
  mousey : 0
};


function onMouseDown( e ) {
  g_threeD_state.mousedown = true;
}

function onMouseUp( e ) {
  g_threeD_state.mousedown = false;
}

function onMouseMove( e ) {
  g_containerWidth = g_container.clientWidth;
  g_containerHeight = g_container.clientHeight;

  var offset = $("#threeD").offset();

  var x = e.clientX - offset.left;
  var y = e.clientY - offset.top;

  g_mouseVector.x = 2 * (e.clientX / g_containerWidth) - 1;
  g_mouseVector.y = 1 - 2 * ( e.clientY / g_containerHeight );

  g_mouse.x = ( x / g_containerWidth ) * 2 - 1;
  g_mouse.y = - ( y / g_containerHeight ) * 2 + 1;   

  if (g_threeD_state.mousedown) {
    //g_threeD_state.mousex = g_mouse.x * Math.PI;
    //g_threeD_state.mousey = g_mouse.y * Math.PI;
    g_threeD_state.mousex = g_mouse.x;
    g_threeD_state.mousey = g_mouse.y;
  }

}

function r() { return Math.random()*0.5 + 0.25; }
function init_threeD_window() {

  //container = document.createElement( 'div' );
  //document.body.appendChild( container );

  g_container = document.getElementById( "threeD" );

  g_containerWidth = g_container.clientWidth;
  g_containerHeight = g_container.clientHeight;

  console.log( g_container );
  console.log( g_container.clientWidth, g_container.clientHeight );
  console.log( g_container.width, g_container.height );

  if (g_containerHeight <= 0) { g_containerHeight = 1; }
  var aspect = g_containerWidth / g_containerHeight;

  //g_camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 15 );
  g_camera = new THREE.PerspectiveCamera( 35, aspect, 1, 15 );
  g_camera.position.set( 3, 0.15, 3 );

  //g_cameraTarget = new THREE.Vector3( 0, -0.25, 0 );
  g_cameraTarget = new THREE.Vector3( 0, -0.25, 0 );

  g_scene = new THREE.Scene();
  g_scene.fog = new THREE.Fog( 0x72645b, 2, 15 );

  g_tris = new THREE.Scene();
  g_projector = new THREE.Projector();
  g_mouseVector = new THREE.Vector3();

  window.addEventListener( 'mousemove', onMouseMove, false );
  window.addEventListener( 'mousedown', onMouseDown, false );
  window.addEventListener( 'mouseup', onMouseUp, false );
  window.addEventListener( 'resize', onWindowResize, false );


  // Ground

  var plane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry( 40, 40 ),
    new THREE.MeshPhongMaterial( { color: 0x999999, specular: 0x101010 } )
  );
  plane.rotation.x = -Math.PI/2;
  //plane.position.y = -0.5;
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
        //color : 0x888888,
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
      tri_mesh.rotation.set( 0, 0, 0 );

      //bunny
      var s = .00800;
      var sx = s;
      var sy = s;
      var sz = s;

      //tri_mesh.position.set( 0, - 0.37, - 0.6 );
      //tri_mesh.position.set( -0.1, - 0.37, - 0.0 );
      tri_mesh.position.set( -0.0, - 0.65, - 0.0 );
      //tri_mesh.position.set( -0.1, - Math.random()/10.5 - .3, 0.0);
      tri_mesh.rotation.set( - Math.PI / 2, 0, 0 );

      tri_mesh.scale.set( sz,sy,sz );
      tri_mesh.castShadow = true;
      //tri_mesh.receiveShadow = true;

      tri_mesh._data = { raw_ind: ind, tri_ind : Math.floor(ind/9) };
      g_pepacat_model.tri_mesh.push( tri_mesh );
      g_pepacat_model.tri_geom.push( tri_geom );

      g_scene.add( tri_mesh );

    }

    pepacat_init( g_pepacat_model );

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

  render();
  g_stats.update();

}

function render() {

  var timer = Date.now() * 0.0005;

  //g_camera.position.x = Math.cos( timer ) * 3;
  //g_camera.position.z = Math.sin( timer ) * 3;

  var xx = Math.PI * g_threeD_state.mousex;
  var yy = Math.PI * g_threeD_state.mousey;

  //console.log(xx,yy);

  var R = 3.0;
  var camv = [ Math.cos( xx ), yy, Math.sin( xx ) ];
  var r = Math.sqrt( (camv[0]*camv[0]) + (camv[1]*camv[1]) + (camv[2]*camv[2]) );
  if (r < 0.1) { r = 1; }
  g_camera.position.x = camv[0]*R/r;
  g_camera.position.y = -camv[1]*R/r;
  g_camera.position.z = camv[2]*R/r;

  //console.log(camv);

  //g_camera.position.x = Math.cos( timer ) * 3;
  //g_camera.position.z = Math.sin( timer ) * 3;



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