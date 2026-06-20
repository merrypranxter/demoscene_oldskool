#version 300 es
// depth.frag — render the depth map z(x,y) in [0,1] into an FBO.
// the depth is the secret. the secret is the shape. the shape is the world.
//
// At build time main.js prepends ONE of src/shaders/depth/*.glsl, which must
// define:  float getDepth(vec2 uv);
// The marker line below is replaced with the chosen engine source.

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uAnimate;   // 1.0 = animate, 0.0 = static
uniform float uAspect;    // width / height

//__DEPTH_ENGINE__

void main() {
    float z = getDepth(vUv);
    // store depth in all channels; alpha=1. the channel is the secret.
    fragColor = vec4(vec3(z), 1.0);
}
