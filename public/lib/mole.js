'use strict'

const MOLE_Y_UP_FRONT = 1.0;
const MOLE_Y_UP_BACK = 1.05;
const MOLE_Y_DOWN_FRONT = 0.55;
const MOLE_Y_DOWN_BACK = 0.6;
const Y_HITTABLE_RANGE = 0.1;

const SPEED_DELTA_Y = 1.1;    // vertical movement in 1 second

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

class Mole {
    /**
     * 
     * @param {number} tx 
     * @param {number} tz 
     * @param {boolean} front is the mole in front row?
     */
    constructor(tx, tz, front) {
        // timers that trigger a change of position (up or down)
        this.timerDown = 3 + Math.random() * 2;
        this.timerUp = 2 + Math.random() * 2;
        this.accumulatedTime = 0.0;

        this.dir = -1;
        this.front = front;

        this.tx = tx;
        this.ty = (front) ? MOLE_Y_DOWN_FRONT : MOLE_Y_DOWN_BACK;
        this.tz = tz;

        this.yMax = (front) ? MOLE_Y_UP_FRONT : MOLE_Y_UP_BACK;
        this.yMin = (front) ? MOLE_Y_DOWN_FRONT : MOLE_Y_DOWN_BACK;

        // defines if mole can be hit by hammer
        this.hittable = false;
    }

    animate(deltaT) {
        deltaT = deltaT / 1000.0;   // in seconds
        this.accumulatedTime += deltaT;

        if (this.dir === 1) {
            if (this.accumulatedTime >= this.timerUp) {
                this.accumulatedTime = this.accumulatedTime % this.timerUp;
                this.dir = -1;
                this.timerDown = 4 + Math.random() * 2;
            }
        }
        else {
            if (this.accumulatedTime >= this.timerDown) {
                this.accumulatedTime = this.accumulatedTime % this.timerDown;
                this.dir = 1;
                this.timerUp = 2 + Math.random() * 2;
            }
        }

        this.ty = utils.clamp(this.ty + this.dir * SPEED_DELTA_Y * deltaT, this.yMin, this.yMax);
        this.hittable = (this.ty >= this.yMax - Y_HITTABLE_RANGE);
    }

    getLocalMatrix() {
        return utils.MakeWorld(this.tx, this.ty, this.tz, 0.0, 0.0, 0.0, 1.0);
    }
}