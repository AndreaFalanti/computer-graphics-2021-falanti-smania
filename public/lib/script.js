'use strict';

/** @type {WebGL2RenderingContext} */
let gl;

const modelsDir = 'assets/models/'
const texturesDir = 'assets/textures/';
const shadersDir = 'shaders/'

let perspectiveMatrix = [];
let viewMatrix = [];

// Camera related
let cameraPos = [];
let cameraX = 0.0;
const CAMERA_X_MAX = 1.5;
const CAMERA_DELTA = 0.035;
// For regulating camera with same framerate of scene (keyDown listener is slow, giving terribly laggy experience)
let eKeyDown = false;
let qKeyDown = false;

//#region Program attributes
// Program 0 -- Lambert & Phong/Blinn
let p0a_positionAttributeLocation, p0a_uvAttributeLocation, p0a_normalAttributeLocation;

// Program 1 -- Plain Color
let p1a_positionAttributeLocation, p1a_normalAttributeLocation;

// Program 2 -- Skybox
let p2a_skyboxVertPosAttr;
//#endregion

//#region Program uniforms
// Program 0 -- Lambert & Phong/Blinn
let p0u_wvpMatrixLocation, p0u_textureLocation, p0u_nMatrixLocation, p0u_wvMatrixLocation,
    p0u_lightDirLocation, p0u_lightColorLocation,
    p0u_lightPosLocation, p0u_spotLightEmitDirLocation, p0u_coneInLocation, p0u_coneOutLocation, p0u_decayLocation, p0u_targetLocation,
    p0u_ambientLightColorLocation, p0u_hemisphericDirLocation, p0u_hemisphericUpColorLocation, p0u_hemisphericDownColorLocation,
    p0u_specularColorLocation, p0u_specularGammaLocation, p0u_metallicLocation,
    p0u_lightTypeLocation, p0u_ambientTypeLocation, p0u_specularTypeLocation;

// Program 1 -- Plain Color
let p1u_wvpMatrixLocation, p1u_materialDiffColorHandle, p1u_lightDirectionHandle, p1u_lightColorHandle, p1u_normalMatrixPositionHandle;

// Program 2 -- Skybox
let p2u_skyboxTexHandle, p2u_inverseViewProjMatrixHandle;
//#endregion

// skybox
let skyboxVao;
let skyboxTextures = [];
let activeSkyboxIndex = 0;

let selectedGraphicsIndex = 0;

// Uniforms for chosing shader behaviour
let lightType = [1.0, 0.0, 0.0];
let specularType = [1.0, 0.0];
let ambientType = [1.0, 0.0];

// Light values for uniforms
const lightPos = [0.0, 3.0, 2.0, 1.0];
const directionalLightDir = [1.0, -1.0, -1.0];
const directionalLightColor = [1.0, 1.0, 1.0];
const spotLightDir = [0.0, -1.5, -1.0];
const coneIn = 30;
const coneOut = 40;
const decay = 1;
const target = 2.2; // g for spot and point lights

// Ambient uniforms
const ambientLightColor = [0.1, 0.1, 0.1];
const hemisphericDir = [-0.6, 0.4, 0.0, 1.0];
const hemisphericUpColor = [0.13, 0.13, 0.13];
const hemisphericDownColor = [0.07, 0.07, 0.07];

const specularColor = [1.0, 1.0, 1.0];
const specularGamma = 24.0;

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

/** @type {Hammer} */
let hammer;

//#region HTML DROPDOWN OPTION CALLABLES
function changeGraphics(value) {
    switch(value) {
        case '0':
            specularType = [1.0, 0.0];
            ambientType = [1.0, 0.0];
            break;
        case '1':
            specularType = [0.0, 1.0];
            ambientType = [1.0, 0.0];
            break;
        case '2':
            specularType = [1.0, 0.0];
            ambientType = [0.0, 1.0];
            break;
        case '3':
            specularType = [0.0, 1.0];
            ambientType = [0.0, 1.0];
            break;
        default:
            console.log('Invalid graphics option value: ' + value);
            break;
    }
}

