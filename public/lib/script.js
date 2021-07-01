'use strict';

/** @type {WebGL2RenderingContext} */
let gl;

const modelsDir = 'assets/models/'
const texturesDir = 'assets/textures/';
const shadersDir = 'shaders/'

let perspectiveMatrix = [];
let viewMatrix = [];

//#region Program attributes
let p0a_positionAttributeLocation, p0a_uvAttributeLocation, p0a_normalAttributeLocation;
let p1a_positionAttributeLocation, p1a_normalAttributeLocation;
let p2a_skyboxVertPosAttr;
let p3a_positionAttributeLocation, p3a_uvAttributeLocation, p3a_normalAttributeLocation;
//#endregion

//#region Program uniforms
let p0u_wvpMatrixLocation, p0u_textureLocation, p0u_nMatrixLocation, p0u_wMatrixLocation,
    p0u_lightDirLocation, p0u_lightColorLocation, p0u_ambientLightColorLocation, p0u_cameraPosLocation,
    p0u_specularColorLocation, p0u_specularGammaLocation, p0u_metallicLocation;
let p1u_wvpMatrixLocation, p1u_materialDiffColorHandle, p1u_lightDirectionHandle, p1u_lightColorHandle, p1u_normalMatrixPositionHandle;
let p2u_skyboxTexHandle, p2u_inverseViewProjMatrixHandle;
let p3u_wvpMatrixLocation, p3u_textureLocation, p3u_nMatrixLocation, p3u_wMatrixLocation,
    p3u_lightDirLocation, p3u_lightColorLocation, p3u_ambientLightColorLocation, p3u_cameraPosLocation,
    p3u_specularColorLocation, p3u_specularGammaLocation, p3u_metallicLocation;
//#endregion

// skybox
let skyboxVao;
let skyboxTextures = [];
let activeSkyboxIndex = 0;

let selectedGraphicsIndex = 0;

// lights
const directionalLightDir = [2.0, -2.0, -2.0];
const directionalLightColor = [1.0, 1.0, 1.0];
const ambientLightColor = [0.1, 0.1, 0.1];

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

let cameraX = 0.0;
const CAMERA_X_MAX = 1.5;

function activateMoles() {
    moles.forEach(el => el.activate());
}

function deactivateMoles() {
    moles.forEach(el => el.deactivate());
}

function changeGraphics(val) {
    selectedGraphicsIndex = val;
}

//#region GET ATTRIBUTES AND UNIFORMS
function getProgramAttributeLocations() {
    p0a_positionAttributeLocation = gl.getAttribLocation(programs[0], "a_position");
    p0a_uvAttributeLocation = gl.getAttribLocation(programs[0], "a_uv");
    p0a_normalAttributeLocation = gl.getAttribLocation(programs[0], "a_normal");

    p1a_positionAttributeLocation = gl.getAttribLocation(programs[1], "a_position");  
    p1a_normalAttributeLocation = gl.getAttribLocation(programs[1], "a_normal");

    p2a_skyboxVertPosAttr = gl.getAttribLocation(programs[2], "in_position");

    p3a_positionAttributeLocation = gl.getAttribLocation(programs[3], "a_position");
    p3a_uvAttributeLocation = gl.getAttribLocation(programs[3], "a_uv");
    p3a_normalAttributeLocation = gl.getAttribLocation(programs[3], "a_normal");
}

