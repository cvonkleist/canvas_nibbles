var ctx;
var intervalId;
var WIDTH;
var HEIGHT;
var playerX, playerY, oldX, oldY;
var tailLength;
var direction;
var itemX, itemY, itemType, itemCount;
var points;
var messages, comboHoverMessage;
var lastItemTime, itemCombo;

// player movement directions
const UP = 0, DOWN = 1, LEFT = 2, RIGHT = 3;

// game over types
const OFF_SCREEN = 0, TOUCHING_TAIL = 1;

const PLAYER_WIDTH = 10, PLAYER_HEIGHT = 10;
const MOVE_DELTA = 5; // how far the player moves per loop (in pixels)

// item shape and varieties
const ITEM_WIDTH = 5, ITEM_HEIGHT = 5;
const ITEM_TYPE_COUNT = 2;
const FRUIT = 0, TURBO = 1;

const ITEM_POINTS = [];
ITEM_POINTS[FRUIT] = 100;
ITEM_POINTS[TURBO] = 500;

const MAX_ITEM_COUNT = 10;
const COMBO_TIME = 3000; // time between getting items to achieve combo (ms)

// color
const PLAYER_COLOR = '#000';
const MESSAGE_COLOR = '#060';
const ITEM_COLOR = [];
ITEM_COLOR[FRUIT] = '#f00';
ITEM_COLOR[TURBO] = '#00f';

// start a new game, resetting everything
function start() {
  // reset everything
  playerX = 100;
  playerY = 100;
  oldX = []; oldY = [];
  direction = RIGHT;
  tailLength = 0;
  itemX = []; itemY = []; itemType = [];
  itemCount = 0;
  points = 0;
  lastItemTime = 0;
  itemCombo = 0;
  comboHoverMessage = null;
  messages = [];
  messages.push(["gogogogogo!", 30, null, null]);

  $(document).unbind('keydown');
  $(document).keydown(onKeyDown);

  // start game loop
  intervalId = setInterval(draw, 100);
}

// clear entire screen
function clear() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
}

function drawPlayer() {
  ctx.fillStyle = PLAYER_COLOR;
  ctx.beginPath();
  ctx.rect(playerX, playerY, 10, 10);
  ctx.closePath();
  ctx.fill();
  for(i = 0; i < tailLength; i++) {
    ctx.beginPath();
    ctx.rect(oldX[i], oldY[i], 10, 10);
    ctx.closePath();
    ctx.fill();
  }
}

