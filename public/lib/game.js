// timer
let timeLimit = 20;
let timePassed = 0;
let timeLeft = timeLimit;
let timerID = timeLimit;
let playing = false;

let score = 0;
let highscore = 0;

const audioDir = 'assets/audio/';
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

let hammerSound;

async function loadAudioFile(filepath) {
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

async function loadAudioAssets() {
    hammerSound = await loadAudioFile(audioDir + 'hammer.mp3');
}

function playSound(audioBuffer) {
    const trackSource = audioCtx.createBufferSource();
    trackSource.buffer = audioBuffer;
    trackSource.connect(audioCtx.destination)
  
    trackSource.start();
  
    return trackSource;
  }

//#region Timer functions
function setTimer(value) {
    // If the timer is running, don't do anything
    if (playing) {
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
    if (playing) {
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
                setHighScore();
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
    let targetMole = moles[hammer.currentPosition];
    if (targetMole.hittable && playing) {
        playSound(hammerSound);
        targetMole.onHit();
        score += 100;
        // update UI
        document.getElementById("score-text").innerHTML = `Score: ${score}`;
    }
    // miss, reduce points
    else if (!targetMole.hittable && playing) {
        score -= 25;
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

function resetGame() {
    resetTimer(timerID);
    togglePlayingStatus();
}

function setHighScore() {
    if (score > highscore) {
        highscore = score;
        document.getElementById("best-score-text").innerHTML = `Highscore: ${highscore}`;
    }
}

function togglePlayingStatus() {
    playing = !playing;

    // in script.js
    if (playing) activateMoles();
    else deactivateMoles();

    document.getElementById("start-button").disabled = playing;
    document.getElementById("reset-button").disabled = !playing;
}
