/*
#version 300 es
in vec4 a_position;
void main() {
    gl_Position = a_position;
}
*/

attribute vec3 a_square;
void main() {
    gl_Position = vec4(a_square, 1.0);
}

