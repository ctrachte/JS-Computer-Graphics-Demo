

// ======================================================================
//  Low-level canvas access.
// ======================================================================

const canvas = document.getElementById("canvas");
const canvas_context = canvas.getContext("2d");
const canvas_buffer = canvas_context.getImageData(0, 0, canvas.width, canvas.height);
const canvas_pitch = canvas_buffer.width * 4;


// The PutPixel() function.
const PutPixel = function(x, y, color) {
  x = canvas.width/2 + x;
  y = canvas.height/2 - y - 1;

  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
    return;
  }

  let offset = 4*x + canvas_pitch*y;
  canvas_buffer.data[offset++] = color[0];
  canvas_buffer.data[offset++] = color[1];
  canvas_buffer.data[offset++] = color[2];
  canvas_buffer.data[offset++] = 255; // Alpha = 255 (full opacity)
}


// Displays the contents of the offscreen buffer into the canvas.
const UpdateCanvas = function() {
  canvas_context.putImageData(canvas_buffer, 0, 0);
}


// ======================================================================
//  Linear algebra and helpers.
// ======================================================================

// Dot product of two 3D vectors.
const DotProduct = function(v1, v2) {
  return v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
}


// Computes v1 - v2.
const Subtract = function(v1, v2) {
  return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}


// ======================================================================
//  A very basic raytracer.
// ======================================================================

// A Sphere.
const Sphere = function(center, radius, color) {
  this.center = center;
  this.radius = radius;
  this.color = color;
}

function getSpheres () {
  return spheres;
}

// Scene setup.
let viewport_size = 1;
let projection_plane_z = 1;
let camera_position = [0, 0, 0];
let background_color = [255, 255, 255];
let spheres = [new Sphere([0, -1, 3], 1, [255, 0, 0]),
           new Sphere([2, 0, 4], 1, [0, 0, 255]),
           new Sphere([-2, 0, 4], 1.5, [0, 0, 0])];


// Converts 2D canvas coordinates to 3D viewport coordinates.
const CanvasToViewport = function(p2d) {
  return [p2d[0] * viewport_size / canvas.width,
      p2d[1] * viewport_size / canvas.height,
      projection_plane_z];
}


// Computes the intersection of a ray and a sphere. Returns the values
// of t for the intersections.
const IntersectRaySphere = function(origin, direction, sphere) {
  let oc = Subtract(origin, sphere.center);

  let k1 = DotProduct(direction, direction);
  let k2 = 2*DotProduct(oc, direction);
  let k3 = DotProduct(oc, oc) - sphere.radius*sphere.radius;

  let discriminant = k2*k2 - 4*k1*k3;
  if (discriminant < 0) {
    return [Infinity, Infinity];
  }

  let t1 = (-k2 + Math.sqrt(discriminant)) / (2*k1);
  let t2 = (-k2 - Math.sqrt(discriminant)) / (2*k1);
  return [t1, t2];
}


// Traces a ray against the set of spheres in the scene.
const TraceRay = function(origin, direction, min_t, max_t) {
  let closest_t = Infinity;
  let closest_sphere = null;
  let spheres = getSpheres();
  for (let i = 0; i < spheres.length; i++) {
    let ts = IntersectRaySphere(origin, direction, spheres[i]);
    if (ts[0] < closest_t && min_t < ts[0] && ts[0] < max_t) {
      closest_t = ts[0];
      closest_sphere = spheres[i];
    }
    if (ts[1] < closest_t && min_t < ts[1] && ts[1] < max_t) {
      closest_t = ts[1];
      closest_sphere = spheres[i];
    }
  }

  if (closest_sphere == null) {
    return background_color;
  }

  return closest_sphere.color;
}


//
// Main loop.
//
// setInterval(Main, 1);

function Main () {
  for (let x = -canvas.width/2; x < canvas.width/2; x++) {
    for (let y = -canvas.height/2; y < canvas.height/2; y++) {
      let direction = CanvasToViewport([x, y])
      let color = TraceRay(camera_position, direction, 1, Infinity);
      PutPixel(x, y, color);
    }
  }
  UpdateCanvas();
}

Main();

window.addEventListener("keyup", function (e) {
  if (e.key === "PageUp") {
    spheres[0].center[2] -= 0.2*(-1);
    Main();
  } else if (e.key === "w") {
    spheres[0].center[1] -= 0.2*(-1);
    Main();
  } else if (e.key === "PageDown") {
    spheres[0].center[2] += 0.2*(-1);
    Main();
  } else if (e.key === "s") {
    spheres[0].center[1] += 0.2*(-1);
    Main();
  } else if (e.key === "a") {
    spheres[0].center[0] += 0.2*(-1);
    Main();
  } else if (e.key === "d") {
    spheres[0].center[0] -= 0.2*(-1);
    Main();
  }
});

