const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

let paddle;
let ball;
let blocks;
let explosions;
let gameState;
let isLevelTransition;
let levelTransitionStartTime;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const ASPECT_RATIO = CANVAS_HEIGHT / CANVAS_WIDTH;
const MIN_DISPLAY_WIDTH = 320;
const MAX_DISPLAY_WIDTH = 800;

let DISPLAY_WIDTH = CANVAS_WIDTH;
let DISPLAY_HEIGHT = CANVAS_HEIGHT;
let SCALE = 1;

function resizeCanvas() {
  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight;
  let width = Math.min( availableWidth, availableHeight / ASPECT_RATIO );
  width = Math.max( MIN_DISPLAY_WIDTH, Math.min( MAX_DISPLAY_WIDTH, width ) );

  DISPLAY_WIDTH = Math.round( width );
  DISPLAY_HEIGHT = Math.round( DISPLAY_WIDTH * ASPECT_RATIO );
  canvas.width = DISPLAY_WIDTH;
  canvas.height = DISPLAY_HEIGHT;
  SCALE = DISPLAY_WIDTH / CANVAS_WIDTH;
}

const isTouchDevice = ( 'ontouchstart' in window ) || navigator.maxTouchPoints > 0;
const rotatePromptEl = document.getElementById( 'rotate-prompt' );
let pausedByRotatePrompt = false;

function updateRotatePrompt() {
  const isPortrait = window.innerHeight > window.innerWidth;
  const shouldShow = isTouchDevice && isPortrait;

  canvas.hidden = shouldShow;
  rotatePromptEl.hidden = !shouldShow;

  if ( !gameState ) return;

  if ( shouldShow && !gameState.isPaused ) {
    gameState.isPaused = true;
    pausedByRotatePrompt = true;
  } else if ( !shouldShow && pausedByRotatePrompt ) {
    gameState.isPaused = false;
    pausedByRotatePrompt = false;
  }
}

function handleViewportChange() {
  resizeCanvas();
  updateRotatePrompt();
}

window.addEventListener( 'resize', handleViewportChange );
window.addEventListener( 'orientationchange', handleViewportChange );
handleViewportChange();

const BLOCK_COLS = 10;
const BLOCK_WIDTH = 74;
const BLOCK_HEIGHT = 37;
const BLOCK_PADDING = 4;
const BLOCK_OFFSET_TOP = 40;
const BLOCK_OFFSET_LEFT = ( CANVAS_WIDTH - ( BLOCK_COLS * BLOCK_WIDTH + ( BLOCK_COLS - 1 ) * BLOCK_PADDING ) ) / 2;
const NORMAL_BLOCK_COLORS = [ 'red', 'cyan', 'green', 'magenta', 'yellow', 'hotpink' ];

const TOTAL_LEVELS = 10;
const BLOCK_ROWS_MIN = 4;
const BLOCK_ROWS_MAX = 9;
const HARD_BLOCK_START_LEVEL = 3;
const HARD_BLOCK_RATIO_STEP = 0.1;
const HARD_BLOCK_RATIO_MAX = 0.4;
const LEVEL_TRANSITION_DURATION = 2000;

const PADDLE_WIDTH = 162;
const PADDLE_HEIGHT = 14;

const BALL_RADIUS = 8;
const BALL_MAX_BOUNCE_ANGLE = ( 75 * Math.PI ) / 180;
const BALL_BASE_SPEED = 5;

const POINTS_PER_BLOCK = 10;
const INITIAL_LIVES = 3;
const HIGH_SCORE_KEY = 'arkanoid_highscore';
const MAX_LEVEL_KEY = 'arkanoid_max_level';
const SPEED_UP_EVERY_BLOCKS = 10;
const SPEED_UP_FACTOR = 1.05;

const RESTART_BUTTON = { width: 200, height: 44 };
const PAUSE_BUTTON = { width: 40, height: 40, margin: 10 };

let highScore = Number( localStorage.getItem( HIGH_SCORE_KEY ) ) || 0;

const ballBounceSound = new Audio( 'assets/sounds/ball-bounce.mp3' );
const breakSound = new Audio( 'assets/sounds/break-sound.mp3' );
let hasUserInteracted = false;

function playSound( audio ) {
  if ( !hasUserInteracted ) return;
  audio.currentTime = 0;
  audio.play().catch( () => {} );
}

function generateLevelConfig( level ) {
  const rows = BLOCK_ROWS_MIN + Math.round( ( level - 1 ) / ( TOTAL_LEVELS - 1 ) * ( BLOCK_ROWS_MAX - BLOCK_ROWS_MIN ) );
  const hardBlockRatio = level < HARD_BLOCK_START_LEVEL
    ? 0
    : Math.min( HARD_BLOCK_RATIO_MAX, Math.floor( ( level - 1 ) / 2 ) * HARD_BLOCK_RATIO_STEP );
  const speedMultiplier = 1 + 0.1 * ( level - 1 );
  return { rows, hardBlockRatio, speedMultiplier };
}

