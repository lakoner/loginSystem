var socket = io()

const roomsTable = document.getElementById('roomsTable') 
const messageContainer = document.getElementById('message-container')   

var myTurn = true;
var symbol;

if(roomsTable == null) {
    // We are in the room view
    const roomName = window.location.pathname.split('/').pop()
    const username = await getLoggedUserUsername()
    socket.emit('new-player', roomName, username)

    // Binding buttons on the board
    $(function() {
        $(".board button").attr("disabled", true); // Disable board at the beginning
        $(".board> button").on("click", makeMove);
    });
} 

// We are in the rooms list view
socket.on('room-created', room => {
    var newRow = roomsTable.insertRow();

    var nameCell = newRow.insertCell();
    var roomName = document.createTextNode(room);
    nameCell.appendChild(roomName);

    var linkCell = newRow.insertCell()
    var roomLink = document.createElement('a')
    roomLink.href = `/rooms/${room}`
    roomLink.innerText = 'Join Room'
    linkCell.appendChild(roomLink)
})

socket.on('user-connected', name => {
    appendMessage(`${name} connected`)
})

socket.on('user-disconnected', name => {
    appendMessage(`${name} disconnected`)
})

// Bind event on players move
socket.on("move.made", function(data) {
    $("#" + data.position).text(data.symbol); // Render move

    // If the symbol of the last move was the same as the current player
    // means that now is opponent's turn
    myTurn = data.symbol !== symbol;

    if (!isGameOver()) { // If game isn't over show who's turn is this
        renderTurnMessage();
    } else { // Else show win/lose message
        if (myTurn) {
            $("#message").text("You lost.");
        } else {
            $("#message").text("You won!");
        }

        $(".board button").attr("disabled", true); // Disable board
    }
});

// Bind event for game begin
socket.on("game.begin", function(data) {
    symbol = data.symbol; // The server is assigning the symbol
    myTurn = symbol === "X"; // 'X' starts first
    renderTurnMessage();
});

// Bind on event for opponent leaving the game
socket.on("opponent.left", function() {
    $("#message").text("Your opponent left the game.");
    $(".board button").attr("disabled", true);
});

async function getLoggedUserUsername() {
    try {
        var loggedUserData = [];
        var data = [];
        var username;
        const response = await fetch('/logged_user_data');

        if (!response.ok) {
            throw new Error('Network response was not OK');
        }
        data.push((await response.json()))
        loggedUserData.push(data[0].user);
        username = loggedUserData[0].username;

        return username;
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    }
}

function appendMessage(message) {
    const messageElement = document.createElement('div')
    messageElement.innerText = message
    messageContainer.append(messageElement)
}

function getBoardState() {
var obj = {};

/* We are creating an object where each attribute corresponds
    to the name of a cell (r0c0, r0c1, ..., r2c2) and its value is
    'X', 'O' or '' (empty).
*/
$(".board button").each(function() {
    obj[$(this).attr("id")] = $(this).text() || "";
});

return obj;
}

function isGameOver() {
    var state = getBoardState();
    var matches = ["XXX", "OOO"]; // This are the string we will be looking for to declare the match over

    // We are creating a string for each possible winning combination of the cells
    var rows = [
    state.r0c0 + state.r0c1 + state.r0c2, // 1st line
    state.r1c0 + state.r1c1 + state.r1c2, // 2nd line
    state.r2c0 + state.r2c1 + state.r2c2, // 3rd line
    state.r0c0 + state.r1c0 + state.r2c0, // 1st column
    state.r0c1 + state.r1c1 + state.r2c1, // 2nd column
    state.r0c2 + state.r1c2 + state.r2c2, // 3rd column
    state.r0c0 + state.r1c1 + state.r2c2, // Primary diagonal
    state.r0c2 + state.r1c1 + state.r2c0  // Secondary diagonal
    ];

    // Loop through all the rows looking for a match
    for (var i = 0; i < rows.length; i++) {
        if (rows[i] === matches[0] || rows[i] === matches[1]) {
            return true;
        }
    }

    return false;
}

function renderTurnMessage() {
    if (!myTurn) { // If not player's turn disable the board
        $("#message").text("Your opponent's turn");
        $(".board button").attr("disabled", true);
    } else { // Enable it otherwise
        $("#message").text("Your turn.");
        $(".board button").removeAttr("disabled");
    }
}

function makeMove(e) {
    if (!myTurn) {
        return; // Shouldn't happen since the board is disabled
    }

    if ($(this).text().length) {
        return; // If cell is already checked
    }

    socket.emit("make.move", { // Valid move (on client side) -> emit to server
        symbol: symbol,
        position: $(this).attr("id")
    });
}

