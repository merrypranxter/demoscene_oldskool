#version 300 es
// post-process.frag — CRT chunk: scanlines, faint vignette, tiny aberration.
// the chunky is the right. the smooth is the wrong. the 90s are chunky.

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uScene;
uniform vec2  uResolution;
uniform float uScanlines;   // 1.0 = on

void main() {
    vec2 uv = vUv;

    vec3 col = texture(uScene, uv).rgb;

    if (uScanlines > 0.5) {
        // dark horizontal lines riding the vertical resolution
        float line = sin(uv.y * uResolution.y * 3.14159265) * 0.5 + 0.5;
        float scan = mix(0.82, 1.0, line);
        col *= scan;

        // gentle vignette — the tube is round. the round is the warmth.
        vec2 d = uv - 0.5;
        float vig = smoothstep(0.95, 0.45, length(d));
        col *= mix(0.78, 1.0, vig);
    }

    fragColor = vec4(col, 1.0);
}
