//
// Des plantes et des globules verts qui flottent dans un ciel bleu
//

precision highp float;
uniform float iTime;
uniform vec2 iMouse;
uniform vec2 iResolution;

// hash without sine: https://www.shadertoy.com/view/4djSRW
vec3 hash32(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(443.8975, 397.2973, 491.1871));
    p3 += dot(p3, p3.yxz+19.19);
    return fract(vec3((p3.x+p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}

// Some complex functions are from: https://raw.githubusercontent.com/julesb/glsl-util/master/complexvisual.glsl
#define E 2.7182818284590452353602874713527
#ifndef sinh
    #define sinh(a) (pow(E, a)-pow(E, -a)) / 2.
#endif
#ifndef cosh
    #define cosh(a) (pow(E, a)+pow(E, -a)) / 2.
#endif

// for the hill shapes
float Fractal(vec2 p, vec2 off, float l, float L) {
    // 'unroll' p horizontally (complex exp)
    p = vec2(exp(-p.y)*cos(p.x), exp(-p.y)*sin(p.x));// + vec2(.1*sin(.2*iTime), .1*cos(.2*iTime));
    
    // a bit of complex sine for variation
    p *= .831;
    p = .05 + vec2(sin(p.x)*cosh(p.y), cos(p.x)*sinh(p.y));
    
    // iterate
    for (int i = 0; i < 5; i++) {
        // standard Julia
        p = vec2(p.x*p.x-p.y*p.y, 2.*p.x*p.y) - off;
        
        // pinned inversion
        p = p / dot(p, p) + vec2(-.000085, 0.);
        p = p / dot(p, p);
    }

    return length(p) + p.x / 1.05; // + p.y * .25;
}

void main( void ) {
    vec2 res = iResolution.xy;
    vec2 p = (gl_FragCoord.xy-res/2.) / res.y;
    float t = .05 * iTime;
    
    // shift everything down a tad
    p.y += .1;
    
    // original p
    vec2 op = p;
    
    // shift camera
    vec2 offs = vec2(.33 * t, .3+.2*sin(.178*t)) + (iMouse.xy-.5); // panning
    
    // sun pos
    vec2 spos = vec2(.67, 0.)-p;
    
    // background
    vec3 bg =
        mix(
            // sun
            vec3(1.7, 1.3, 1.),
            // fog & sky
            mix(
                vec3(1.),
                vec3(.3, .5, 1.),
                clamp(p.y+.4, 0., 1.)
            ),
            // sun shape and position
            .3 + .5 * length(p-spos)
        );
    
    // initial color
    vec3 col = bg;
    
    // number of layers
    const float L = 9.;
    
    // hill layers
    for (float l = 1.; l < L; l++) {
        // original p
        p = op;
        
        // scale layer
        p /= pow(2., l) / 10. / L;
    
        // scrolling and panning
        p += offs;
        
        // move horizontally at each layer
        p.x += 1.7 * l;
        
        // hill shape
        float fr = clamp(-2.+.005*Fractal(p, vec2(1., fract(-l*.25)), l, L), 0., 1.);
    
        // mix col with bg & previous layers
        col =
            mix(
                col,
                // mix bg with hill color
                mix(
                    bg,
                    // mix in ground fog 
                    mix(
                        bg, // fog color
                        vec3(.1, .5, .1) - .4 * fr + .1, // hill color
                        clamp((p.y+4.)/4., 0., 1.)
                    ),
                    (l-.5)/L
                    //1.-exp(-(l-.5)/L)
                ),
                min(1., fr/.1)
            );
            
        // general movement of motes
        p += t * vec2(.5, .15);
        
        // scrolling and panning / 2.0 (makes them appear to exist between hill layers when mousing)
        p += .5 * offs;
        
        // hash for motes
        vec3 rnd = hash32(floor(p));
        
        // set mote size
        rnd.z = mix(.02, .25, rnd.z);
        
        // set mote position within its cell
        rnd.xy =
            .5 + (.5-rnd.z) * vec2(
                cos(.9*t+7.*rnd.x),
                sin(.7*t+5.*rnd.y)
            );
        
        // mix col with motes
        col =
            mix(
                col,
                mix(
                    bg,
                    // mote color and shading
                    //vec3(.8, 1., .7) - .65 * smoothstep(0., 1., 1.-length(fract(p+.2*rnd.z)-rnd.xy)/rnd.z),
                    vec3(.8, 1., .7) - .65 * smoothstep(0., 1., 1.-length(fract(p+.33*spos*rnd.z)-rnd.xy)/rnd.z),
                    l/L
                ),
                min(1., rnd.z * 7. * smoothstep(0., 1., 1.-length(fract(p)-rnd.xy)/rnd.z))
            );
    }
    
    gl_FragColor = vec4(col, 1.);
}
