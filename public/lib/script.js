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
let p2a_skyboxVertPosAttr;
//#endregion

//#region Program uniforms
let p0u_matrixLocation, p0u_textLocation;
let p1u_matrixLocation, p1u_materialDiffColorHandle, p1u_lightDirectionHandle, p1u_lightColorHandle, p1u_normalMatrixPositionHandle;
let p2u_skyboxTexHandle, p2u_inverseViewProjMatrixHandle;
//#endregion

// skybox
let skyboxVao;
let skyboxTexture;

// TODO: textures and VAOs arrays are probably useless, because now references are stored in sceneNode
let textures = [];
let vaoArray = [];
/** @type {WebGLProgram[]} */
let programs = [];

/** @type {SceneNode[]} */
let sceneRoots = [];
/** @type {SceneNode[]} */
let sceneObjects = [];

let lastUpdateTime = (new Date).getTime();

/** @type {Mole[]} */
let moles = [];

let cameraAngleY = 0.0;
const CAMERA_Y_MAX = 30;

//#region GET ATTRIBUTES AND UNIFORMS
function getProgramAttributeLocations() {
    p0a_positionAttributeLocation = gl.getAttribLocation(programs[0], "a_position");
    p0a_uvAttributeLocation = gl.getAttribLocation(programs[0], "a_uv");

    p1a_positionAttributeLocation = gl.getAttribLocation(programs[1], "inPosition");  
    p1a_normalAttributeLocation = gl.getAttribLocation(programs[1], "inNormal");

    p2a_skyboxVertPosAttr = gl.getAttribLocation(programs[2], "in_position");
}

function getProgramUniformLocations() {
    p0u_matrixLocation = gl.getUniformLocation(programs[0], "matrix");
    p0u_textLocation = gl.getUniformLocation(programs[0], "u_texture");

    p1u_matrixLocation = gl.getUniformLocation(programs[1], "matrix");
    p1u_materialDiffColorHandle = gl.getUniformLocation(programs[1], 'mDiffColor');
    p1u_lightDirectionHandle = gl.getUniformLocation(programs[1], 'lightDirection');
    p1u_lightColorHandle = gl.getUniformLocation(programs[1], 'lightColor');
    p1u_normalMatrixPositionHandle = gl.getUniformLocation(programs[1], 'nMatrix');

    p2u_skyboxTexHandle = gl.getUniformLocation(programs[2], "u_texture"); 
    p2u_inverseViewProjMatrixHandle = gl.getUniformLocation(programs[2], "inverseViewProjMatrix"); 
}
//#endregion

async function main() {
    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    getProgramAttributeLocations();
    getProgramUniformLocations();

    // generate textures from image files
    let t1 = await loadImage('Mole.png', gl.TEXTURE0);

    // load the models
    let cabinetModel = await loadModel('cabinet.obj');
    let hammerModel = await loadModel('hammer.obj');
    let moleModel = await loadModel('mole.obj');

    // create the VAOs and the SceneNodes
    let drawInfo = createVaoP0(cabinetModel.vertices, cabinetModel.uv, cabinetModel.indices, t1);
    let cabinetNode = new SceneNode(utils.MakeWorld(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0), drawInfo);

    drawInfo = createVaoP0(hammerModel.vertices, hammerModel.uv, hammerModel.indices, t1);
    let hammerNode = new SceneNode(utils.MakeWorld(1.5, 1.8, 1.0, 0.0, 0.0, 0.0, 0.8), drawInfo);

    drawInfo = createVaoP0(moleModel.vertices, moleModel.uv, moleModel.indices, t1);
    moles.push(new Mole(-0.32, 0.625, true));
    moles.push(new Mole(0.32, 0.625, true));
    moles.push(new Mole(-0.65, 0.2, false));
    moles.push(new Mole(0.0, 0.2, false));
    moles.push(new Mole(0.65, 0.2, false));

    // front row
    let moleNode1 = new SceneNode(moles[0].getLocalMatrix(), drawInfo);
    let moleNode2 = new SceneNode(moles[1].getLocalMatrix(), drawInfo);
    
    // back row
    let moleNode3 = new SceneNode(moles[2].getLocalMatrix(), drawInfo);
    let moleNode4 = new SceneNode(moles[3].getLocalMatrix(), drawInfo);
    let moleNode5 = new SceneNode(moles[4].getLocalMatrix(), drawInfo);
    
    moleNode1.setParent(cabinetNode);
    moleNode2.setParent(cabinetNode);
    moleNode3.setParent(cabinetNode);
    moleNode4.setParent(cabinetNode);
    moleNode5.setParent(cabinetNode);

    sceneRoots.push(cabinetNode, hammerNode);
    sceneObjects.push(cabinetNode, hammerNode, moleNode1, moleNode2, moleNode3, moleNode4, moleNode5);

    await loadSkybox();

    drawScene();
}


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
 * @returns {Promise<{vertices: number[], normals: number[], indices: number[], uv: number[]}>}
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

