const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

const BLOCK_ROWS = 5;
const BLOCK_COLS = 10;
const BLOCK_WIDTH = 74;
const BLOCK_HEIGHT = 37;
const BLOCK_PADDING = 4;
const BLOCK_OFFSET_TOP = 40;
const BLOCK_OFFSET_LEFT = ( CANVAS_WIDTH - ( BLOCK_COLS * BLOCK_WIDTH + ( BLOCK_COLS - 1 ) * BLOCK_PADDING ) ) / 2;
const BLOCK_ROW_COLORS = [ 'red', 'cyan', 'green', 'magenta', 'yellow' ];

const PADDLE_WIDTH = 162;
const PADDLE_HEIGHT = 14;

const BALL_RADIUS = 8;
const BALL_MAX_BOUNCE_ANGLE = ( 75 * Math.PI ) / 180;

const POINTS_PER_BLOCK = 10;
const INITIAL_LIVES = 3;
const HIGH_SCORE_KEY = 'arkanoid_highscore';
const SPEED_UP_EVERY_BLOCKS = 10;
const SPEED_UP_FACTOR = 1.05;

const RESTART_BUTTON = { width: 200, height: 44 };

let paddle;
let ball;
let blocks;
let explosions;
let gameState;
let highScore = Number( localStorage.getItem( HIGH_SCORE_KEY ) ) || 0;

const ballBounceSound = new Audio( 'assets/sounds/ball-bounce.mp3' );
const breakSound = new Audio( 'assets/sounds/break-sound.mp3' );
let hasUserInteracted = false;

function playSound( audio ) {
  if ( !hasUserInteracted ) return;
  audio.currentTime = 0;
  audio.play().catch( () => {} );
}

function createBlocks() {
  const result = [];
  for ( let row = 0; row < BLOCK_ROWS; row++ ) {
    for ( let col = 0; col < BLOCK_COLS; col++ ) {
      result.push( {
        x: BLOCK_OFFSET_LEFT + col * ( BLOCK_WIDTH + BLOCK_PADDING ),
        y: BLOCK_OFFSET_TOP + row * ( BLOCK_HEIGHT + BLOCK_PADDING ),
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        color: BLOCK_ROW_COLORS[ row ],
        alive: true,
      } );
    }
  }
  return result;
}

function resetPositions() {
  paddle.x = ( CANVAS_WIDTH - PADDLE_WIDTH ) / 2;
  paddle.y = CANVAS_HEIGHT - 30;

  ball.x = CANVAS_WIDTH / 2;
  ball.y = paddle.y - BALL_RADIUS;
  ball.dx = 3;
  ball.dy = -4;
}

function initGame() {
  paddle = {
    x: 0,
    y: 0,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 7,
  };

  ball = {
    x: 0,
    y: 0,
    radius: BALL_RADIUS,
    dx: 0,
    dy: 0,
    speed: 5,
  };

  resetPositions();

  blocks = createBlocks();
  explosions = [];
  gameState = {
    score: 0,
    lives: INITIAL_LIVES,
    isPaused: false,
    isGameOver: false,
    isWin: false,
    blocksDestroyed: 0,
  };
}

function finalizeHighScore() {
  if ( gameState.score > highScore ) {
    highScore = gameState.score;
    localStorage.setItem( HIGH_SCORE_KEY, String( highScore ) );
  }
}

function loseLife() {
  gameState.lives -= 1;
  resetPositions();
  if ( gameState.lives <= 0 ) {
    gameState.isGameOver = true;
    finalizeHighScore();
  }
}

function getRestartButtonRect() {
  return {
    x: CANVAS_WIDTH / 2 - RESTART_BUTTON.width / 2,
    y: CANVAS_HEIGHT / 2 + 30,
    width: RESTART_BUTTON.width,
    height: RESTART_BUTTON.height,
  };
}

function draw() {
  ctx.clearRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  blocks.forEach( block => {
    if ( !block.alive ) return;
    drawSprite( ctx, `block_${ block.color }`, block.x, block.y, block.width, block.height );
  } );

  drawSprite( ctx, 'paddle', paddle.x, paddle.y, paddle.width, paddle.height );
  drawSprite( ctx, 'ball', ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2 );

  explosions.forEach( explosion => {
    const elapsed = performance.now() - explosion.startTime;
    const frameIndex = Math.min( 3, Math.floor( elapsed / ( EXPLOSION_DURATION / 4 ) ) );
    const frame = EXPLOSION_FRAMES[ explosion.color ][ frameIndex ];
    drawFrame( ctx, frame, explosion.x, explosion.y, explosion.width, explosion.height );
  } );

  drawHud();

  if ( gameState.isGameOver || gameState.isWin ) {
    drawEndOverlay();
  } else if ( gameState.isPaused ) {
    drawPauseOverlay();
  }
}

function drawPauseOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText( 'Pausa (P para continuar)', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 );
}

function drawEndOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText( gameState.isWin ? '¡Ganaste!' : 'Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30 );

  const button = getRestartButtonRect();
  ctx.fillStyle = '#2a7';
  ctx.fillRect( button.x, button.y, button.width, button.height );
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText( 'Reiniciar (Enter)', CANVAS_WIDTH / 2, button.y + button.height / 2 );
}

function drawHud() {
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  ctx.fillText( `Score: ${ gameState.score }`, 10, 10 );

  ctx.textAlign = 'center';
  ctx.fillText( `Vidas: ${ gameState.lives }`, CANVAS_WIDTH / 2, 10 );

  ctx.textAlign = 'right';
  ctx.fillText( `High Score: ${ highScore }`, CANVAS_WIDTH - 10, 10 );
}

const keys = { left: false, right: false };

function clampPaddleX( x ) {
  return Math.max( 0, Math.min( CANVAS_WIDTH - paddle.width, x ) );
}

