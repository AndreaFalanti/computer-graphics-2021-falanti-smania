'use strict';

/** @type {WebGL2RenderingContext} */
let gl;

const modelsDir = 'assets/models/'
const texturesDir = 'assets/textures/';
const shadersDir = 'shaders/'

let perspectiveMatrix = [];
let viewMatrix = [];

//#region Program attributes
let p0a_positionAttributeLocation, p0a_uvAttributeLocation;
let p1a_positionAttributeLocation, p1a_normalAttributeLocation;
//#endregion

//#region Program uniforms
let p0u_matrixLocation, p0u_textLocation;
let p1u_matrixLocation, p1u_materialDiffColorHandle, p1u_lightDirectionHandle, p1u_lightColorHandle, p1u_normalMatrixPositionHandle; 
//#endregion

// TODO: textures and VAOs arrays are probably useless, because now references are stored in sceneNode
let textures = [];
let vaoArray = [];
/** @type {WebGLProgram[]} */
let programs = [];

/** @type {SceneNode[]} */
let sceneRoots = [];

let lastUpdateTime = (new Date).getTime();

let cubeRx = 0.0;
let cubeRy = 0.0;
let cubeRz = 0.0;
let cubeS = 0.5;

let indicesLength = 0;

function getProgramAttributeLocations() {
    p0a_positionAttributeLocation = gl.getAttribLocation(programs[0], "a_position");
    p0a_uvAttributeLocation = gl.getAttribLocation(programs[0], "a_uv");

    p1a_positionAttributeLocation = gl.getAttribLocation(programs[1], "inPosition");  
    p1a_normalAttributeLocation = gl.getAttribLocation(programs[1], "inNormal");
}

function getProgramUniformLocations() {
    p0u_matrixLocation = gl.getUniformLocation(programs[0], "matrix");
    p0u_textLocation = gl.getUniformLocation(programs[0], "u_texture");

    p1u_matrixLocation = gl.getUniformLocation(programs[1], "matrix");
    p1u_materialDiffColorHandle = gl.getUniformLocation(programs[1], 'mDiffColor');
    p1u_lightDirectionHandle = gl.getUniformLocation(programs[1], 'lightDirection');
    p1u_lightColorHandle = gl.getUniformLocation(programs[1], 'lightColor');
    p1u_normalMatrixPositionHandle = gl.getUniformLocation(programs[1], 'nMatrix');
}

async function main() {
    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    getProgramAttributeLocations();
    getProgramUniformLocations();

    // generate textures from image files
    let t1 = loadImage('crate.png', gl.TEXTURE0);
    let t2 = loadImage('wood.jpg', gl.TEXTURE0);

    // vertices, uv, indices are from cubeDefinition.js file
    let drawInfo = createVaoP0(vertices, uv, indices, t1);
    let cubeNode = new SceneNode(utils.identityMatrix(), drawInfo);

    let model = await loadModel('Vaccine.obj');
    drawInfo = createVaoP1(model.vertices, model.normals, model.indices, [0.0, 1.0, 0.0]);
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
    // console.log('Object [vertices, uv, indices]');
    // console.log(vertices);
    // console.log(uv);
    // console.log(indices);

    gl.useProgram(programs[0]);
    let vao = gl.createVertexArray();
    vaoArray.push(vao);
    gl.bindVertexArray(vao);

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(p0a_positionAttributeLocation);
    gl.vertexAttribPointer(p0a_positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    let uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(p0a_uvAttributeLocation);
    gl.vertexAttribPointer(p0a_uvAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    let indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        materialColor: null,
        texture: glTexture,
        programInfo : programs[0],
        bufferLength: indices.length,   // TODO: verify this is correct
        vertexArray: vao
    }
}

/**
 * Create VAO for program1, returning node drawInfo
 * @param {number[]} vertices 
 * @param {number[]} normals 
 * @param {number[]} indices 
 * @param {number[]} color 
 * @returns {{ materialColor: number[], texture: WebGLTexture, programInfo: WebGLProgram, bufferLength: number, vertexArray: WebGLVertexArrayObject}} drawInfo
 */
 function createVaoP1(vertices, normals, indices, color) {
    gl.useProgram(programs[1]);
    let vao = gl.createVertexArray();
    vaoArray.push(vao);
    gl.bindVertexArray(vao);

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(p1a_positionAttributeLocation);
    gl.vertexAttribPointer(p1a_positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    let normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(p1a_normalAttributeLocation);
    gl.vertexAttribPointer(p1a_normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    let indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        materialColor: color,
        texture: null,
        programInfo : programs[1],
        bufferLength: indices.length,   // TODO: verify this is correct
        vertexArray: vao
    }
}

/**
 * Load .obj model from file
 * @param {string} modelPath name only
 * @returns {{vertices: number[], normals: number[], indices: number[], uv: number[]}}
 */
async function loadModel(modelPath) {
    let objStr = await utils.get_objstr(modelsDir + modelPath);
    let objModel = new OBJ.Mesh(objStr);

    let model = {};
    model.vertices = objModel.vertices;
    model.normals = objModel.vertexNormals;
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
      
        // TODO: find best way to address multiple programs uniform assignment
        switch(el.drawInfo.programInfo) {
            case programs[0]:
                gl.uniformMatrix4fv(p0u_matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, el.drawInfo.texture);
                gl.uniform1i(p0u_textLocation, 0);
                break;
            case programs[1]:
                let normalMatrix = utils.invertMatrix(utils.transposeMatrix(el.worldMatrix)); // requested only by program 1 for now
                gl.uniformMatrix4fv(p1u_matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));
                gl.uniformMatrix4fv(p1u_normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(normalMatrix));

                gl.uniform3fv(p1u_materialDiffColorHandle, el.drawInfo.materialColor);
                // TODO: light hardcoded for test
                gl.uniform3fv(p1u_lightColorHandle, [1.0, 1.0, 1.0]);
                gl.uniform3fv(p1u_lightDirectionHandle, [-1.0, 0.0, 0.0]);
                break;
            default:
                console.log('Invalid program, can\'t assign attributes and uniforms');
                break;
        }
  
        gl.bindVertexArray(el.drawInfo.vertexArray);
        gl.drawElements(gl.TRIANGLES, el.drawInfo.bufferLength, gl.UNSIGNED_SHORT, 0);
    });

    window.requestAnimationFrame(drawScene);
}

async function generateProgram(shadersPath) {
    let program;
    await utils.loadFiles([shadersPath + 'vs.glsl', shadersPath + 'fs.glsl'], function (shaderText) {
        let vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaderText[0]);
        let fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaderText[1]);
        program = utils.createProgram(gl, vertexShader, fragmentShader);
    });

    return program;
}

async function init() {
    let canvas = document.getElementById("c");
    gl = canvas.getContext("webgl2");
    if (!gl) {
        document.write("GL context not opened");
        return;
    }

    programs.push(await generateProgram(shadersDir + 'textured/'));   // 0: textured
    programs.push(await generateProgram(shadersDir + 'plainColor/')); // 1: plain diffuse

    gl.useProgram(programs[0]);

    main();
}

// launch init() when page is loaded
window.onload = init;
