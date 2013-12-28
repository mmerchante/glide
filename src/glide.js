
var windDirection = new THREE.Vector3( 0, 1, 0);
var tolerance = .5;

var rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .01, 0, 'XYZ'));


var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var cameraContainer = new THREE.Object3D();
scene.add(cameraContainer);

THREE.SceneUtils.attach(camera, scene, cameraContainer);
camera.position.z = 5;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

//drawAdjacency(baseGeometry, preprocessGeometry(baseGeometry));
//drawWireTriangles(baseGeometry);
render();


function render() {
	 setTimeout(function() {
        requestAnimationFrame(render);
		cameraContainer.quaternion.multiply(rot);		
		renderer.render(scene, camera);		
    }, 1000 / 60);
}		

function clearScene(scene) {
	var obj;
	for (var i = scene.children.length - 1; i >= 0; i--) {
	    obj = scene.children[i];

	    if (obj !== camera)
	        scene.remove(obj);
	}
}

/*
We can use DCEL but we may miss some 'extraordinary vertices'.
We can store neighborhood defined by maximum vine step (resulting in a disk).
We can store face adjacency by vertex. We may miss (and thus have to clamp) some long vine steps if an adjacent triangle is too small

Or we could just do O(n^2) in runtime, heh.
*/
function preprocessGeometry(geometry) {

	function vertexIsSimilar(v, w)
	{
		return v.distanceTo(w) < 0.01;
	}

	function faceIsAdjacent(face, otherFace)
	{
		var v1 = geometry.vertices[face.a];
		var v2 = geometry.vertices[face.b];
		var v3 = geometry.vertices[face.c];

		var w1 = geometry.vertices[otherFace.a];
		var w2 = geometry.vertices[otherFace.b];
		var w3 = geometry.vertices[otherFace.c];

		return vertexIsSimilar(v1, w1) || vertexIsSimilar(v1, w2) || vertexIsSimilar(v1, w3) ||
			vertexIsSimilar(v2, w1) || vertexIsSimilar(v2, w2) || vertexIsSimilar(v2, w3) ||
			vertexIsSimilar(v3, w1) || vertexIsSimilar(v3, w2) || vertexIsSimilar(v3, w3);
	}

	// Two faces are defined as adjacent if they share vertices
	var faceAdjacency = new Array(geometry.faces.length);

	for(var i = 0; i < geometry.faces.length; i++) {
		var face = geometry.faces[i];
		var adj = new Array();
		faceAdjacency[i] = adj;

		// Looks heavy due to O(n^2), but it's faster than alt method
		geometry.faces.forEach(function(otherFace) {	
			if(otherFace != face && adj.indexOf(otherFace) == -1 && faceIsAdjacent(geometry.faces[i], otherFace))
				adj.push(otherFace);
		});
	}

	return faceAdjacency;
}


// Debug
function drawWireTriangles(geometry) {
	geometry.faces.forEach(function(face) {	
		var v1 = geometry.vertices[face.a];
		var v2 = geometry.vertices[face.b];
		var v3 = geometry.vertices[face.c];

		var lineGeometry = new THREE.Geometry();
		var vertArray = lineGeometry.vertices;
		vertArray.push(v1, v2, v3);
		lineGeometry.computeLineDistances();
		var lineMaterial = new THREE.LineBasicMaterial( { color: 0x228822 } );
		var line = new THREE.Line( lineGeometry, lineMaterial );
		scene.add(line);
	});
}

// Debug
function drawAdjacency(geometry, faceAdjacency) {
	for(var i = 0; i < geometry.faces.length; i++) {
		var face = geometry.faces[i];

		var normal = new THREE.ArrowHelper(face.normal, face.centroid, .3, 0x4444cc);
		scene.add(normal);

		var lineGeometry = new THREE.Geometry();	
		var vertArray = lineGeometry.vertices;	

		faceAdjacency[i].forEach(function(adjacentFace) {
			var dir = new THREE.Vector3();	
			dir.subVectors(adjacentFace.centroid, face.centroid);
	
			vertArray.push(face.centroid, dir.multiplyScalar(.25).add(face.centroid));	
		});

		lineGeometry.computeLineDistances();
		var lineMaterial = new THREE.LineBasicMaterial( { color: 0xcc4444 } );
		var line = new THREE.Line( lineGeometry, lineMaterial );
		scene.add(line);
	}
}

