

// ======================================================================
//  Low-level canvas access.
// ======================================================================

let canvas = document.getElementById("canvas");
let canvas_context = canvas.getContext("2d");
let canvas_buffer = canvas_context.getImageData(0, 0, canvas.width, canvas.height);
let canvas_pitch = canvas_buffer.width * 4;


// The PutPixel() function.
let PutPixel = function (x, y, color) {
  x = canvas.width / 2 + x;
  y = canvas.height / 2 - y - 1;

  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
    return;
  }

  let offset = 4 * x + canvas_pitch * y;
  canvas_buffer.data[offset++] = color[0];
  canvas_buffer.data[offset++] = color[1];
  canvas_buffer.data[offset++] = color[2];
  canvas_buffer.data[offset++] = 255; // Alpha = 255 (full opacity)
}


// Displays the contents of the offscreen buffer into the canvas.
let UpdateCanvas = function () {
  canvas_context.putImageData(canvas_buffer, 0, 0);
}


let ClearAll = function () {
  canvas.width = canvas.width;
}


// ======================================================================
//  Linear algebra and helpers.
// ======================================================================

// Conceptually, an "infinitesimaly small" real number.
let EPSILON = 0.0001;

// Dot product of two 3D vectors.
let DotProduct = function (v1, v2) {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}


// Length of a 3D vector.
let Length = function (vec) {
  return Math.sqrt(DotProduct(vec, vec));
}


// Computes k * vec.
let Multiply = function (k, vec) {
  return [k * vec[0], k * vec[1], k * vec[2]];
}


// Computes v1 + v2.
let Add = function (v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}


// Computes v1 - v2.
let Subtract = function (v1, v2) {
  return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}


// Clamps a color to the canonical color range.
let Clamp = function (vec) {
  return [Math.min(255, Math.max(0, vec[0])),
  Math.min(255, Math.max(0, vec[1])),
  Math.min(255, Math.max(0, vec[2]))];
}


// Computes the reflection of v1 respect to v2.
let ReflectRay = function (v1, v2) {
  return Subtract(Multiply(2 * DotProduct(v1, v2), v2), v1);
}


// ======================================================================
//  A raytracer with diffuse and specular illumination, shadows and reflections.
// ======================================================================

// A Sphere.
let Sphere = function (center, radius, color, specular, reflective) {
  this.center = center;
  this.radius = radius;
  this.color = color;
  this.specular = specular;
  this.reflective = reflective;
}

// A Light.
let Light = function (ltype, intensity, position) {
  this.ltype = ltype;
  this.intensity = intensity;
  this.position = position;
}

Light.AMBIENT = 0;
Light.POINT = 1;
Light.DIRECTIONAL = 2;

// Scene setup.
let viewport_size = 1;
let projection_plane_z = 1;
let camera_position = [0, 0, 0];
let background_color = [200, 200, 200];
let spheres = [new Sphere([0, -1, 3], 1, [255, 0, 0], 50, 0.2),
new Sphere([-2, 0, 4], 1, [0, 255, 0], 10, 0.4),
new Sphere([2, 0, 4], 1, [0, 0, 255], 500, 0.3),
new Sphere([0, -5001, 0], 5000, [255, 255, 0], 700, 0.1)];

let lights = [
  new Light(Light.AMBIENT, 0.2),
  new Light(Light.POINT, 0.6, [2, 1, 0]),
  new Light(Light.DIRECTIONAL, 0.2, [1, 4, 4])
];

let recursion_depth = 100;

let updateRecursionLimit = function () {
  let v = document.getElementById("rec-limit").value | 0;
  if (v < 0) {
    v = 0;
  }
  if (v > 5) {
    v = 5;
  }
  document.getElementById("rec-limit").value = v;

  if (recursion_depth != v) {
    recursion_depth = v;
    Render();
  }
}

// Converts 2D canvas coordinates to 3D viewport coordinates.
let CanvasToViewport = function (p2d) {
  return [p2d[0] * viewport_size / canvas.width,
  p2d[1] * viewport_size / canvas.height,
    projection_plane_z];
}

// Computes the intersection of a ray and a sphere. Returns the values
// of t for the intersections.
let IntersectRaySphere = function (origin, direction, sphere) {
  let oc = Subtract(origin, sphere.center);

  let k1 = DotProduct(direction, direction);
  let k2 = 2 * DotProduct(oc, direction);
  let k3 = DotProduct(oc, oc) - sphere.radius * sphere.radius;

  let discriminant = k2 * k2 - 4 * k1 * k3;
  if (discriminant < 0) {
    return [Infinity, Infinity];
  }

  let t1 = (-k2 + Math.sqrt(discriminant)) / (2 * k1);
  let t2 = (-k2 - Math.sqrt(discriminant)) / (2 * k1);
  return [t1, t2];
}