function gapModulus( level ) {
  return Math.max( 3, 7 - Math.floor( ( level - 1 ) / 2 ) );
}

function isGapCell( row, col, level ) {
  return ( row + col * 2 + level ) % gapModulus( level ) === 0;
}

function isHardCell( row, col, level, hardBlockRatio ) {
  if ( hardBlockRatio <= 0 ) return false;
  const hash = ( row * 6 + col + level * 3 ) % 10;
  return hash < Math.round( hardBlockRatio * 10 );
}

function createBlocks( level ) {
  const { rows, hardBlockRatio } = generateLevelConfig( level );
  const result = [];
  for ( let row = 0; row < rows; row++ ) {
    for ( let col = 0; col < BLOCK_COLS; col++ ) {
      if ( isGapCell( row, col, level ) ) continue;
      const isHard = isHardCell( row, col, level, hardBlockRatio );
      result.push( {
        x: BLOCK_OFFSET_LEFT + col * ( BLOCK_WIDTH + BLOCK_PADDING ),
        y: BLOCK_OFFSET_TOP + row * ( BLOCK_HEIGHT + BLOCK_PADDING ),
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        color: isHard ? 'gray' : NORMAL_BLOCK_COLORS[ row % NORMAL_BLOCK_COLORS.length ],
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

function applyLevelSpeed( level ) {
  const { speedMultiplier } = generateLevelConfig( level );
  ball.speed = BALL_BASE_SPEED * speedMultiplier;
  const magnitude = Math.sqrt( ball.dx * ball.dx + ball.dy * ball.dy );
  if ( magnitude > 0 ) {
    const scale = ball.speed / magnitude;
    ball.dx *= scale;
    ball.dy *= scale;
  }
}

function getStoredMaxLevel() {
  return Number( localStorage.getItem( MAX_LEVEL_KEY ) ) || 1;
}

function initGame( level ) {
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
    speed: BALL_BASE_SPEED,
  };

  resetPositions();

  applyLevelSpeed( level );
  blocks = createBlocks( level );
  explosions = [];
  isLevelTransition = false;
  levelTransitionStartTime = 0;
  gameState = {
    score: 0,
    lives: INITIAL_LIVES,
    isPaused: false,
    isGameOver: false,
    isWin: false,
    blocksDestroyedInLevel: 0,
    level,
  };
}

function persistMaxLevel( level ) {
  const storedMaxLevel = Number( localStorage.getItem( MAX_LEVEL_KEY ) ) || 0;
  if ( level > storedMaxLevel ) {
    localStorage.setItem( MAX_LEVEL_KEY, String( level ) );
  }
}

function advanceToNextLevel() {
  gameState.level += 1;
  gameState.blocksDestroyedInLevel = 0;
  blocks = createBlocks( gameState.level );
  resetPositions();
  applyLevelSpeed( gameState.level );
  isLevelTransition = false;
  persistMaxLevel( gameState.level );
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

function getPauseButtonRect() {
  return {
    x: CANVAS_WIDTH - PAUSE_BUTTON.width - PAUSE_BUTTON.margin,
    y: CANVAS_HEIGHT - PAUSE_BUTTON.height - PAUSE_BUTTON.margin,
    width: PAUSE_BUTTON.width,
    height: PAUSE_BUTTON.height,
  };
}

function draw() {
  ctx.setTransform( SCALE, 0, 0, SCALE, 0, 0 );
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
  } else if ( isLevelTransition ) {
    drawLevelTransitionOverlay();
  } else if ( gameState.isPaused ) {
    drawPauseOverlay();
    drawPauseButton();
  } else {
    drawPauseButton();
  }
}

function drawLevelTransitionOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText( `Nivel ${ gameState.level } completado`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 );
}

function drawPauseButton() {
  const btn = getPauseButtonRect();
  const cx = btn.x + btn.width / 2;
  const cy = btn.y + btn.height / 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect( btn.x, btn.y, btn.width, btn.height );
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect( btn.x, btn.y, btn.width, btn.height );

  ctx.fillStyle = '#fff';
  if ( gameState.isPaused ) {
    ctx.beginPath();
    ctx.moveTo( cx - 6, cy - 9 );
    ctx.lineTo( cx - 6, cy + 9 );
    ctx.lineTo( cx + 9, cy );
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect( cx - 8, cy - 9, 5, 18 );
    ctx.fillRect( cx + 3, cy - 9, 5, 18 );
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
  ctx.fillText( gameState.isWin ? '¡Ganaste el juego!' : 'Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30 );

  const button = getRestartButtonRect();
  ctx.fillStyle = '#2a7';
  ctx.fillRect( button.x, button.y, button.width, button.height );
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText( 'Reiniciar (Enter)', CANVAS_WIDTH / 2, button.y + button.height / 2 );
}

function drawLivesIndicator() {
  const size = BALL_RADIUS * 2;
  const gap = 6;
  const totalWidth = gameState.lives * size + ( gameState.lives - 1 ) * gap;
  let x = CANVAS_WIDTH / 2 - totalWidth / 2;

  for ( let i = 0; i < gameState.lives; i++ ) {
    drawSprite( ctx, 'ball', x, 8, size, size );
    x += size + gap;
  }
}

function drawHud() {
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  const scoreText = `Score: ${ gameState.score }`;
  ctx.fillText( scoreText, 10, 10 );
  const scoreWidth = ctx.measureText( scoreText ).width;
  ctx.fillText( `Nivel ${ gameState.level } / ${ TOTAL_LEVELS }`, 10 + scoreWidth + 20, 10 );

  drawLivesIndicator();

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
    initGame( 1 );
  }
  if ( ( e.key === 'p' || e.key === 'P' ) && !gameState.isGameOver && !gameState.isWin && !isLevelTransition ) {
    gameState.isPaused = !gameState.isPaused;
  }
}

function isPointInRect( x, y, rect ) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function handleTap( clientX, clientY ) {
  const rect = canvas.getBoundingClientRect();
  const x = ( clientX - rect.left ) * ( CANVAS_WIDTH / rect.width );
  const y = ( clientY - rect.top ) * ( CANVAS_HEIGHT / rect.height );

  if ( gameState.isGameOver || gameState.isWin ) {
    if ( isPointInRect( x, y, getRestartButtonRect() ) ) {
      initGame( 1 );
    }
    return;
  }

  if ( !isLevelTransition && isPointInRect( x, y, getPauseButtonRect() ) ) {
    gameState.isPaused = !gameState.isPaused;
  }
}

function handleCanvasClick( e ) {
  handleTap( e.clientX, e.clientY );
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

function movePaddleToTouch( touch ) {
  const rect = canvas.getBoundingClientRect();
  const touchX = ( touch.clientX - rect.left ) * ( CANVAS_WIDTH / rect.width );
  paddle.x = clampPaddleX( touchX - paddle.width / 2 );
}

function handleTouchStart( e ) {
  e.preventDefault();
  hasUserInteracted = true;
  if ( e.touches[ 0 ] ) movePaddleToTouch( e.touches[ 0 ] );
}

function handleTouchMove( e ) {
  e.preventDefault();
  hasUserInteracted = true;
  if ( e.touches[ 0 ] ) movePaddleToTouch( e.touches[ 0 ] );
}

function handleTouchEnd( e ) {
  e.preventDefault();
  const touch = e.changedTouches[ 0 ];
  if ( touch ) handleTap( touch.clientX, touch.clientY );
}

document.addEventListener( 'keydown', handleKeyDown );
document.addEventListener( 'keyup', handleKeyUp );
canvas.addEventListener( 'mousemove', handleMouseMove );
canvas.addEventListener( 'touchstart', handleTouchStart, { passive: false } );
canvas.addEventListener( 'touchmove', handleTouchMove, { passive: false } );
canvas.addEventListener( 'touchend', handleTouchEnd, { passive: false } );
canvas.addEventListener( 'click', handleCanvasClick );

function update() {
  if ( gameState.isGameOver || gameState.isWin || gameState.isPaused ) return;
  if ( isLevelTransition ) {
    if ( performance.now() - levelTransitionStartTime >= LEVEL_TRANSITION_DURATION ) {
      advanceToNextLevel();
    }
    return;
  }
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

    gameState.score += POINTS_PER_BLOCK;

    if ( block.color === 'gray' ) {
      block.color = 'red';
    } else {
      block.alive = false;
      gameState.blocksDestroyedInLevel += 1;
      if ( gameState.blocksDestroyedInLevel % SPEED_UP_EVERY_BLOCKS === 0 ) {
        increaseBallSpeed();
      }
      if ( blocks.every( b => !b.alive ) ) {
        if ( gameState.level < TOTAL_LEVELS ) {
          isLevelTransition = true;
          levelTransitionStartTime = performance.now();
        } else {
          gameState.isWin = true;
          finalizeHighScore();
        }
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
    }

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
  initGame( getStoredMaxLevel() );
  updateRotatePrompt();
  requestAnimationFrame( loop );
} );
