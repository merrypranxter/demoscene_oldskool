// raymarch-depth — depth channel of a raymarched 3D scene.
// the scene is the world. the world is the depth. the depth is the magic.
//
// Provides: float getDepth(vec2 uv) -> z in [0,1], 0 = far, 1 = near.

float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// smooth union — blobs that melt together. the blend is the breath.
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float map(vec3 p) {
    float t = uTime * (uAnimate > 0.5 ? 1.0 : 0.0);
    vec3 q = p;
    q.xz = rot2(t * 0.5) * q.xz;
    q.xy = rot2(t * 0.3) * q.xy;
    float torus = sdTorus(q, vec2(1.0, 0.38));
    float sph   = sdSphere(p - vec3(0.0, sin(t) * 0.4, 0.0), 0.55);
    float box   = sdBox(q, vec3(0.35));
    float d = smin(torus, sph, 0.4);
    d = smin(d, box, 0.3);
    return d;
}

float getDepth(vec2 uv) {
    vec2 p = (uv - 0.5) * 2.0;
    p.x *= uAspect;

    vec3 ro = vec3(0.0, 0.0, -3.2);            // camera
    vec3 rd = normalize(vec3(p, 1.6));         // ray dir

    float tNear = 1.5, tFar = 5.5;             // depth window
    float dist = 0.0;
    bool hit = false;
    for (int i = 0; i < 80; i++) {
        vec3 pos = ro + rd * dist;
        float d = map(pos);
        if (d < 0.001) { hit = true; break; }
        dist += d;
        if (dist > tFar + 1.0) break;
    }
    if (!hit) return 0.0;
    // closer hit -> larger z. map [tNear,tFar] -> [1,0]
    float z = 1.0 - clamp((dist - tNear) / (tFar - tNear), 0.0, 1.0);
    return z;
}
