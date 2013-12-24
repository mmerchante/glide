
var windDirection = new THREE.Vector3( 0, 1, 0);
var tolerance = .5;

function render() {
	sampleGeometry(baseGeometry, 2);
	requestAnimationFrame(render);
	renderer.render(scene, camera);
}		

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var baseGeometry = new THREE.SphereGeometry(1, 10, 10);

camera.position.z = 5;
camera.position.y = 1;

render();

function clearScene(scene) {

	var obj;
	for (var i = scene.children.length - 1; i >= 0; i--) {
	    obj = scene.children[i];

	    if (obj !== camera)
	        scene.remove(obj);
	}
}

function sampleGeometry(geometry, surfaceDensity) {
	
	clearScene(scene);	

	geometry.faces.forEach(function(face) {	

		// Only sample faces facing windDirection
		if(face.normal.dot(windDirection) > 1 - tolerance * 2) {

			// Make sure big polys have enough samples (also, lol@cache coherency)
			var ab = new THREE.Vector3().subVectors( geometry.vertices[face.b], geometry.vertices[face.a]);
			var ac = new THREE.Vector3().subVectors( geometry.vertices[face.c], geometry.vertices[face.a]);
			var area = new THREE.Vector3().crossVectors(ab, ac).length() * surfaceDensity / 2.0;

			for(var i = 0; i < area; i++) {

		    	// ugh...
				var v1 = geometry.vertices[face.a].clone();
				var v2 = geometry.vertices[face.b].clone();
				var v3 = geometry.vertices[face.c].clone();

				var u = THREE.Math.random16();
				var v = THREE.Math.random16();

		        if (u + v > 1)
		        {
		            u = 1 - u;
		            v = 1 - v;
		        }

		        var w = 1 - u - v;

				var p = v1.multiplyScalar(u).addVectors(v2.multiplyScalar(v), v3.multiplyScalar(w));

				// Debug thingies
				var g = new THREE.SphereGeometry(.025, 4, 4);
				var material = new THREE.MeshBasicMaterial({ color : 0xcc4444 });
				var cube = new THREE.Mesh( g, material );
				cube.position = p;

				scene.add( cube );

			}
		}
	});
}