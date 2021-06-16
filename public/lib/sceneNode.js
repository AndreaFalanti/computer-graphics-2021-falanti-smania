'use strict';

//example taken from webGLTutorial2, refactored into a class
class SceneNode {
    /**
     * Create a scene node
     * @param {number[]} localMatrix 
     * @param {{ materialColor: number[], texture: WebGLTexture, programInfo: WebGLProgram, bufferLength: number, vertexArray: WebGLVertexArrayObject}} drawInfo 
     */
    constructor(localMatrix, drawInfo) {
        this.children = [];
        this.localMatrix = localMatrix;
        this.worldMatrix = utils.identityMatrix();
        this.drawInfo = drawInfo;
    }

    setParent(parent) {
        // remove us from our parent
        if (this.parent) {
            var ndx = this.parent.children.indexOf(this);
            if (ndx >= 0) {
                this.parent.children.splice(ndx, 1);
            }
        }

        // Add us to our new parent
        if (parent) {
            parent.children.push(this);
        }
        this.parent = parent;
    }

    /**
     * Update node world matrix, accordingly to parent node.
     * @param {number[]} matrix Parent world matrix or none if it's a scene root
     */
    updateWorldMatrix(matrix=null) {
        // if no matrix is passed, just copy local matrix (shallow copy of elements, but are primitives so it works)
        // no matrix is passed for scene roots, while children receive the parent world matrix
        this.worldMatrix = (matrix) ? utils.multiplyMatrices(matrix, this.localMatrix) : [...this.localMatrix];

        // now process all the children
        this.children.forEach(child => child.updateWorldMatrix(this.worldMatrix));
    }
}