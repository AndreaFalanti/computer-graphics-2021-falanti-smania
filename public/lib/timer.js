let timeLimit = 10;
let timePassed = 0;
let timeLeft = timeLimit;
let timerID = timeLimit;
let timerRunning = false;

function setTimer(value) {
    // If the timer is running, don't do anything
    if (timerRunning == true) {
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
    if (timerRunning == true) {
        console.log("Timer running, 'Start' had no effect");
        return;
    }
    else {
        resetTimer(timerID);
        timerRunning = true;
        timerID = setInterval(() => {
            timePassed = timePassed + 1;
            timeLeft = timeLimit - timePassed;
            document.getElementById("timer").innerHTML = timeLeft;
    
            if (timeLeft == 0) {
                clearInterval(timerID);
                timerRunning = false;
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
    timerRunning = false;

    document.getElementById("timer").innerHTML = timerID;
}