/**
 * Build skybox VAO, then load skybox images and create the texture
 */
async function loadSkybox() {
    let skyboxVertPos = new Float32Array([
        -1, -1, 1.0,
        1, -1, 1.0,
        -1,  1, 1.0,
        -1,  1, 1.0,
        1, -1, 1.0,
        1,  1, 1.0,
    ]);
    
    skyboxVao = gl.createVertexArray();
    vaoArray.push(skyboxVao);
    gl.bindVertexArray(skyboxVao);
    
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, skyboxVertPos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(p2a_skyboxVertPosAttr);
    gl.vertexAttribPointer(p2a_skyboxVertPosAttr, 3, gl.FLOAT, false, 0, 0);
    
    skyboxTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0+3);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    
    var envTexDir = texturesDir + "skybox/";
 
    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, 
            url: envTexDir + 'posx.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
            url: envTexDir + 'negx.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 
            url: envTexDir + 'posy.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
            url: envTexDir + 'negy.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 
            url: envTexDir + 'posz.jpg',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 
            url: envTexDir + 'negz.jpg',
        },
    ];

    // define some constants used for loading skybox images
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 512;
    const height = 512;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    let promises = faceInfos.map(faceInfo => new Promise(resolve => {
        // setup each face so it's immediately renderable
        gl.texImage2D(faceInfo.target, level, internalFormat, width, height, 0, format, type, null);
        
        // Asynchronously load an image
        const image = new Image();
        image.src = faceInfo.url;
        image.onload = function() {
            // Now that the image has loaded upload it to the texture.
            gl.activeTexture(gl.TEXTURE0+3);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
            gl.texImage2D(faceInfo.target, level, internalFormat, format, type, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

            resolve();
        };
    }));

    // not necessary, but better load all textures before proceeding to avoid running the game before skybox is ready
    await Promise.all(promises);

    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
}

/**
 * Get an image and generate a valid WebGL texture
 * @param {string} imagePath name only
 * @param {number} glTextureIndex 
 * @returns {Promise<WebGLTexture>}
 */
function loadImage(imagePath, glTextureIndex) {
    return new Promise(resolve => {
        // Create a texture.
        let texture = gl.createTexture();
        textures.push(texture);
        // use texture unit 0
        gl.activeTexture(glTextureIndex);
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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); 
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

            gl.generateMipmap(gl.TEXTURE_2D);
            resolve(texture);
        };
    });
}

//#region DRAW SCENE

function animate() {
    let currentTime = (new Date).getTime();
    if (lastUpdateTime) {
        let deltaTime = currentTime - lastUpdateTime;
        //console.log(deltaTime);
        moles.forEach(mole => mole.animate(deltaTime));
        // TODO: remove the hardcoded constant 2 in some way
        moles.forEach((mole, i) => sceneObjects[i + 2].localMatrix = mole.getLocalMatrix());
    }

    lastUpdateTime = currentTime;
}

function drawSkybox(viewProjectionMatrix){
    gl.useProgram(programs[2]);
    
    gl.activeTexture(gl.TEXTURE0+3);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    gl.uniform1i(p2u_skyboxTexHandle, 3);
    
    let inverseViewProjMatrix = utils.invertMatrix(viewProjectionMatrix);
    gl.uniformMatrix4fv(p2u_inverseViewProjMatrixHandle, gl.FALSE, utils.transposeMatrix(inverseViewProjMatrix));
    
    gl.bindVertexArray(skyboxVao);
    gl.depthFunc(gl.LEQUAL);
    gl.drawArrays(gl.TRIANGLES, 0, 1*6);
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
    let viewMatrix = utils.MakeView(0.0, 2.2, 3.0, -5.0, cameraAngleY);
    let viewProjectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewMatrix);

    // Compute all the matrices for rendering
    sceneObjects.forEach(el => {
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

    drawSkybox(viewProjectionMatrix);

    window.requestAnimationFrame(drawScene);
}

//#endregion

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
    programs.push(await generateProgram(shadersDir + 'skybox/')); // 1: plain diffuse

    gl.useProgram(programs[0]);

    main();
}

function keyDownListener(e){
    switch (e.code) {
        case 'KeyQ':
            cameraAngleY = utils.clamp(cameraAngleY + 1.0, -CAMERA_Y_MAX, CAMERA_Y_MAX);
            break;
        case 'KeyE':
            cameraAngleY = utils.clamp(cameraAngleY - 1.0, -CAMERA_Y_MAX, CAMERA_Y_MAX);
            break;  
        default:
            console.log('Invalid key');
            break;
    }
}

function keyUpListener(e){
    // TODO
}

// launch init() when page is loaded
window.onload = init;
// add listener for keyboard commands (down are better for hold commands)
window.addEventListener("keydown", keyDownListener, false);
window.addEventListener("keyup", keyUpListener, false);