let ComputeLighting = function (point, normal, view, specular) {
  let intensity = 0;
  let length_n = Length(normal);  // Should be 1.0, but just in case...
  let length_v = Length(view);

  for (let i = 0; i < lights.length; i++) {
    let light = lights[i];
    if (light.ltype == Light.AMBIENT) {
      intensity += light.intensity;
    } else {
      let vec_l, t_max;
      if (light.ltype == Light.POINT) {
        vec_l = Subtract(light.position, point);
        t_max = 1.0;
      } else {  // Light.DIRECTIONAL
        vec_l = light.position;
        t_max = Infinity;
      }

      // Shadow check.
      let blocker = ClosestIntersection(point, vec_l, EPSILON, t_max);
      if (blocker) {
        continue;
      }

      // Diffuse reflection.
      let n_dot_l = DotProduct(normal, vec_l);
      if (n_dot_l > 0) {
        intensity += light.intensity * n_dot_l / (length_n * Length(vec_l));
      }

      // Specular reflection.
      if (specular != -1) {
        let vec_r = ReflectRay(vec_l, normal);
        let r_dot_v = DotProduct(vec_r, view);
        if (r_dot_v > 0) {
          intensity += light.intensity * Math.pow(r_dot_v / (Length(vec_r) * length_v), specular);
        }
      }
    }
  }

  return intensity;
}


// Find the closest intersection between a ray and the spheres in the scene.
let ClosestIntersection = function (origin, direction, min_t, max_t) {
  let closest_t = Infinity;
  let closest_sphere = null;

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

  if (closest_sphere) {
    return [closest_sphere, closest_t];
  }
  return null;
}


// Traces a ray against the set of spheres in the scene.
let TraceRay = function (origin, direction, min_t, max_t, depth) {
  let intersection = ClosestIntersection(origin, direction, min_t, max_t);
  if (!intersection) {
    return background_color;
  }

  let closest_sphere = intersection[0];
  let closest_t = intersection[1];

  let point = Add(origin, Multiply(closest_t, direction));
  let normal = Subtract(point, closest_sphere.center);
  normal = Multiply(1.0 / Length(normal), normal);

  let view = Multiply(-1, direction);
  let lighting = ComputeLighting(point, normal, view, closest_sphere.specular);
  let local_color = Multiply(lighting, closest_sphere.color);

  if (closest_sphere.reflective <= 0 || depth <= 0) {
    return local_color;
  }

  let reflected_ray = ReflectRay(view, normal);
  let reflected_color = TraceRay(point, reflected_ray, EPSILON, Infinity, depth - 1);

  return Add(Multiply(1 - closest_sphere.reflective, local_color),
    Multiply(closest_sphere.reflective, reflected_color));
}

let Render = function () {
  ClearAll();

  // Main loop.
  for (let x = -canvas.width / 2; x < canvas.width / 2; x++) {
    for (let y = -canvas.height / 2; y < canvas.height / 2; y++) {
      let direction = CanvasToViewport([x, y])
      let color = TraceRay(camera_position, direction, 1, Infinity, recursion_depth);
      PutPixel(x, y, Clamp(color));
    }
  }

  UpdateCanvas();
}

// setInterval(function () {
//   spheres[0].center[2] -= 0.2 * (-1);
// }, 500);

Render();

//
// Main loop, uncomment for automatic movement of sphere
//
// setInterval(Render, 1);

// keypress listener for red sphere movement. 
window.addEventListener("keyup", function (e) {
  let keypress = e.key;
  switch (keypress) {
    case "w":
      spheres[0].center[1] -= 0.2 * (-1);
      break;
    case "a":
      spheres[0].center[0] += 0.2 * (-1);
      break;
    case "s":
      spheres[0].center[1] += 0.2 * (-1);
      break;
    case "d":
      spheres[0].center[0] -= 0.2 * (-1);
      break;
    case "PageDown":
      spheres[0].center[2] += 0.2 * (-1);
      break;
    case "PageUp":
      spheres[0].center[2] -= 0.2 * (-1);
      break;
    default:
      break;
  }
  Render();
});

