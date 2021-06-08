let program;
/** @type {WebGL2RenderingContext} */
let gl;

const modelsDir = 'assets/models/'
const texturesDir = 'assets/textures/';
const shadersDir = 'shaders/'

let attributeDict = {};
let uniformDict = {};
let matricesDict = {};
let textures = [];

let lastUpdateTime = (new Date).getTime();

let cubeRx = 0.0;
let cubeRy = 0.0;
let cubeRz = 0.0;
let cubeS  = 0.5;

function main() {
  utils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0); 
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  attributeDict.p0_positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  attributeDict.p0_uvAttributeLocation = gl.getAttribLocation(program, "a_uv");
    
  uniformDict.p0_matrixLocation = gl.getUniformLocation(program, "matrix"); 
  uniformDict.p0_textLocation = gl.getUniformLocation(program, "u_texture");

  matricesDict.perspectiveMatrix = utils.MakePerspective(90, gl.canvas.width/gl.canvas.height, 0.1, 100.0);
    
  vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  let positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(attributeDict.p0_positionAttributeLocation);
  gl.vertexAttribPointer(attributeDict.p0_positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  let uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(attributeDict.p0_uvAttributeLocation);
  gl.vertexAttribPointer(attributeDict.p0_uvAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  let indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW); 

  // Create a texture.
  let texture = gl.createTexture();
  textures.push(texture);
  // use texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  // bind to the TEXTURE_2D bind point of texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Asynchronously load an image
  let image = new Image();
  image.src = texturesDir + "crate.png";
  image.onload = function() {
      //Make sure this is the active one
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

      gl.generateMipmap(gl.TEXTURE_2D);
    };

  drawScene();
}

function animate(){
  let currentTime = (new Date).getTime();
  if(lastUpdateTime){
    let deltaC = (30 * (currentTime - lastUpdateTime)) / 1000.0;
    cubeRx += deltaC;
    cubeRy -= deltaC;
    cubeRz += deltaC;
  }
  worldMatrix = utils.MakeWorld(  0.0, 0.0, 0.0, cubeRx, cubeRy, cubeRz, 1.0);
  lastUpdateTime = currentTime;               
}


function drawScene() {
  animate();

  utils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  let viewMatrix = utils.MakeView(1.5, 0.0, 3.0, 0.0, -30.0);
  let viewWorldMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
  let projectionMatrix = utils.multiplyMatrices(matricesDict.perspectiveMatrix, viewWorldMatrix);
 
  gl.uniformMatrix4fv(uniformDict.p0_matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));
  
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures[0]);
  gl.uniform1i(uniformDict.p0_textLocation, 0);

  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0 );
  
  window.requestAnimationFrame(drawScene);
}

async function init(){
    let canvas = document.getElementById("c"); 
    gl = canvas.getContext("webgl2");
    if (!gl) {
        document.write("GL context not opened");
        return;
    }

    await utils.loadFiles([shadersDir + 'vs.glsl', shadersDir + 'fs.glsl'], function (shaderText) {
      let vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaderText[0]);
      console.log(vertexShader);
      let fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaderText[1]);
      program = utils.createProgram(gl, vertexShader, fragmentShader);

    });
    gl.useProgram(program);
    
    main();
}

window.onload = init;