function sampleGeometry(geometry, sampleDensity) {

	// Current problem: we cant have lower densities than smallest triangle
	// TODO: find all tris that pass the tolerance test and search sample in area space (with binary search)
	function getMinimumArea()
	{
		var minArea = Infinity;
 
		for(var i = 0; i < geometry.faces.length; i++) {
			var face = geometry.faces[i];

			var v1 = geometry.vertices[face.a];
			var v2 = geometry.vertices[face.b];
			var v3 = geometry.vertices[face.c];

			var area = THREE.GeometryUtils.triangleArea(v1, v2, v3);

			if(area < minArea)
				minArea = area;
		}

		return minArea;
	}

	var minArea = getMinimumArea();
	var samples = new Array();
	
	for(var faceIndex = 0; faceIndex < geometry.faces.length; faceIndex++) {

		var face = geometry.faces[faceIndex];

		// Only sample faces facing windDirection
		if(face.normal.dot(windDirection) > 1 - tolerance * 2) {

			var v1 = geometry.vertices[face.a];
			var v2 = geometry.vertices[face.b];
			var v3 = geometry.vertices[face.c];

			var area = THREE.GeometryUtils.triangleArea(v1, v2, v3) * sampleDensity / minArea;

			for(var i = 0; i < area; i++) {

				// TODO: threejs' randomPointInTriangle can be optimized by removing the branch
				var p = THREE.GeometryUtils.randomPointInTriangle(v1, v2, v3);

				var p2 = THREE.GeometryUtils.randomPointInTriangle(v1, v2, v3);
				var tangent = new THREE.Vector3().subVectors(p2, p).normalize();

				samples.push({point : p, direction : tangent, faceIndex : faceIndex});
			}
		}
	}

	return samples;
}

// Debug
function drawWireVines(vineArray) {
	vineArray.forEach(function(vine) {
		var lineGeometry = new THREE.Geometry();
		var vertArray = lineGeometry.vertices;

		vine.points.forEach(function(p){
			vertArray.push(p);
		});

		lineGeometry.computeLineDistances();
		var lineMaterial = new THREE.LineBasicMaterial( { color: 0x22FF22 } );
		var line = new THREE.Line( lineGeometry, lineMaterial );
		scene.add(line);
	});
}

var baseGeometry = new THREE.SphereGeometry(2.5, 20, 20);
var faceAdjacency = preprocessGeometry(baseGeometry);
var vineArray = initializeVines(baseGeometry);


growRandomVine(baseGeometry, faceAdjacency, vineArray);

drawWireVines(vineArray);

function growRandomVine(geometry, faceAdjacency, vineArray) {

	var vineIndex = THREE.Math.randInt(0, vineArray.length - 1);

	var vine = vineArray[vineIndex];


}

function initializeVines(geometry) {
	var samples = sampleGeometry(baseGeometry, 1);	
	var vineArray = new Array(samples.length);

	for(var i = 0; i < samples.length; i++)
		vineArray.push(createVine(samples[i].point, samples[i].direction, samples[i].faceIndex));

	return vineArray;
}

function createVine(startPoint, startDirection, startFace) {
	var v = { points : new Array(), currentDirection : startDirection, currentFaceIndex : startFace};
	v.points.push(startPoint);
	v.points.push(startPoint.clone().add(startDirection.clone().multiplyScalar(.2)));
	return v;
}

function log(s) {
	var div = document.getElementById("debug");
	var p = document.createElement("p");
	var t = document.createTextNode(s);
	p.appendChild(t);
	div.appendChild(p);
}