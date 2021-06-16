/** @type {WebGLProgram} */
let program;
/** @type {WebGL2RenderingContext} */
let gl;

const modelsDir = 'assets/models/'
const texturesDir = 'assets/textures/';
const shadersDir = 'shaders/'

let perspectiveMatrix = [];
let viewMatrix = [];

let attributeDict = {};
let uniformDict = {};
let textures = [];
let vaoArray = [];
/** @type {SceneNode[]} */
let sceneRoots = [];

let lastUpdateTime = (new Date).getTime();

let cubeRx = 0.0;
let cubeRy = 0.0;
let cubeRz = 0.0;
let cubeS = 0.5;

let indicesLength = 0;

async function main() {
    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    attributeDict.p0_positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    attributeDict.p0_uvAttributeLocation = gl.getAttribLocation(program, "a_uv");

    uniformDict.p0_matrixLocation = gl.getUniformLocation(program, "matrix");
    uniformDict.p0_textLocation = gl.getUniformLocation(program, "u_texture");

    // generate textures from image files
    let t1 = loadImage('crate.png', gl.TEXTURE0);
    let t2 = loadImage('wood.jpg', gl.TEXTURE0);

    // vertices, uv, indices are from cubeDefinition.js file
    let drawInfo = createVaoP0(vertices, uv, indices, t1);
    let cubeNode = new SceneNode(utils.identityMatrix(), drawInfo);

    let model = await loadModel('Vaccine.obj');
    drawInfo = createVaoP0(model.vertices, model.uv, model.indices, t2);
    let objNode = new SceneNode(utils.identityMatrix(), drawInfo);

    sceneRoots.push(cubeNode, objNode);

    drawScene();
}

// TODO: this program use textures, create also one for color array could be useful?
/**
 * Create VAO for program0, returning node drawInfo
 * @param {number[]} vertices 
 * @param {number[]} uv 
 * @param {number[]} indices 
 * @param {WebGLTexture} glTexture 
 * @returns {{ materialColor: number[], texture: WebGLTexture, programInfo: WebGLProgram, bufferLength: number, vertexArray: WebGLVertexArrayObject}} drawInfo
 */
function createVaoP0(vertices, uv, indices, glTexture) {
    console.log('Object [vertices, uv, indices]');
    console.log(vertices);
    console.log(uv);
    console.log(indices);

    let vao = gl.createVertexArray();
    vaoArray.push(vao);
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

    return {
        materialColor: null,
        texture: glTexture,
        programInfo : program,
        bufferLength: indices.length,   // TODO: verify this is correct
        vertexArray: vao
    }
}

async function loadModel(modelPath) {
    let objStr = await utils.get_objstr(modelsDir + modelPath);
    let objModel = new OBJ.Mesh(objStr);

    let model = {};
    model.vertices = objModel.vertices;
    model.normals = objModel.normals;
    model.indices = objModel.indices;
    model.uv = objModel.textures;

    return model;
}

function loadImage(imagePath, glTexture) {
    // Create a texture.
    let texture = gl.createTexture();
    textures.push(texture);
    // use texture unit 0
    gl.activeTexture(glTexture);
    // bind to the TEXTURE_2D bind point of texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Asynchronously load an image
    let image = new Image();
    image.src = texturesDir + imagePath;
    image.onload = function () {
        //Make sure this is the active one
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        // gl.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE); 
        // gl.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        gl.generateMipmap(gl.TEXTURE_2D);
    };

    return texture;
}

function animate() {
    let currentTime = (new Date).getTime();
    if (lastUpdateTime) {
        let deltaC = (30 * (currentTime - lastUpdateTime)) / 1000.0;
        cubeRx += deltaC;
        cubeRy -= deltaC;
        cubeRz += deltaC;
    }
    sceneRoots[0].localMatrix = utils.MakeWorld(0.0, 0.0, 0.0, cubeRx, cubeRy, cubeRz, 0.4);
    sceneRoots[1].localMatrix = utils.MakeWorld(-5.0, -5.0, -5.0, cubeRx, cubeRy, cubeRz, 0.4);
    lastUpdateTime = currentTime;
}


function drawScene() {
    // update the local matrices for each object
    animate();

    //update world matrixes of each object group
    sceneRoots.forEach(el => el.updateWorldMatrix());

    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // compute scene matrices (shared by all objects)
    let perspectiveMatrix = utils.MakePerspective(90, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
    let viewMatrix = utils.MakeView(1.5, 0.0, 3.0, 0.0, -30.0);
    // let viewWorldMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
    // let projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewWorldMatrix);
    let viewProjectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewMatrix);

    // Compute all the matrices for rendering
    sceneRoots.forEach(el => {
        gl.useProgram(el.drawInfo.programInfo);
        
        let projectionMatrix = utils.multiplyMatrices(viewProjectionMatrix, el.worldMatrix);
        //let normalMatrix = utils.invertMatrix(utils.transposeMatrix(el.worldMatrix));
      
        gl.uniformMatrix4fv(uniformDict.p0_matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, el.drawInfo.texture);
        gl.uniform1i(uniformDict.p0_textLocation, 0);
  
        gl.bindVertexArray(el.drawInfo.vertexArray);
        gl.drawElements(gl.TRIANGLES, el.drawInfo.bufferLength, gl.UNSIGNED_SHORT, 0);
    });

    window.requestAnimationFrame(drawScene);
}

async function init() {
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

// launch init() when page is loaded
window.onload = init;
