precision highp float;
uniform float iTime;
uniform vec2 iMouse;
uniform vec2 iResolution;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy * 2.;
    uv.x *= 1.5;
    
    // Reference to uv's length:
    float len = length(uv);
    
    // Ripple effect:
    vec3 col = texture(iChannel0, uv + len * cos(len * 10. - iTime) * 0.15).rgb;
    
    // Turn slightly blue:
    col.b = col.b + 0.2;
    
    // Output to screen
    fragColor = vec4(col, 1.0);
}

void main(void) {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
