
precision highp float;
uniform float iTime;
uniform vec2 iMouse;
uniform vec2 iResolution;

float time = iTime / 4.0;

void mainImage( out vec4 c, vec2 p ) {

    // set position
    vec2 v = iResolution.xy;
    p = (p-v*.5)*.4 / v.y;
    // breathing effect
    p += p * sin(dot(p, p)*20.-time) * .04;
    
    // accumulate color
    c *= 0.;
    for (float i = .5 ; i < 8. ; i++)
        
        // fractal formula and rotation
        p = abs(2.*fract(p-.5)-1.) * mat2(cos(.01*(time+iMouse.x*.1)*i*i + .78*vec4(1,7,3,1))),
        
        // coloration
        c += exp(-abs(p.y)*5.) * (cos(vec4(2,3,1,0)*i)*.5+.5);
        
    
    
    // palette
    c.gb *= .5;
    
}

void main(void) {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
