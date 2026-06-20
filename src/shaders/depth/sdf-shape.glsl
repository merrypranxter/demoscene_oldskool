// sdf-shape — render an SDF (sphere, torus, glyph) as a depth map.
// the shape is the secret. the secret is the depth. the depth is the magic.
//
// Provides: float getDepth(vec2 uv) -> z in [0,1], 0 = far, 1 = near.
// Inputs available from depth.frag: uTime, uAnimate, uAspect.

// signed distance to a 2D disc (becomes a sphere bump when shaded as depth)
float sdSphere2D(vec2 p, float r) {
    return length(p) - r;
}

// signed distance to a 2D torus ring
float sdRing(vec2 p, float r, float w) {
    return abs(length(p) - r) - w;
}

// crude block-glyph: an "eye" — a lens with a pupil. the eye is the brain.
float sdEye(vec2 p) {
    // lens: intersection of two discs
    float d1 = length(p - vec2(0.0, -0.55)) - 0.85;
    float d2 = length(p - vec2(0.0,  0.55)) - 0.85;
    float lens = max(d1, d2);
    float pupil = length(p) - 0.22;
    return max(lens, -pupil); // carve the pupil out
}

float getDepth(vec2 uv) {
    // center & aspect-correct to [-1,1]-ish
    vec2 p = (uv - 0.5) * 2.0;
    p.x *= uAspect;

    float pulse = uAnimate > 0.5 ? (0.85 + 0.15 * sin(uTime * 1.6)) : 1.0;

    // compose three secrets, pick the nearest (max depth)
    float sphere = sdSphere2D(p, 0.55 * pulse);
    float ring   = sdRing(p + vec2(0.0, 0.0), 0.78, 0.10);
    float eye    = sdEye(p * 1.15);

    // turn distance into smooth rounded depth bumps
    float zSphere = smoothstep(0.0, -0.55, sphere) * sqrt(max(0.0, 0.30 - sphere)); // domed
    float zRing   = smoothstep(0.02, -0.02, ring) * 0.7;
    float zEye    = smoothstep(0.02, -0.10, eye) * 0.9;

    // dome the sphere properly: height = sqrt(r^2 - d^2)
    float r = 0.55 * pulse;
    float dome = r * r - dot(p, p);
    zSphere = dome > 0.0 ? sqrt(dome) / r : 0.0;

    float z = max(zSphere * 0.95, max(zRing, zEye));
    return clamp(z, 0.0, 1.0);
}