function setActiveSkybox(value) {
    activeSkyboxIndex = value;
}

function setActiveLight(value) {
    switch(value) {
        case '0':
            lightType = [1.0, 0.0, 0.0];
            break;
        case '1':
            lightType = [0.0, 1.0, 0.0];
            break;
        case '2':
            lightType = [0.0, 0.0, 1.0];
            break;
        default:
            console.log('Invalid lights option value: ' + value);
            break;
    }
}
//#endregion

//#region game.js helpers
function activateMoles() {
    moles.forEach(el => el.activate());
}

function deactivateMoles() {
    moles.forEach(el => el.deactivate());
}
//#endregion

//#region GET ATTRIBUTE AND UNIFORM LOCATIONS
function getProgramAttributeLocations() {
    // Program 0 -- Lambert & Phong/Blinn
    p0a_positionAttributeLocation = gl.getAttribLocation(programs[0], "a_position");
    p0a_uvAttributeLocation = gl.getAttribLocation(programs[0], "a_uv");
    p0a_normalAttributeLocation = gl.getAttribLocation(programs[0], "a_normal");

    // Program 1 -- Plain Colors
    p1a_positionAttributeLocation = gl.getAttribLocation(programs[1], "a_position");  
    p1a_normalAttributeLocation = gl.getAttribLocation(programs[1], "a_normal");

    // Program 2 -- Skybox
    p2a_skyboxVertPosAttr = gl.getAttribLocation(programs[2], "in_position");
}

function getProgramUniformLocations() {
    // Program 0 -- Lambert & Phong/Blinn
    p0u_wvpMatrixLocation = gl.getUniformLocation(programs[0], "u_wvpMatrix");
    p0u_nMatrixLocation = gl.getUniformLocation(programs[0], "u_nMatrix");
    p0u_wvMatrixLocation = gl.getUniformLocation(programs[0], "u_wvMatrix");
    p0u_textureLocation = gl.getUniformLocation(programs[0], "u_texture");

    p0u_lightTypeLocation = gl.getUniformLocation(programs[0], "u_lightType");
    p0u_lightDirLocation = gl.getUniformLocation(programs[0], "u_lightDir");
    p0u_lightColorLocation = gl.getUniformLocation(programs[0], "u_lightColor");
    p0u_spotLightEmitDirLocation = gl.getUniformLocation(programs[0], "u_spotLightEmitDir");
    p0u_lightPosLocation = gl.getUniformLocation(programs[0], "u_lightPos");
    p0u_coneInLocation = gl.getUniformLocation(programs[0], "u_coneIn");
    p0u_coneOutLocation = gl.getUniformLocation(programs[0], "u_coneOut");
    p0u_decayLocation = gl.getUniformLocation(programs[0], "u_decay");
    p0u_targetLocation = gl.getUniformLocation(programs[0], "u_target");

    p0u_specularTypeLocation = gl.getUniformLocation(programs[0], "u_specularType");
    p0u_specularColorLocation = gl.getUniformLocation(programs[0], "u_specularColor");
    p0u_specularGammaLocation = gl.getUniformLocation(programs[0], "u_specularGamma");
    p0u_metallicLocation = gl.getUniformLocation(programs[0], "u_metallic");

    p0u_ambientTypeLocation = gl.getUniformLocation(programs[0], "u_ambientType");
    p0u_ambientLightColorLocation = gl.getUniformLocation(programs[0], "u_ambientLightColor");
    p0u_hemisphericDirLocation = gl.getUniformLocation(programs[0], "u_hemisphericDir");
    p0u_hemisphericUpColorLocation = gl.getUniformLocation(programs[0], "u_hemisphericUpColor");
    p0u_hemisphericDownColorLocation = gl.getUniformLocation(programs[0], "u_hemisphericDownColor");

    // Program 1 -- Plain Colors
    p1u_wvpMatrixLocation = gl.getUniformLocation(programs[1], "u_wvpMatrix");
    p1u_materialDiffColorHandle = gl.getUniformLocation(programs[1], 'mDiffColor');
    p1u_lightDirectionHandle = gl.getUniformLocation(programs[1], 'lightDirection');
    p1u_lightColorHandle = gl.getUniformLocation(programs[1], 'lightColor');
    p1u_normalMatrixPositionHandle = gl.getUniformLocation(programs[1], 'u_nMatrix');

    // Program 2 -- Skybox
    p2u_skyboxTexHandle = gl.getUniformLocation(programs[2], "u_texture"); 
    p2u_inverseViewProjMatrixHandle = gl.getUniformLocation(programs[2], "inverseViewProjMatrix");
}
//#endregion

