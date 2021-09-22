let DotProduct = function (v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
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

// Length of a 3D vector.
let Length = function (vec) {
    return Math.sqrt(DotProduct(vec, vec));
  }
  
// Computes v1 - v2.
let Subtract = function (v1, v2) {
  return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

let ComputeLighting = function (lights, point, normal, view, specular) {
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