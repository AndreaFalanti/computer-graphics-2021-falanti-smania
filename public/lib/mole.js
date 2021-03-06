'use strict'

const MOLE_Y_UP_FRONT = 1.0;
const MOLE_Y_UP_BACK = 1.05;
const MOLE_Y_DOWN_FRONT = 0.55;
const MOLE_Y_DOWN_BACK = 0.6;
const Y_HITTABLE_RANGE = 0.1;

const SPEED_DELTA_Y = 1.5;    // vertical movement in 1 second

const randomTimerDown = () => 2 + Math.random() * 3;
const randomTimerUp = () => 1.5 + Math.random() * 1;

class Mole {
    /**
     * 
     * @param {number} tx 
     * @param {number} tz 
     * @param {boolean} front is the mole in front row?
     */
    constructor(tx, tz, front) {
        // timers that trigger a change of position (up or down)
        this.accumulatedTime = 0.0;
        this.deactivate();

        this.dir = -1;
        this.front = front;

        this.tx = tx;
        this.ty = (front) ? MOLE_Y_DOWN_FRONT : MOLE_Y_DOWN_BACK;
        this.tz = tz;

        this.yMax = (front) ? MOLE_Y_UP_FRONT : MOLE_Y_UP_BACK;
        this.yMin = (front) ? MOLE_Y_DOWN_FRONT : MOLE_Y_DOWN_BACK;

        this.cylinderMesh = {
            base: [tx, this.yMax - 0.28, tz],
            axis: [0, 1, 0],
            radius: 0.165
        }

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
                this.timerDown = randomTimerDown();
            }
        }
        else {
            if (this.accumulatedTime >= this.timerDown) {
                this.accumulatedTime = this.accumulatedTime % this.timerDown;
                this.dir = 1;
                this.timerUp = randomTimerUp();
            }
        }

        this.ty = utils.clamp(this.ty + this.dir * SPEED_DELTA_Y * deltaT, this.yMin, this.yMax);
        this.hittable = (this.ty >= this.yMax - Y_HITTABLE_RANGE);
    }

    getLocalMatrix() {
        return utils.MakeWorld(this.tx, this.ty, this.tz, 0.0, 0.0, 0.0, 1.0);
    }

    deactivate() {
        this.accumulatedTime = 0;
        this.timerUp = 0;
        this.timerDown = Number.POSITIVE_INFINITY;
    }

    activate() {
        this.accumulatedTime = 0;
        this.timerUp = randomTimerUp();
        this.timerDown = randomTimerDown();
    }

    /**
     * Should be performed when a mole is hit. Makes mole go down after hammer contact, even if timer is not triggered.
     */
    onHit() {
        // reset timer and go down
        this.accumulatedTime = 0;
        this.dir = -1;
        this.timerDown = randomTimerDown();
    }
}