// draw bonus items
function drawItems() {
  var x, y, color;
  for(i = 0; i < itemCount; i++) {
    x = itemX[i]; y = itemY[i]; type = itemType[i];
    color = ITEM_COLOR[type];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.rect(x, y, ITEM_WIDTH, ITEM_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }
}

// draw score
function drawPoints() {
  ctx.font = "10pt Arial";
  ctx.fillText('points: ' + points, 5, 15);
}

// show temporary messages at top of screen
function drawMessages() {
  var defaultY = 10;
  ctx.fillStyle = MESSAGE_COLOR;
  ctx.font = "10pt Arial";
  for(i = 0; i < messages.length; i++) {
    message = messages[i];
    text = message[0]; duration = (message[1] -= 1); x = message[2]; y = message[3];
    if(x == null) x = WIDTH / 2;
    if(y == null) {
      y = defaultY; defaultY += 15;
    }

    ctx.fillText(text, x, y);

    // delete message when its time is up
    if(duration == 0) {
      messages.splice(i, 1);
      i -= 1;
    }
  }
}

// game loop
function draw() {
  clear();

  // keep track of snake's tail
  oldX.unshift(playerX);
  oldY.unshift(playerY);
  if(oldX.length > tailLength) {
    oldX.pop();
    oldY.pop();
  }

  // move player in current direction
  switch(direction) {
    case RIGHT: playerX += MOVE_DELTA; break;
    case LEFT: playerX -= MOVE_DELTA; break;
    case UP: playerY -= MOVE_DELTA; break;
    case DOWN: playerY += MOVE_DELTA; break;
  }

  // adds a bonus item sometimes
  randomlyAddItem();

  // build screen
  drawItems();
  drawPlayer();
  drawPoints();
  drawMessages();

  detectItemCollisions();

  if(!playerIsOnScreen()) {
    gameOver(OFF_SCREEN);
  }
  if(playerIsTouchingTail()) {
    gameOver(TOUCHING_TAIL);
  }
}

// handle keys while game is running
function onKeyDown(evt) {
  switch(evt.keyCode) {
    case 32: tailLength += 1; break;
    case 37: if(tailLength == 0 || direction != RIGHT) direction = LEFT; break;
    case 38: if(tailLength == 0 || direction != DOWN) direction = UP; break;
    case 39: if(tailLength == 0 || direction != LEFT) direction = RIGHT; break;
    case 40: if(tailLength == 0 || direction != UP) direction = DOWN; break;
    case 88: cheatAddFourCombo(); break;
  }
}

function detectItemCollisions() {
  var x, y;
  for(i = 0; i < itemCount; i++) {
    x = itemX[i]; y = itemY[i]; type = itemType[i];
    itemPoints = ITEM_POINTS[type];
    if(x >= playerX - ITEM_WIDTH && x < playerX + PLAYER_WIDTH &&
      y >= playerY - ITEM_HEIGHT && y < playerY + PLAYER_HEIGHT) {
      tailLength += 1;
      itemX.splice(i, 1); itemY.splice(i, 1); itemType.splice(i, 1);
      itemCount -= 1;
      i -= 1;
      points += itemPoints;
      messages.push(['' + itemPoints, 4, x, y]);

      // combo?
      if(sinceLastItem() < COMBO_TIME) {
        var m = null, bonusPoints = 0;
        itemCombo += 1;
        switch(itemCombo) {
          case 2: m = 'double item bonus!'; bonusPoints = 1000; break;
          case 3: m = 'triple item bonus!'; bonusPoints = 3000; break;
          case 4: m = 'QUADRUPLE PENETRATION!@#!#!'; bonusPoints = 10000; itemCombo = 1; break;
        }
        if(m) {
          messages.push([m, 20, null, null]);
          if(!comboHoverMessage || comboHoverMessage[1] == 0)
            comboHoverMessage = [];
          comboHoverMessage.splice(0, 4, '' + bonusPoints + ' combo', 12, x, y + 15);
          if(messages.indexOf(comboHoverMessage) == -1)
            messages.push(comboHoverMessage);
          points += bonusPoints;
        }
      } else {
        itemCombo = 1;
      }
      lastItemTime = millis();
    }
  }
}

// milliseconds since epoch
function millis() {
  var now = new Date();
  return now.getTime();
}

// time since player got last bonus item (for combos)
function sinceLastItem() {
  return millis() - lastItemTime;
}

// adds a new bonus item sometimes
function randomlyAddItem() {
  if(itemCount < MAX_ITEM_COUNT &&
    Math.floor(Math.random() * 10) == 0)
    addItem();
  else if(itemCount < MAX_ITEM_COUNT &&
    Math.floor(Math.random() * 20) == 0)
    cheatAddFourCombo(); // just for demo purposes
}

// adds a random bonus item at a random position
function addItem() {
  itemX[itemCount] = Math.floor(Math.random() * WIDTH);
  itemY[itemCount] = Math.floor(Math.random() * HEIGHT);
  itemType[itemCount] = Math.floor(Math.random() * ITEM_TYPE_COUNT);
  itemCount += 1;
}

// cheat for testing combos
function cheatAddFourCombo() {
  var x = Math.floor(Math.random() * WIDTH);
  var y = Math.floor(Math.random() * HEIGHT);
  for(i = 0; i < 4; i++) {
    itemX.push(x);
    itemY.push(y);
    itemType.push(Math.floor(Math.random() * ITEM_TYPE_COUNT));
    itemCount += 1;
    x += 20;
  }
}

// false if the player is moving off of the screen
function playerIsOnScreen() {
  if(playerX <= 0 || playerY <= 0 ||
    playerX >= WIDTH - 10 || playerY >= HEIGHT - 10)
    return false;
  return true;
}

// true if player has run into own tail
function playerIsTouchingTail() {
  var x, y;
  for(i = 0; i < tailLength; i++) {
    x = oldX[i]; y = oldY[i];
    if(x > playerX - MOVE_DELTA && x < playerX + MOVE_DELTA &&
      y > playerY - MOVE_DELTA && y < playerY + MOVE_DELTA) {
      return true;
    }
  }
  return false;
}

function gameOver(reason) {
  var message;
  clearInterval(intervalId);
  clear();
  switch(reason) {
    case OFF_SCREEN: message = "walls not taste so good for you to eating"; break;
    case TOUCHING_TAIL: message = "why you try to fly through body of own self?"; break;
    default: message = "sweet death"; break;
  }
  ctx.font = "20pt Arial";
  ctx.fillStyle = MESSAGE_COLOR;
  ctx.fillText("Game over, bitches!@#!@#!", WIDTH / 2 - 150, HEIGHT / 2, 300);
  ctx.font = "10pt Arial";
  ctx.fillText(message, WIDTH / 2 - 125, HEIGHT / 2 + 20, 250);
  ctx.fillText("press space key to continue", WIDTH / 2 - 75, HEIGHT / 2 + 35, 150);

  // wait for space key
  $(document).unbind('keydown');
  $(document).keydown(spaceKeyToRestart);
}

// restart game on space key (after game over)
function spaceKeyToRestart(evt) {
  switch(evt.keyCode) {
    case 32: start(); break;
  }
}

function intro() {
  clear();
  ctx.font = "20pt Arial";
  ctx.fillStyle = MESSAGE_COLOR;
  ctx.fillText("SUPER GAY FUNTIME NIBBLES", WIDTH / 2 - 150, HEIGHT / 2, 300);
  ctx.font = "10pt Arial";
  ctx.fillText("pless space key to pray", WIDTH / 2 - 75, HEIGHT / 2 + 35, 150);

  // wait for space key
  $(document).keydown(spaceKeyToRestart);
}

function init() {
  var canvas = $('#canvas');
  ctx = canvas[0].getContext("2d");
  WIDTH = canvas.width();
  HEIGHT = canvas.height();
}

init();
intro();
