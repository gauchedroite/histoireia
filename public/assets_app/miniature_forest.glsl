//SHAKE==1: shake trees.
#define SHAKE 0

precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;


const float PI = 3.14159;

float hash(float n){return fract(sin(n) * 43758.5453123);}
float hash(vec2 p) {
    float f = p.x * 31. + p.y * 37.;
    return fract(sin(f)*33.4);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);	
	vec2 u = f*f*(3.0-2.0*f);
    // return -1.0+2.0*mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
    //             mix( hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d){
    return a + b*cos(c*t+d);//PI*2.*(c*t+d)
}
mat2 rotate2D(float r){
    float c = cos(r);
    float s = sin(r);
    return mat2(c, s, -s, c);
}
vec2 TF(vec2 p, float t, float i) {
    p.x = abs(p.x) - sin(t * i * 3.) * 0.03;
    p = p - 0.2;
    p.x -= 0.2;
    p *= rotate2D(-PI / (5.0 + sin(t * i * 2.) * 3.));
    return p;
}

vec3 tree(vec2 p, float t, vec2 id){
    
    vec3 col = vec3(0);

    for(float k=-1.;k<=1.;k+=1.){
        for(float j=-1.;j<=1.;j+=1.){
            float scale = 1.;
            vec2 offset = vec2(k, j);
            float r = hash(id + offset);
            vec2 uv = p - offset - vec2(r, fract(r*11.4)) + .5;

            //grass
            vec2 st = uv;
            st = fract(st*vec2(5,3))-.5;
            st.y +=.5;
            st *= rotate2D(st.y+sin(t*2.)*.3);//rotate2D(PI/4.);
            st.y -=.5;
            float g = smoothstep(0.07, .0, length(st - vec2(0, clamp(st.y, -.5, .3*r))));
            col += vec3(g*.05, g*.2, g*.1);
            st.y +=.5;
            st *= rotate2D(-st.y*2.+sin(t*2.)*.3);//rotate2D(-PI/2.);
            st.y -=.5;
            g = smoothstep(0.07, .0, length(st - vec2(0., clamp(st.y, -.5, .3*r))));
            col += vec3(g*.05, g*.2, g*.1);


            float red = 0.2 + fract(r*45.6) * .8;
            float green = 0.2 + fract(r*34.5) * .8;

            vec4 tcol = vec4(0);
            uv *= 1.5+fract(r*51.)*2.;
            float fade = 1.5 - fract(r*51.);

            float d = smoothstep(0.1 / scale, .0, length(uv - vec2(0., clamp(uv.y, -0.8, -0.3 / scale))));
            tcol += vec4(d*.5, d*.3, d*.1, d) * fade;
            for(float i=0.;i<7.;++i){
            
                #if SHAKE == 1
                uv+=.3*scale;
                uv*=rotate2D(sin(i+t*5.+r*11.2+uv.y*2.)*(fract(i*r*8.12)-.5)*.4);
                uv-=.3*scale;
                #endif
                
                uv *= 1.3;
                uv = TF(uv, t + fract(r*33.4), i);
                scale *= 1.3;
                d = smoothstep(0.1 / scale, .0, length(uv - vec2(0., clamp(uv.y, -1.5, 0.05 / scale))));
                tcol += vec4(d*.5, d*.3, d*.1, d) * .5 * fade;

                d = smoothstep(.3, 0., length(uv - vec2(0., 0.1 / scale)));
                tcol += vec4(d*red, d*green, d*.1, d) * fade;
            }
            d = smoothstep(.5, 0., length(uv - vec2(0., 0.1 / scale)));
            tcol += vec4(d*red, d*green, d*.2, d) * fade;

            col = mix(col, tcol.rgb, tcol.a);
        }
    }
    
    return col;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){

    vec2 uv = 2.0 * (fragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.y, iResolution.x);

    vec3 col = vec3(0);
    
    float t = iTime * .5;
    uv.y += t * .2;
    
    
    vec2 bx = fract(uv * 3.5) - 0.5;
    vec2 id = floor(uv * 3.5);

    col = tree(bx, t, id);
    if(all(equal(col,vec3(0)))){
        col = vec3(noise(uv*5.)*.3,noise(uv*5.+3.)*.3+.1,.0);
    }
    
    fragColor = vec4(col,1.0);
}

void main(void) {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}