//#region LOAD EXTERNAL FILES
async function generateProgram(shadersPath) {
    let program;
    await utils.loadFiles([shadersPath + 'vs.glsl', shadersPath + 'fs.glsl'], function (shaderText) {
        let vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaderText[0]);
        let fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaderText[1]);
        program = utils.createProgram(gl, vertexShader, fragmentShader);
    });

    return program;
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
 * @param {string} skyboxDir Path to skybox folder
 * @param {string} textureExt .jpg or .png basically
 * @param {number} textureDim Pixels dim (images are squared)
 * @returns {Promise<WebGLTexture>} Skybox texture
 */
async function loadSkybox(skyboxDir, textureExt, textureDim) {
    let skyboxTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0+3);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    
    let envTexDir = texturesDir + skyboxDir;
 
    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, 
            url: envTexDir + 'posx' + textureExt,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
            url: envTexDir + 'negx' + textureExt,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 
            url: envTexDir + 'posy' + textureExt,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
            url: envTexDir + 'negy' + textureExt,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 
            url: envTexDir + 'posz' + textureExt,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 
            url: envTexDir + 'negz' + textureExt,
        },
    ];

    // define some constants used for loading skybox images
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = textureDim;
    const height = textureDim;
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

    return skyboxTexture;
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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); 
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

            gl.generateMipmap(gl.TEXTURE_2D);
            resolve(texture);
        };
    });
}
//#endregion

