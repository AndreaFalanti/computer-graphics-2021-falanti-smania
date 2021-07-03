'use strict';

// Possible positions of the hammer
const HAMMER_POS_DEFAULT = utils.MakeWorld(1.5, 1.8, 1.0, 0.0, 0.0, 0.0, 1.0);     // idle, at right side of cabinet
const HAMMER_POS_0 = utils.MakeWorld(-0.65, 2.5, 1.4, 0.0, 0.0, 0.0, 1.0);         // left-back mole
const HAMMER_POS_1 = utils.MakeWorld(-0.32, 2.5, 1.8, 0.0, 0.0, 0.0, 1.0);         // left-front mole
const HAMMER_POS_2 = utils.MakeWorld(0.0, 2.5, 1.4, 0.0, 0.0, 0.0, 1.0);           // center-back mole
const HAMMER_POS_3 = utils.MakeWorld(0.32, 2.5, 1.8, 0.0, 0.0, 0.0, 1.0);          // right-front mole
const HAMMER_POS_4 = utils.MakeWorld(0.65, 2.5, 1.4, 0.0, 0.0, 0.0, 1.0);          // right-back mole

let hammerPositions = [HAMMER_POS_0, HAMMER_POS_1, HAMMER_POS_2, HAMMER_POS_3, HAMMER_POS_4];

const DELTA_RX = 850.0;
const MAX_SWING_RX = 85.0;

class Hammer { 
    constructor() {
        this.defaultPosition = HAMMER_POS_DEFAULT;
        this.currentPosition = 0;
        this.swinging = false;
        this.rx = 0;
        this.swingDir = -1;

        this.hitting = false;
    }

    /**
     * Change current hammer position based on provided index delta change. Used with keyboard commands.
     * @param {number} value Delta position, compared to current one
     * @returns {number[]} World matrix
     */
    changeCurrentPosition(value) {
        let newPos = this.currentPosition + value;

        // allow exceptional move on mole 4 to go on front line properly
        if (this.currentPosition === 4 && value === 1) {
            this.currentPosition = 3;
            console.log("Position changed to mole ", this.currentPosition);
        }
        else if ((this.currentPosition % 2 === 0 && value === -1) || (this.currentPosition % 2 === 1 && value === 1) || newPos < 0 || newPos > 4) {
            console.log("Invalid move");
        }
        else {
            this.currentPosition = newPos;
            console.log("Position changed to mole ", this.currentPosition);
        }
        
        return hammerPositions[this.currentPosition];
    }

    /**
     * Change current hammer position based on given position index value. Used with raycast.
     * @param {number} value Position index
     * @returns {number[]} World matrix 
     */
    setPosition(value) {
        this.currentPosition = value;
        return hammerPositions[this.currentPosition];
    }

    swingAnimation(deltaT) {
        deltaT = deltaT / 1000.0;   // in seconds

        this.rx = utils.clamp(this.rx + DELTA_RX * deltaT * this.swingDir, -MAX_SWING_RX, 0.0);

        if (this.rx === -MAX_SWING_RX) {
            this.swingDir = 1;
            this.hitting = true;
        }
        else if (this.rx === 0) {
            this.swingDir = -1;
            this.swinging = false;
        }

        // rotation with center in (0, -1, 0)
        return utils.multiplyMultipleMatrices(
            hammerPositions[this.currentPosition],
            utils.MakeTranslateMatrix(0, -1, 0),
            utils.MakeRotateXMatrix(this.rx),
            utils.MakeTranslateMatrix(0, 1, 0)
        );
    }
}