function getProgramUniformLocations() {
    p0u_wvpMatrixLocation = gl.getUniformLocation(programs[0], "u_wvpMatrix");
    p0u_nMatrixLocation = gl.getUniformLocation(programs[0], "u_nMatrix");
    p0u_wMatrixLocation = gl.getUniformLocation(programs[0], "u_wMatrix");
    p0u_textureLocation = gl.getUniformLocation(programs[0], "u_texture");
    p0u_lightDirLocation = gl.getUniformLocation(programs[0], "u_lightDir");
    p0u_lightColorLocation = gl.getUniformLocation(programs[0], "u_lightColor");
    p0u_ambientLightColorLocation = gl.getUniformLocation(programs[0], "u_ambientLightColor");
    p0u_specularColorLocation = gl.getUniformLocation(programs[0], "u_specularColor");
    p0u_specularGammaLocation = gl.getUniformLocation(programs[0], "u_specularGamma");
    p0u_metallicLocation = gl.getUniformLocation(programs[0], "u_metallic"); 


    p1u_wvpMatrixLocation = gl.getUniformLocation(programs[1], "u_wvpMatrix");
    p1u_materialDiffColorHandle = gl.getUniformLocation(programs[1], 'mDiffColor');
    p1u_lightDirectionHandle = gl.getUniformLocation(programs[1], 'lightDirection');
    p1u_lightColorHandle = gl.getUniformLocation(programs[1], 'lightColor');
    p1u_normalMatrixPositionHandle = gl.getUniformLocation(programs[1], 'u_nMatrix');

    p2u_skyboxTexHandle = gl.getUniformLocation(programs[2], "u_texture"); 
    p2u_inverseViewProjMatrixHandle = gl.getUniformLocation(programs[2], "inverseViewProjMatrix");

    p3u_wvpMatrixLocation = gl.getUniformLocation(programs[3], "u_wvpMatrix");
    p3u_nMatrixLocation = gl.getUniformLocation(programs[3], "u_nMatrix");
    p3u_wMatrixLocation = gl.getUniformLocation(programs[3], "u_wMatrix");
    p3u_textureLocation = gl.getUniformLocation(programs[3], "u_texture");
    p3u_lightDirLocation = gl.getUniformLocation(programs[3], "u_lightDir");
    p3u_lightColorLocation = gl.getUniformLocation(programs[3], "u_lightColor");
    p3u_ambientLightColorLocation = gl.getUniformLocation(programs[3], "u_ambientLightColor");
    p3u_specularColorLocation = gl.getUniformLocation(programs[3], "u_specularColor");
    p3u_specularGammaLocation = gl.getUniformLocation(programs[3], "u_specularGamma");
    p3u_metallicLocation = gl.getUniformLocation(programs[3], "u_metallic"); 
}
//#endregion

// called from HTML dropdown (onChange)
function setActiveSkybox(value) {
    activeSkyboxIndex = value;
}

async function main() {
    // expand and add listener for auto resize
    utils.resizeCanvasToDisplaySize(gl.canvas);

    createSkyboxVAO();
    // skybox must be loaded before inverting UV system
    let sbIndoorT = await loadSkybox('indoorSkybox/', '.jpg', 512);
    let sbVirtualT = await loadSkybox('virtualSkybox/', '.png', 1024);
    skyboxTextures.push(sbIndoorT, sbVirtualT);

    // flip Y axis in texture coordinates
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    getProgramAttributeLocations();
    getProgramUniformLocations();

    // generate textures from image files
    let t1 = await loadImage('Mole.png', gl.TEXTURE0);

    // load the models
    let cabinetModel = await loadModel('cabinet.obj');
    let hammerModel = await loadModel('hammer.obj');
    console.log("Hammer: ", hammerModel);
    let moleModel = await loadModel('mole.obj');

    // create the VAOs and the SceneNodes
    let drawInfo0 = createVaoP0(cabinetModel.vertices, cabinetModel.uv, cabinetModel.normals, cabinetModel.indices, t1);
    let drawInfo3 = createVaoP3(cabinetModel.vertices, cabinetModel.uv, cabinetModel.normals, cabinetModel.indices, t1);
    let cabinetNode = new SceneNode(utils.identityMatrix(), [drawInfo0, drawInfo3]);

    drawInfo0 = createVaoP0(hammerModel.vertices, hammerModel.uv, hammerModel.normals, hammerModel.indices, t1, false);
    drawInfo3 = createVaoP3(hammerModel.vertices, hammerModel.uv, hammerModel.normals, hammerModel.indices, t1, false);
    hammer = new Hammer();
    let hammerNode = new SceneNode(hammer.defaultPosition, [drawInfo0, drawInfo3]);

    drawInfo0 = createVaoP0(moleModel.vertices, moleModel.uv, moleModel.normals, moleModel.indices, t1, false);
    drawInfo3 = createVaoP3(moleModel.vertices, moleModel.uv, moleModel.normals, moleModel.indices, t1, false);

    moles.push(new Mole(-0.65, 0.2, false));        // left-back
    moles.push(new Mole(-0.32, 0.625, true));       // left-front
    moles.push(new Mole(0.0, 0.2, false));          // center-back
    moles.push(new Mole(0.32, 0.625, true));        // right-front
    moles.push(new Mole(0.65, 0.2, false));         // right-back

    // left
    let moleNode1 = new SceneNode(moles[0].getLocalMatrix(), [drawInfo0, drawInfo3]);     // back
    let moleNode2 = new SceneNode(moles[1].getLocalMatrix(), [drawInfo0, drawInfo3]);     // front
    
    // center
    let moleNode3 = new SceneNode(moles[2].getLocalMatrix(), [drawInfo0, drawInfo3]);

    // right
    let moleNode4 = new SceneNode(moles[3].getLocalMatrix(), [drawInfo0, drawInfo3]);     // front
    let moleNode5 = new SceneNode(moles[4].getLocalMatrix(), [drawInfo0, drawInfo3]);     // back
    
    moleNode1.setParent(cabinetNode);
    moleNode2.setParent(cabinetNode);
    moleNode3.setParent(cabinetNode);
    moleNode4.setParent(cabinetNode);
    moleNode5.setParent(cabinetNode);

    sceneRoots.push(cabinetNode, hammerNode);
    sceneObjects.push(cabinetNode, hammerNode, moleNode1, moleNode2, moleNode3, moleNode4, moleNode5);

    drawScene();
}


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
        bufferLength: indices.length,   // TODO: verify this is correct
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
        bufferLength: indices.length,   // TODO: verify this is correct
        vertexArray: vao
    }
}