function resizeCanvasToDisplaySize() {
    let width = gl.canvas.clientWidth;
    let height = gl.canvas.clientHeight;
    if (gl.canvas.width != width || gl.canvas.height != height) {
        gl.canvas.width = width;
        gl.canvas.height = height;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
}

async function main() {
    // get webGL context
    let canvas = document.getElementById("c");
    gl = canvas.getContext("webgl2");
    if (!gl) {
        document.write("GL context not opened");
        return;
    }

    programs.push(await generateProgram(shadersDir + 'lambert-phong&blinn/'));   // 0: lambert reflection, phong or blinn specular
    programs.push(await generateProgram(shadersDir + 'plainColor/')); // 1: plain diffuse
    programs.push(await generateProgram(shadersDir + 'skybox/')); // 2: skybox

    gl.useProgram(programs[0]);

    // setup the webGL context
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    getProgramAttributeLocations();
    getProgramUniformLocations();

    // setup skyboxes. They must be loaded before inverting UV system
    createSkyboxVAO();
    let sbIndoorT = await loadSkybox('indoorSkybox/', '.jpg', 512);
    let sbVirtualT = await loadSkybox('virtualSkybox/', '.png', 1024);
    skyboxTextures.push(sbIndoorT, sbVirtualT);

    // flip Y axis in texture coordinates
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // generate textures from image files
    let t1 = await loadImage('Mole.png', gl.TEXTURE0);

    // load the models
    let cabinetModel = await loadModel('cabinet.obj');
    let hammerModel = await loadModel('hammer.obj');
    let moleModel = await loadModel('mole.obj');

    // create the VAOs and the SceneNodes
    let drawInfo0 = createVaoP0(cabinetModel.vertices, cabinetModel.uv, cabinetModel.normals, cabinetModel.indices, t1);
    let cabinetNode = new SceneNode(utils.identityMatrix(), [drawInfo0]);

    drawInfo0 = createVaoP0(hammerModel.vertices, hammerModel.uv, hammerModel.normals, hammerModel.indices, t1, false);
    hammer = new Hammer();
    let hammerNode = new SceneNode(hammer.defaultPosition, [drawInfo0]);

    drawInfo0 = createVaoP0(moleModel.vertices, moleModel.uv, moleModel.normals, moleModel.indices, t1, false);

    moles.push(new Mole(-0.65, 0.2, false));        // left-back
    moles.push(new Mole(-0.32, 0.625, true));       // left-front
    moles.push(new Mole(0.0, 0.2, false));          // center-back
    moles.push(new Mole(0.32, 0.625, true));        // right-front
    moles.push(new Mole(0.65, 0.2, false));         // right-back

    // left
    let moleNode1 = new SceneNode(moles[0].getLocalMatrix(), [drawInfo0]);     // back
    let moleNode2 = new SceneNode(moles[1].getLocalMatrix(), [drawInfo0]);     // front
    
    // center
    let moleNode3 = new SceneNode(moles[2].getLocalMatrix(), [drawInfo0]);

    // right
    let moleNode4 = new SceneNode(moles[3].getLocalMatrix(), [drawInfo0]);     // front
    let moleNode5 = new SceneNode(moles[4].getLocalMatrix(), [drawInfo0]);     // back
    
    moleNode1.setParent(cabinetNode);
    moleNode2.setParent(cabinetNode);
    moleNode3.setParent(cabinetNode);
    moleNode4.setParent(cabinetNode);
    moleNode5.setParent(cabinetNode);

    // lightPos debug
    // let moleNode6 = new SceneNode(utils.MakeTranslateMatrix(...lightPos.slice(0, 3)), [drawInfo0]);
    // console.log(moleNode6.localMatrix);

    sceneRoots.push(cabinetNode, hammerNode);
    sceneObjects.push(cabinetNode, hammerNode, moleNode1, moleNode2, moleNode3, moleNode4, moleNode5);

    // in game.js
    await loadAudioAssets();

    drawScene();
}

//#region CREATE VAOs
/**
 * Create VAO for program0, returning node drawInfo
 * @param {number[]} vertices 
 * @param {number[]} uv 
 * @param {number[]} normals 
 * @param {number[]} indices 
 * @param {WebGLTexture} glTexture
 * @param {metallic} metallic is this object metallic? 
 * @returns {{ materialColor: number[], texture: WebGLTexture, programInfo: WebGLProgram, bufferLength: number, vertexArray: WebGLVertexArrayObject}} drawInfo
 */
function createVaoP0(vertices, uv, normals, indices, glTexture, metallic = false) {
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

    let normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(p0a_normalAttributeLocation);
    gl.vertexAttribPointer(p0a_normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    let indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        materialColor: null,
        texture: glTexture,
        programInfo : programs[0],
        bufferLength: indices.length,
        vertexArray: vao,
        uniforms: { 'metallic': metallic }
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
        bufferLength: indices.length,
        vertexArray: vao
    }
}

function createSkyboxVAO() {
    // define cube vertexes, using units to avoid normalization in shaders
    let skyboxVertPos = new Float32Array([
        -1, -1, 1.0,
        1, -1, 1.0,
        -1, 1, 1.0,
        -1, 1, 1.0,
        1, -1, 1.0,
        1, 1, 1.0,
    ]);
    
    skyboxVao = gl.createVertexArray();
    vaoArray.push(skyboxVao);
    gl.bindVertexArray(skyboxVao);
    
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, skyboxVertPos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(p2a_skyboxVertPosAttr);
    gl.vertexAttribPointer(p2a_skyboxVertPosAttr, 3, gl.FLOAT, false, 0, 0);
}
//#endregion

//#region DRAW SCENE
function animate() {
    let currentTime = (new Date).getTime();
    if (lastUpdateTime) {
        let deltaTime = currentTime - lastUpdateTime;

        // Moles animation
        moles.forEach(mole => mole.animate(deltaTime));
        // TODO: remove the hardcoded constant 2 in some way
        moles.forEach((mole, i) => sceneObjects[i + 2].localMatrix = mole.getLocalMatrix());

        // Hammer animation
        if (hammer.swinging) {
            sceneRoots[1].localMatrix = hammer.swingAnimation(deltaTime);
        }
        handlePossibleHammerHit(hammer, moles);
    }

    lastUpdateTime = currentTime;
}

function drawSkybox(viewProjectionMatrix, skyboxTexture){
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
    resizeCanvasToDisplaySize();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // update the local matrices for each object
    animate();
    regulateCameraX();

    //update world matrixes of each object group
    sceneRoots.forEach(el => el.updateWorldMatrix());

    // compute scene matrices (shared by all objects)
    perspectiveMatrix = utils.MakePerspective(90, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 100.0);
    cameraPos = [cameraX, 2.2, 3.0];
    viewMatrix = utils.MakeLookAt(cameraPos, [0.0, 1.8, 0.0], [0.0, 1.0, 0.0]);
    let viewProjectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewMatrix);

    // Transform light direction from world to camera space
    let lightDirMatrix = utils.invertMatrix(utils.transposeMatrix(viewMatrix));
    let directionalLightDirTransformed = utils.multiplyMatrix3Vector3(utils.sub3x3from4x4(lightDirMatrix), directionalLightDir);
    let spotLightDirTransformed = utils.multiplyMatrix3Vector3(utils.sub3x3from4x4(lightDirMatrix), spotLightDir);

    // Transform light position from world to camera space
    let lightPosTransformed = utils.multiplyMatrixVector(viewMatrix, lightPos);

    // Compute all the matrices for rendering
    sceneObjects.forEach(el => {
        let worldViewMatrix = utils.multiplyMatrices(viewMatrix, el.worldMatrix)
        let worldViewProjectionMatrix = utils.multiplyMatrices(perspectiveMatrix, worldViewMatrix);
        
        // Matrix used to compute normals -- invertion of world-view matrix
        let normalMatrix = utils.invertMatrix(utils.transposeMatrix(worldViewMatrix));
        // TODO: guess that dir must be transformed with the same matrix of normals, as it is associated to normals for computation
        let hemisphericDirTransformed = utils.multiplyMatrixVector(normalMatrix, hemisphericDir);
      
        // TODO: find best way to address multiple programs uniform assignment
        let activeDrawInfo = el.drawInfo[selectedGraphicsIndex];
        gl.useProgram(activeDrawInfo.programInfo);

        switch(activeDrawInfo.programInfo) {
            case programs[0]:
                //vs
                gl.uniformMatrix4fv(p0u_wvpMatrixLocation, gl.FALSE, utils.transposeMatrix(worldViewProjectionMatrix));
                gl.uniformMatrix4fv(p0u_nMatrixLocation, gl.FALSE, utils.transposeMatrix(normalMatrix));
                gl.uniformMatrix4fv(p0u_wvMatrixLocation, gl.FALSE, utils.transposeMatrix(worldViewMatrix));

                //fs
                gl.uniform3fv(p0u_lightTypeLocation, lightType);
                gl.uniform3fv(p0u_lightDirLocation, directionalLightDirTransformed);
                gl.uniform3fv(p0u_lightColorLocation, directionalLightColor);
                gl.uniform3fv(p0u_spotLightEmitDirLocation, spotLightDirTransformed);
                gl.uniform1f(p0u_coneInLocation, coneIn);
                gl.uniform1f(p0u_coneOutLocation, coneOut);
                gl.uniform1f(p0u_decayLocation, decay);
                gl.uniform1f(p0u_targetLocation, target);
                gl.uniform3fv(p0u_lightPosLocation, lightPosTransformed.slice(0, 3));
                     
                gl.uniform2fv(p0u_specularTypeLocation, specularType);
                gl.uniform3fv(p0u_specularColorLocation, specularColor);
                gl.uniform1f(p0u_specularGammaLocation, specularGamma);
                gl.uniform1i(p0u_metallicLocation, activeDrawInfo.uniforms.metallic);

                gl.uniform2fv(p0u_ambientTypeLocation, ambientType);
                gl.uniform3fv(p0u_ambientLightColorLocation, ambientLightColor);
                gl.uniform3fv(p0u_hemisphericDirLocation, hemisphericDirTransformed.slice(0, 3));
                gl.uniform3fv(p0u_hemisphericUpColorLocation, hemisphericUpColor);
                gl.uniform3fv(p0u_hemisphericDownColorLocation, hemisphericDownColor);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, activeDrawInfo.texture);
                gl.uniform1i(p0u_textureLocation, 0);
                break;
            case programs[1]:
                gl.uniformMatrix4fv(p1u_wvpMatrixLocation, gl.FALSE, utils.transposeMatrix(worldViewProjectionMatrix));
                gl.uniformMatrix4fv(p1u_normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(normalMatrix));

                gl.uniform3fv(p1u_materialDiffColorHandle, activeDrawInfo.materialColor);
                gl.uniform3fv(p1u_lightColorHandle, directionalLightColor);
                gl.uniform3fv(p1u_lightDirectionHandle, directionalLightDir);
                break;
            default:
                console.log('Invalid program, can\'t assign attributes and uniforms');
                break;
        }
  
        gl.bindVertexArray(activeDrawInfo.vertexArray);
        gl.drawElements(gl.TRIANGLES, activeDrawInfo.bufferLength, gl.UNSIGNED_SHORT, 0);
    });

    drawSkybox(viewProjectionMatrix, skyboxTextures[activeSkyboxIndex]);

    window.requestAnimationFrame(drawScene);
}