function handleKeyDown( e ) {
  hasUserInteracted = true;
  if ( e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ) keys.left = true;
  if ( e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ) keys.right = true;
  if ( ( gameState.isGameOver || gameState.isWin ) && e.key === 'Enter' ) {
    initGame();
  }
  if ( ( e.key === 'p' || e.key === 'P' ) && !gameState.isGameOver && !gameState.isWin ) {
    gameState.isPaused = !gameState.isPaused;
  }
}

function isPointInRect( x, y, rect ) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function handleCanvasClick( e ) {
  if ( !gameState.isGameOver && !gameState.isWin ) return;
  const rect = canvas.getBoundingClientRect();
  const clickX = ( e.clientX - rect.left ) * ( CANVAS_WIDTH / rect.width );
  const clickY = ( e.clientY - rect.top ) * ( CANVAS_HEIGHT / rect.height );
  if ( isPointInRect( clickX, clickY, getRestartButtonRect() ) ) {
    initGame();
  }
}

function handleKeyUp( e ) {
  if ( e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ) keys.left = false;
  if ( e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ) keys.right = false;
}

function handleMouseMove( e ) {
  hasUserInteracted = true;
  const rect = canvas.getBoundingClientRect();
  const mouseX = ( e.clientX - rect.left ) * ( CANVAS_WIDTH / rect.width );
  paddle.x = clampPaddleX( mouseX - paddle.width / 2 );
}

document.addEventListener( 'keydown', handleKeyDown );
document.addEventListener( 'keyup', handleKeyUp );
canvas.addEventListener( 'mousemove', handleMouseMove );
canvas.addEventListener( 'click', handleCanvasClick );

function update() {
  if ( gameState.isGameOver || gameState.isWin || gameState.isPaused ) return;
  if ( keys.left ) paddle.x = clampPaddleX( paddle.x - paddle.speed );
  if ( keys.right ) paddle.x = clampPaddleX( paddle.x + paddle.speed );
  updateBall();
  explosions = explosions.filter( explosion => performance.now() - explosion.startTime < EXPLOSION_DURATION );
}

function ballIntersectsRect( rect ) {
  const closestX = Math.max( rect.x, Math.min( ball.x, rect.x + rect.width ) );
  const closestY = Math.max( rect.y, Math.min( ball.y, rect.y + rect.height ) );
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return dx * dx + dy * dy <= ball.radius * ball.radius;
}

function checkBlockCollisions() {
  for ( const block of blocks ) {
    if ( !block.alive ) continue;
    if ( !ballIntersectsRect( block ) ) continue;

    block.alive = false;
    gameState.score += POINTS_PER_BLOCK;
    gameState.blocksDestroyed += 1;
    if ( gameState.blocksDestroyed % SPEED_UP_EVERY_BLOCKS === 0 ) {
      increaseBallSpeed();
    }
    if ( blocks.every( b => !b.alive ) ) {
      gameState.isWin = true;
      finalizeHighScore();
    }
    explosions.push( {
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      color: block.color,
      startTime: performance.now(),
    } );
    playSound( breakSound );

    const blockCenterX = block.x + block.width / 2;
    const blockCenterY = block.y + block.height / 2;
    const overlapX = Math.abs( ball.x - blockCenterX ) / ( block.width / 2 );
    const overlapY = Math.abs( ball.y - blockCenterY ) / ( block.height / 2 );
    if ( overlapX > overlapY ) {
      ball.dx = -ball.dx;
    } else {
      ball.dy = -ball.dy;
    }
    break;
  }
}

function increaseBallSpeed() {
  const magnitude = Math.sqrt( ball.dx * ball.dx + ball.dy * ball.dy );
  const newSpeed = ball.speed * SPEED_UP_FACTOR;
  if ( magnitude > 0 ) {
    const scale = newSpeed / magnitude;
    ball.dx *= scale;
    ball.dy *= scale;
  }
  ball.speed = newSpeed;
}

function bounceOffPaddle() {
  const paddleCenter = paddle.x + paddle.width / 2;
  const relativeImpact = ( ball.x - paddleCenter ) / ( paddle.width / 2 );
  const clampedImpact = Math.max( -1, Math.min( 1, relativeImpact ) );
  const angle = clampedImpact * BALL_MAX_BOUNCE_ANGLE;

  ball.dx = ball.speed * Math.sin( angle );
  ball.dy = -ball.speed * Math.cos( angle );
  ball.y = paddle.y - ball.radius;
}

function updateBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  if ( ball.y - ball.radius > CANVAS_HEIGHT ) {
    loseLife();
    return;
  }

  if ( ball.x - ball.radius <= 0 ) {
    ball.x = ball.radius;
    ball.dx = -ball.dx;
    playSound( ballBounceSound );
  } else if ( ball.x + ball.radius >= CANVAS_WIDTH ) {
    ball.x = CANVAS_WIDTH - ball.radius;
    ball.dx = -ball.dx;
    playSound( ballBounceSound );
  }

  if ( ball.y - ball.radius <= 0 ) {
    ball.y = ball.radius;
    ball.dy = -ball.dy;
    playSound( ballBounceSound );
  }

  checkBlockCollisions();

  const hitsPaddleY = ball.dy > 0 && ball.y + ball.radius >= paddle.y && ball.y + ball.radius <= paddle.y + paddle.height;
  const hitsPaddleX = ball.x + ball.radius >= paddle.x && ball.x - ball.radius <= paddle.x + paddle.width;
  if ( hitsPaddleY && hitsPaddleX ) {
    bounceOffPaddle();
    playSound( ballBounceSound );
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame( loop );
}

loadSpritesheet( () => {
  initGame();
  requestAnimationFrame( loop );
} );
