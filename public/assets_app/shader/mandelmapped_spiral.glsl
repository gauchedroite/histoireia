
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;

// CC0: Quick thursday hack
//  Combination of spirals and mandelbrot domain mapping

#define RESOLUTION  iResolution
//#define TIME        iTime
#define PI          3.141592654
#define TAU         (2.0*PI)
#define ROT(a)      mat2(cos(a), sin(a), -sin(a), cos(a))

float TIME = iTime / 5.0;

const vec4 hsv2rgb_K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
// License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
  return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
}

// License: Unknown, author: nmz (twitter: @stormoid), found: https://www.shadertoy.com/view/NdfyRM
float sRGB(float t) { return mix(1.055*pow(t, 1./2.4) - 0.055, 12.92*t, step(t, 0.0031308)); }
// License: Unknown, author: nmz (twitter: @stormoid), found: https://www.shadertoy.com/view/NdfyRM
vec3 sRGB(in vec3 c) { return vec3 (sRGB(c.x), sRGB(c.y), sRGB(c.z)); }

// License: MIT, author: Inigo Quilez, found: https://iquilezles.org/articles/smin
float pmin(float a, float b, float k) {
  float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}

// License: MIT OR CC-BY-NC-4.0, author: mercury, found: https://mercury.sexy/hg_sdf/
vec2 mod2(inout vec2 p, vec2 size) {
  vec2 c = floor((p + size*0.5)/size);
  p = mod(p + size*0.5,size) - size*0.5;
  return c;
}

// License: Unknown, author: Unknown, found: don't remember
float tanh_approx(float x) {
  //  Found this somewhere on the interwebs
  //  return tanh(x);
  float x2 = x*x;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

vec2 toPolar(vec2 p) {
  return vec2(length(p), atan(p.y, p.x)+PI);
}

vec2 spiralEffect(vec2 p, float a, float n) {
  vec2 op = p;
  float b = a/TAU;
  vec2 pp   = toPolar(op);
  float  aa = pp.y;
  pp        -= vec2(pp.y*n*b, (pp.x/b+PI)/n);
  vec2  nn  = mod2(pp, vec2(a, TAU/n));
  // Yes, this is a trial and error:ed until it looked good 
  // because I couldn't be bothered to compute the real solution
  float xf  = tanh_approx(20.0*length(p)/abs(n));
  return vec2(abs(pp.x)*xf, mod(nn.y, n));
}

float julia_map(inout vec2 p, vec2 c) {
  float s = 1.0;
  // Mandelbrot
  p.x -= 0.5;
  c = p;
  const int JULIA_ITERATIONS = 24;
  for (int i = 0; i < JULIA_ITERATIONS; ++i) {
    // Turns out this is the classic julia loop after all. 
    // Oh well :)
    vec2 p2 = p*p;
    p = vec2(p2.x-p2.y, 2.0*p.x*p.y);
    p += c;
    s *= 1.9; // Mindless fine tuning at its best
    s *= sqrt(p2.x+p2.y);
  }
  
  return 1.0/s;
}

vec3 df(vec2 p) {
  vec2 c0 = vec2(-0.7440, .0148);
  vec2 c1 = 0.85*vec2(-0.45, 0.75);
  vec2 c = mix(c0, c1, smoothstep(-1.0, 1.0, sin(0.5*TIME)));
  float js = julia_map(p, c);
  
  float cd = -(length(p) - 2.0)*js;

  const float z = 0.25;
  p /= z;
  
  float a = 0.5;
  float sp0 = 11.0;
  float sp1 = -3.0;
  vec2 se0 = spiralEffect(p*ROT(-0.123*TIME), a, sp0);
  vec2 se1 = spiralEffect(p*ROT(.1*TIME), a, sp1);
  
  vec2 se = vec2(pmin(se0.x, se1.x, 0.125), se0.y+se1.y);
  
  float h = se.y*0.05+TIME*0.2;
  float d = -((se.x)-0.05);
  d *= z*js;

  return vec3(d, cd, h);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  float aa = 2.0/RESOLUTION.y;
  vec2 q  = 1.0 - fragCoord/iResolution.xy;
  q.x -= 0.2;
  vec2 p  = -1. + 2. * q;
  p.x     *= RESOLUTION.x/RESOLUTION.y;
  vec3 d3 = df(p);
  float d = d3.x;
  float cd= d3.y;
  float h = d3.z;
  float s = smoothstep(aa, -aa, d);
  vec3 col = vec3(0.0);
  
  col = hsv2rgb(vec3(fract(h), 0.95, s));
  col = mix(col, vec3(0.0), smoothstep(aa, -aa, cd));
  col = sRGB(col);
  fragColor = vec4(col, 1.0);
}

void main(void) {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