//#endregion

//#region RAYCAST
function performRaycast(e){
    //These commented lines of code only work if the canvas is full screen
    /*console.log("ClientX "+ev.clientX+" ClientY "+ev.clientY);
    let normX = (2*ev.clientX)/ gl.canvas.width - 1;
    let normY = 1 - (2*ev.clientY) / gl.canvas.height;
    console.log("NormX "+normX+" NormY "+normY);*/

    //This is a way of calculating the coordinates of the click in the canvas taking into account its possible displacement in the page
    let top = 0.0, left = 0.0;
    let glCanvas = gl.canvas;
    while (glCanvas && glCanvas.tagName !== 'BODY') {
        top += glCanvas.offsetTop;
        left += glCanvas.offsetLeft;
        glCanvas = glCanvas.offsetParent;
    }
    //console.log(`left: ${left}, top: ${top}`);
    let x = e.clientX - left;
    let y = e.clientY - top;
        
    //Here we calculate the normalised device coordinates from the pixel coordinates of the canvas
    //console.log(`Client X: ${x}, Client Y: ${y}`);
    let normX = (2*x)/ gl.canvas.width - 1;
    let normY = 1 - (2*y) / gl.canvas.height;
    //console.log(`NormX: ${normX}, NormY: ${normY}`);

    //We need to go through the transformation pipeline in the inverse order so we invert the matrices
    let projInv = utils.invertMatrix(perspectiveMatrix);
    let viewInv = utils.invertMatrix(viewMatrix);
    
    //Find the point (un)projected on the near plane, from clip space coords to eye coords
    //z = -1 makes it so the point is on the near plane
    //w = 1 is for the homogeneous coordinates in clip space
    let pointEyeCoords = utils.multiplyMatrixVector(projInv, [normX, normY, -1, 1]);
    //console.log("Point eye coords: " + pointEyeCoords);

    //This finds the direction of the ray in eye space
    //Formally, to calculate the direction you would do dir = point - eyePos but since we are in eye space eyePos = [0,0,0] 
    //w = 0 is because this is not a point anymore but is considered as a direction
    let rayEyeCoords = [pointEyeCoords[0], pointEyeCoords[1], pointEyeCoords[2], 0];

    
    //We find the direction expressed in world coordinates by multipling with the inverse of the view matrix
    let rayDir = utils.multiplyMatrixVector(viewInv, rayEyeCoords);
    //console.log("Ray direction: " + rayDir);
    // TODO: from 4 to 3 vector, but should not be a problem
    let normalisedRayDir = utils.normalizeVector3(rayDir);
    //console.log("Normalised ray dir: " + normalisedRayDir);
    //The ray starts from the camera in world coordinates
    let rayStartPoint = cameraPos;
    
    //Iterate on all moles in the scene to check for collisions
    let hit = false;
    let raycastMoleIndexes = [1, 3, 0, 2, 4];   // Process the front row moles first (odd indexes), then the back row moles (even indexes)

    for(let i = 0; i < moles.length && !hit; i++) {
        let index = raycastMoleIndexes[i];
        let cylinderInfo = moles[index].cylinderMesh;
        hit = rayCylinderIntersection(rayStartPoint, normalisedRayDir, cylinderInfo.base, cylinderInfo.axis, cylinderInfo.radius);
        if (hit) {
            //console.log("Raycast hit mole number: " + index);
            sceneRoots[1].localMatrix = hammer.setPosition(index);
        }
    }
}

