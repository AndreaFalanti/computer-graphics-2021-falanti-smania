// timer
let timeLimit = 10;
let timePassed = 0;
let timeLeft = timeLimit;
let timerID = timeLimit;
let playing = false;

let score = 0;

//#region Timer functions
function setTimer(value) {
    // If the timer is running, don't do anything
    if (playing == true) {
        alert("You cannot change options while game is running!");
        return;
    }
    else {
        timeLimit = value;
        document.getElementById("timer").innerHTML = timeLimit;
        console.log("Timer changed to " + timeLimit);
    }
}

function startTimer() {
    // If the timer is running, don't do anything
    if (playing === true) {
        console.log("Timer running, 'Start' had no effect");
        return;
    }
    else {
        resetTimer(timerID);

        timerID = setInterval(() => {
            timePassed = timePassed + 1;
            timeLeft = timeLimit - timePassed;
            document.getElementById("timer").innerHTML = timeLeft;
    
            if (timeLeft === 0) {
                clearInterval(timerID);
                togglePlayingStatus();
            }
        }, 1000);
    }
}

function resetTimer(timerID) {
    // Stop timer if running
    clearInterval(timerID),

    // Reset values
    timePassed = 0;
    timeLeft = timeLimit;
    timerID = timeLimit;
    playing = false;

    document.getElementById("timer").innerHTML = timerID;
}
//#endregion

/**
 * Handle game related aspects of an eventual hammer hit
 * @param {Hammer} hammer 
 * @param {Mole[]} moles
 */
function handlePossibleHammerHit(hammer, moles) {
    if (!hammer.hitting)
        return;

    hammer.hitting = false;
    if (moles[hammer.currentPosition].hittable) {
        // TODO: play sound
        score += 100;
        // update UI
        document.getElementById("score-text").innerHTML = `Score: ${score}`;
    }
}

function startGame() {
    score = 0;
    startTimer();
    togglePlayingStatus();
    document.getElementById("score-text").innerHTML = `Score: ${score}`;
}

function togglePlayingStatus() {
    playing = !playing
    document.getElementById("start-button").disabled = playing;
    document.getElementById("reset-button").disabled = !playing;
}
