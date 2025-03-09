/*
Note: to convert ShaderToy shaders to WebglRunner

Add at the top:
    precision highp float;
    uniform float iTime;
    uniform vec2 iMouse;
    uniform vec2 iResolution;

Add at the end:
    void main(void) {
        mainImage(gl_FragColor, gl_FragCoord.xy);
    }
*/
export default class WebglRunner {
    _pause = false;
    _paused = 0;
    _startPause = 0;

    constructor() {
    }

    pause = () => {
        if (!this._pause) {
            this._pause = true;
            this._startPause = performance.now();
        }
    }

    resume = () => {
        if (this._pause) {
            this._pause = false;
            this._paused += performance.now() - this._startPause;
        }
    }
    
    run = (canvas: HTMLCanvasElement, fstext: string, vstext: string, imagepath?: string) => {
        // Get context
        var gl = <WebGLRenderingContext>canvas.getContext("webgl", { preserveDrawingBuffer: true });
        if (!gl)
            return alert("Your web browser does not support WebGL");

        // Some ShaderToy shaders require the following directive at the top of the shader
        // and the getExtension() call in js
        // #extension GL_OES_standard_derivatives : enable
        gl.getExtension('OES_standard_derivatives');

        // Create the program
        var prog = gl.createProgram()!;

        // Attach the vertex shader
        var vs = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vs, vstext);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS))
            return console.log("Could not compile vertex shader: "+ gl.getShaderInfoLog(vs));
        gl.attachShader(prog, vs);

        // Attach the fragment shader
        var fs = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fs, fstext);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS))
            return console.log("Could not compile fragment shader: "+ gl.getShaderInfoLog(fs));
        gl.attachShader(prog, fs);

        // Link and then use the program
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
            return console.log("Could not link the shader program");
        gl.useProgram(prog);

        // Lookup uniforms
        var u_resolution = gl.getUniformLocation(prog, "iResolution");
        var u_time = gl.getUniformLocation(prog, "iTime");
        var u_mouse = gl.getUniformLocation(prog, "iMouse");
        var u_channel0: WebGLUniformLocation | null;

        let texture: WebGLTexture | undefined;
        if (imagepath) {
            texture = this.initializeTexture(gl, imagepath)
            gl.bindTexture(gl.TEXTURE_2D, texture);
            u_channel0 = gl.getUniformLocation(prog, "iChannel0");
        }

        // Populate the geometry in the buffer
        var arr = [
            -1, 1, 0,
            1, 1, 0,
            -1, -1, 0,
            1, -1, 0
        ];
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);

        // Map the "a_square" attribute to the buffer
        var a_square = gl.getAttribLocation(prog, "a_square");
        gl.enableVertexAttribArray(a_square);
        gl.vertexAttribPointer(a_square, 3, gl.FLOAT, false, 0, 0);

        // Start the draw loop
        var me = this;
        requestAnimationFrame(drawScene);

        // Draw scene
        function drawScene(now: number) {
            if (me._pause) {
                requestAnimationFrame(drawScene);
                return;
            }

            // Resize canvas
            var canvas = gl.canvas;
            var displayWidth  = (canvas as HTMLElement).clientWidth;
            var displayHeight = (canvas as HTMLElement).clientHeight;

            // Make canvas the same size and set the viewport to match
            if (canvas.width != displayWidth || canvas.height != displayHeight) {
                canvas.width  = displayWidth;
                canvas.height = displayHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }

            // Clear canvas
            gl.clearColor(0, 0, 0, 0.2);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Set the resolution, time, and mouse uniforms
            gl.uniform2f(u_resolution, gl.canvas.width, gl.canvas.height);
            gl.uniform1f(u_time, (now - me._paused) * 0.001);
            gl.uniform2f(u_mouse, 0, 0.95);

            // Set the texture uniform
            if (texture != undefined) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.uniform1i(u_channel0, 0);
            }

            // Draw the geometry
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            requestAnimationFrame(drawScene);
        };
    }

    private initializeTexture = (gl: WebGLRenderingContext, imageUrl: string) => {
        // Create a texture object
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
    
        // Fill the texture with a single blue pixel as placeholder
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]);  // Opaque blue placeholder
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                      width, height, border, srcFormat, srcType,
                      pixel);
    
        // Load the actual image
        const image = new Image();
        image.src = imageUrl;
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
            gl.generateMipmap(gl.TEXTURE_2D);
        };
    
        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
        return texture;  // Return the texture object to be used later
    }
}