/**
 * Taken from: https://github.com/erich666/GraphicsGems/blob/master/gemsiv/ray_cyl.c, converted to javascript.
 * Only relevant operations for just checking the hit are performed.
 * TODO: actually doesn't use the cylinder height, height is unlimited.
 * @param {number[]} rayStartPoint 
 * @param {number[]} rayNormalisedDir 
 * @param {number[]} cylBase 
 * @param {number[]} cylAxis 
 * @param {number} cylRadius 
 * @returns {boolean} If raycast hits the cylinder of not
 */
 function rayCylinderIntersection(rayStartPoint, rayNormalisedDir, cylBase, cylAxis, cylRadius) {
    let RC = utils.subtractVectors(rayStartPoint, cylBase);
    let n = utils.crossVector(rayNormalisedDir, cylAxis);

    let d;
    if (utils.vectorLength(n) === 0) {
        d = utils.dotProduct(RC, cylAxis);
        let D = utils.subtractVectors(RC, cylAxis.map(el => el * d));
        d = utils.vectorLength(D);

        return d <= cylRadius;
    }

    n = utils.normalizeVector3(n);
    d = Math.abs(utils.dotProduct(RC, n));

    return d <= cylRadius;
}
//#endregion

//#region COMMANDS
function regulateCameraX() {
    if (qKeyDown) {
        cameraX = utils.clamp(cameraX - CAMERA_DELTA, -CAMERA_X_MAX, CAMERA_X_MAX);
    }
    // no else-if, so if both are down they cancel each other
    if (eKeyDown) {
        cameraX = utils.clamp(cameraX + CAMERA_DELTA, -CAMERA_X_MAX, CAMERA_X_MAX);
    }
}