/**
 * Create VAO for program3, returning node drawInfo
 * @param {number[]} vertices 
 * @param {number[]} uv 
 * @param {number[]} normals 
 * @param {number[]} indices 
 * @param {WebGLTexture} glTexture
 * @param {metallic} metallic is this object metallic? 
 * @returns {{ materialColor: number[], texture: WebGLTexture, programInfo: WebGLProgram, bufferLength: number, vertexArray: WebGLVertexArrayObject}} drawInfo
 */
function createVaoP3(vertices, uv, normals, indices, glTexture, metallic = false) {
    gl.useProgram(programs[3]);
    let vao = gl.createVertexArray();
    vaoArray.push(vao);
    gl.bindVertexArray(vao);

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(p3a_positionAttributeLocation);
    gl.vertexAttribPointer(p3a_positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    let uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(p3a_uvAttributeLocation);
    gl.vertexAttribPointer(p3a_uvAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    let normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(p3a_normalAttributeLocation);
    gl.vertexAttribPointer(p3a_normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    let indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        materialColor: null,
        texture: glTexture,
        programInfo : programs[3],
        bufferLength: indices.length,
        vertexArray: vao,
        uniforms: { 'metallic': metallic }
    }
}

function createSkyboxVAO() {
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
    // update the local matrices for each object
    animate();

    //update world matrixes of each object group
    sceneRoots.forEach(el => el.updateWorldMatrix());

    // compute scene matrices (shared by all objects)
    let perspectiveMatrix = utils.MakePerspective(90, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
    let cameraPos = [cameraX, 2.2, 3.0];
    let viewMatrix = utils.MakeLookAt(cameraPos, [0.0, 1.8, 0.0], [0.0, 1.0, 0.0]);
    let viewProjectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewMatrix);

    // Compute all the matrices for rendering
    sceneObjects.forEach(el => {
        let worldViewMatrix = utils.multiplyMatrices(viewMatrix, el.worldMatrix)
        let worldViewProjectionMatrix = utils.multiplyMatrices(perspectiveMatrix, worldViewMatrix);

        // Transform light direction from world to camera space
        let lightDirMatrix = utils.invertMatrix(utils.transposeMatrix(viewMatrix));
        let directionalLightDirTransformed = utils.multiplyMatrix3Vector3(
            utils.sub3x3from4x4((lightDirMatrix)), directionalLightDir);
        
        // Matrix used to compute normals -- invertion of world-view matrix
        let normalMatrix = utils.invertMatrix(utils.transposeMatrix(worldViewMatrix));
      
        // TODO: find best way to address multiple programs uniform assignment
        let activeDrawInfo = el.drawInfo[selectedGraphicsIndex];
        gl.useProgram(activeDrawInfo.programInfo);

        switch(activeDrawInfo.programInfo) {
            case programs[0]:
                //vs
                gl.uniformMatrix4fv(p0u_wvpMatrixLocation, gl.FALSE, utils.transposeMatrix(worldViewProjectionMatrix));
                gl.uniformMatrix4fv(p0u_nMatrixLocation, gl.FALSE, utils.transposeMatrix(normalMatrix));
                gl.uniformMatrix4fv(p0u_wMatrixLocation, gl.FALSE, utils.transposeMatrix(el.worldMatrix));

                //fs
                gl.uniform3fv(p0u_lightDirLocation, directionalLightDirTransformed);
                gl.uniform3fv(p0u_lightColorLocation, directionalLightColor);
                gl.uniform3fv(p0u_ambientLightColorLocation, ambientLightColor);

                gl.uniform3fv(p0u_cameraPosLocation, cameraPos);
                gl.uniform3fv(p0u_specularColorLocation, specularColor);
                gl.uniform1f(p0u_specularGammaLocation, specularGamma);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, activeDrawInfo.texture);
                gl.uniform1i(p0u_textureLocation, 0);

                gl.uniform1i(p0u_metallicLocation, activeDrawInfo.uniforms.metallic);
                break;
            case programs[1]:
                gl.uniformMatrix4fv(p1u_wvpMatrixLocation, gl.FALSE, utils.transposeMatrix(worldViewProjectionMatrix));
                gl.uniformMatrix4fv(p1u_normalMatrixPositionHandle, gl.FALSE, utils.transposeMatrix(normalMatrix));

                gl.uniform3fv(p1u_materialDiffColorHandle, activeDrawInfo.materialColor);
                // TODO: light hardcoded for test
                gl.uniform3fv(p1u_lightColorHandle, [1.0, 1.0, 1.0]);
                gl.uniform3fv(p1u_lightDirectionHandle, [-1.0, 0.0, 0.0]);
                break;
            case programs[3]:
                //vs
                gl.uniformMatrix4fv(p3u_wvpMatrixLocation, gl.FALSE, utils.transposeMatrix(worldViewProjectionMatrix));
                gl.uniformMatrix4fv(p3u_nMatrixLocation, gl.FALSE, utils.transposeMatrix(normalMatrix));
                gl.uniformMatrix4fv(p3u_wMatrixLocation, gl.FALSE, utils.transposeMatrix(el.worldMatrix));

                //fs
                gl.uniform3fv(p3u_lightDirLocation, directionalLightDirTransformed);
                gl.uniform3fv(p3u_lightColorLocation, directionalLightColor);
                gl.uniform3fv(p3u_ambientLightColorLocation, ambientLightColor);

                gl.uniform3fv(p3u_cameraPosLocation, cameraPos);
                gl.uniform3fv(p3u_specularColorLocation, specularColor);
                gl.uniform1f(p3u_specularGammaLocation, specularGamma);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, activeDrawInfo.texture);
                gl.uniform1i(p3u_textureLocation, 0);

                gl.uniform1i(p3u_metallicLocation, activeDrawInfo.uniforms.metallic);
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

    programs.push(await generateProgram(shadersDir + 'lambert-phong/'));   // 0: lambert reflection, phong specular
    programs.push(await generateProgram(shadersDir + 'plainColor/')); // 1: plain diffuse
    programs.push(await generateProgram(shadersDir + 'skybox/')); // 2: skybox
    programs.push(await generateProgram(shadersDir + 'lambert-blinn/'));   // 3: lambert reflection, blinn specular

    gl.useProgram(programs[0]);

    main();
}

function keyDownListener(e){
    switch (e.code) {
        case 'KeyQ':
            cameraX = utils.clamp(cameraX - 0.05, -CAMERA_X_MAX, CAMERA_X_MAX);
            break;
        case 'KeyE':
            cameraX = utils.clamp(cameraX + 0.05, -CAMERA_X_MAX, CAMERA_X_MAX);
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
        case 'Enter':
        case 'Space':
            // this flag will trigger the animation in animate(), the logic is handled by the class
            hammer.swinging = true;
            break;
        default:
            break;
    }
}

// launch init() when page is loaded
window.onload = init;
// add listener for keyboard commands (down are better for hold commands)
window.addEventListener("keydown", keyDownListener, false);
window.addEventListener("keyup", keyUpListener, false);
