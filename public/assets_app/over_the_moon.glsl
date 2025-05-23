//Art of Code tutorial link https://youtu.be/XaiYKkxvrFM?si=yruWyBn7NrV_c8H5 
# define S(a, b, t) smoothstep(a, b, t)

precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;


float TaperBox(vec2 p, float wb, float wt, float yb, float yt, float blur) {
    float m = S(-blur, blur, p.y - yb);
    m *= S(blur, -blur, p.y - yt);
    
    p.x = abs(p.x);
    
    float w = mix(wb, wt, (p.y - yb)/(yt - yb));
    m *= S(blur, -blur, p.x - w);
    
    return m;
}

vec4 Tree(vec2 uv, vec3 col, float blur) {

    float m = TaperBox(uv, .03, .03, -.05, .25, blur); // trunk
    m += TaperBox(uv, .2, .1, .25, .5, blur); //canopy 1
    m += TaperBox(uv, .15, .05, .5, .75, blur); //canopy 2
    m += TaperBox(uv, .1, .0, .75, 1., blur); //top
    
    float shadow = TaperBox(uv-vec2(.2,0), .1, .5, .15, .25, blur);
    shadow += TaperBox(uv+vec2(.25,0), .1, .5, .45, .5, blur);
    shadow += TaperBox(uv-vec2(.3,0), .1, .5, .7, .75, blur);
    col -= shadow*.8;
    
    return vec4(col, m);
}

float GetHeight(float x) {

    return sin(x*.457)+ sin(x)*.35;
}

vec4 Layer(vec2 uv, float blur) {
    vec4 col = vec4(0);  
    float id = floor(uv.x);   
    float n = fract(sin(id*255.27)*4762.7)*2.-1.;
    float x = n*.3;
    float y = GetHeight(uv.x);
    float ground = S(blur, -blur, uv.y+y); 
    col += ground;
    y = GetHeight(id+.5+x);
    
    uv.x = fract(uv.x)-.5;
    
    
    vec4 tree = Tree((uv -vec2(x,-y)) * vec2(1., 1.+n*.2), vec3(1), blur);
    
    col = mix(col, tree, tree.a);
    col.a = max(ground, tree.a);
    
    return col;
}

float Hash21(vec2 p){
    p = fract(p*vec2(536.21, 371.12));
    p += dot(p, p+632.21);
    return fract(p.x*p.y);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord-.5*iResolution.xy)/iResolution.y;
    uv.y   -= .1;
    vec2 M = (iMouse.xy - iResolution.xy)/iResolution.y*2.-1.;
    float t = iTime * .3;
    float blur = .005;

    float twinkle = dot(length(sin(uv+t)), length(cos(uv*vec2(22, 6.7))-t*2.));
    twinkle = sin(twinkle*10.)*.5+.5;
    float stars = pow(Hash21(uv),100.)*twinkle;
    vec4 col = vec4(stars);
    
    float moon = S(.01, -.01, length(uv-vec2(.4,.2))-.15);
    col*= 1.-moon;
    moon *= S(-.01, .1, length(uv-vec2(.5,.25))-.15);

    col += moon;
    
    vec4 layer;
    
    for(float i = 0.; i<1.; i +=1./10.){
        float scale = mix(30., 1., i);
        blur = mix(.1, .005, i);
        layer = Layer(uv*scale+vec2(t+i*55.,i)-M,blur);
        layer.rgb *= (1.-i)*vec3(.9,.9,1.);
        col = mix(col, layer, layer.a);
    }
    
    layer = Layer(uv+vec2(t,0)-M,.1);
    col = mix(col, layer*.1, layer.a);
    

    fragColor = col;
}

void main(void) {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