function keyDownListener(e){
    switch (e.code) {
        case 'KeyQ':
            qKeyDown = true;
            break;
        case 'KeyE':
            eKeyDown = true;
            break;
        case 'KeyW':
            sceneRoots[1].localMatrix = hammer.changeCurrentPosition(-1);
            break;
        case 'KeyA':
            sceneRoots[1].localMatrix = hammer.changeCurrentPosition(-2);
            break;
        case 'KeyS':
            sceneRoots[1].localMatrix = hammer.changeCurrentPosition(1);
            break;
        case 'KeyD':
            sceneRoots[1].localMatrix = hammer.changeCurrentPosition(2);
            break;  
        default:
            break;
    }
}

function keyUpListener(e){
    switch (e.code) {
        case 'KeyQ':
            qKeyDown = false;
            break;
        case 'KeyE':
            eKeyDown = false;
            break;
        case 'Enter':
        case 'Space':
            // this flag will trigger the animation in animate(), the logic is handled by the class. Swing hammer only if playing (playing is defined in game.js).
            hammer.swinging = playing;
            break;
        default:
            break;
    }
}
//#endregion

// launch main() when page is loaded
window.onload = main;
// add listener for keyboard commands (down are better for hold commands)
window.addEventListener("keydown", keyDownListener, false);
window.addEventListener("keyup", keyUpListener, false);
window.addEventListener("mouseup", () => hammer.swinging = playing);
window.addEventListener("mousemove", performRaycast);
