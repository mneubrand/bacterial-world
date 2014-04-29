/* Author:

*/
// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

// window.requestAnimFrame = (function(){
  // return  function( callback ){
            // window.setTimeout(callback, 1000 / 10);
          // };
// })();

var imagePaths = [ 'bg', 'ground', 'lk_body', 'lk_leg', 'red_cell',
                   'heart', 'num/0', 'num/1', 'num/2', 'num/3',
                   'num/4', 'num/5', 'num/6', 'num/7', 'num/8',
                   'num/9', 'al_leg', 'al_body', 'al_body2', 'al_leg2',
                   'intro', 'lk_body2', 'lk_body3', 'lk_body4' ];
var loaded = 0;
var images = new Array();
var sprites = new Array();
var luke, al;

var backgroundPos = 0;
var groundPos = 0;
   
var canvas, ctx;
var collisionCanvas;

var STOPPED = 0, RUNNING = 1;
var START_JUMP = 2, JUMPING = 3;
var START_SLIDE = 4, SLIDING = 5;
var status = STOPPED;
var al_status = STOPPED;

var lives = 3;
var lost = false;
var hit = 0;
var score = 0;
var scrollingSpeed = 6;
var lastSpawn = 0;
var lastSpeedup = 0;

function Sprite(x, y, name) {
  this.x = x;
  this.y = y;
  this.name = name;
  
  this.update = function() {
    this.x-=scrollingSpeed;
  };
  this.draw = function(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.drawImage(images[this.name], 0, 0);
    ctx.restore();
  };
  return this;
}

function Luke(x, y) {
  this.x = x;
  this.y = y;
  
  this.legAngle1 = 0;
  this.legAngle2 = 0;
  this.bodyAngle = 0;
  this.multiplier = 1;
  
  this.offsetY = 0;
  this.offsetBodyY = 0;
  this.offsetLegY = 0;
  this.delay = 0;
  this.lostDelay = 0;

  this.update = function() {
    if(status == RUNNING) {
      this.legAngle1+=this.multiplier * 4;
      this.legAngle2-=this.multiplier * 4;
      this.bodyAngle+=this.multiplier / 2;
      if(this.legAngle1 > 15 || this.legAngle1 < -15) {
        this.multiplier*=-1;
      }
    } else if(status == START_JUMP) {
      this.bodyAngle=10;
      this.legAngle1=14;
      this.legAngle2=14;
      this.multiplier=1;
      this.speed=6.84 + scrollingSpeed/3;
      status = JUMPING;
      document.getElementById('jump').play();
    } else if(status == JUMPING) {
      if(this.delay > 0) {
        this.delay--;
      } else {
        this.offsetY-=this.multiplier * this.speed;
        this.speed-=this.multiplier * 0.3;
      }
      
      if(this.offsetY < -160 && this.multiplier == 1) {
        this.multiplier=-1;
      }
      if(this.offsetY > 0) {
        this.offsetY=0;
        this.bodyAngle=0;
        this.legAngle1=0;
        this.legAngle2=0;
        status = RUNNING; 
        document.getElementById('jump').play();
      }
    } else if(status == START_SLIDE) {
      document.getElementById('slide').play();
      this.legAngle1=-90;
      this.legAngle2=-90;
      this.multiplier=1;
      this.speed=0.5 * scrollingSpeed;
      status = SLIDING;
    } else if(status == SLIDING) {
      if(this.delay > 0) {
        this.delay--;
      } else {
        this.offsetBodyY+=this.multiplier * this.speed;
        this.speed-=this.multiplier * 0.1;
      }
      
      if(this.offsetBodyY > 34 && this.multiplier == 1) {
        this.multiplier=-1;
        this.delay = 300 / scrollingSpeed;
      }
      if(this.offsetBodyY < 0) {
        this.offsetBodyY=0;
        this.offsetLegY=0;
        this.legAngle1=0;
        this.legAngle2=0;
        status = RUNNING; 
      }
      this.offsetLegY = this.offsetBodyY * 0.8;
    }
    
    if(lost) {
      this.bodyAngle=20;
      this.offsetLegY=0;
      this.legAngle1=0;
      this.legAngle2=0;
      this.bodyAngle=0;
      this.offsetY=0;
    }
  };
  this.draw = function(ctx) {
    if(hit > 0) {
      hit--;
      if(Math.floor(hit/10) % 2 == 1) {
        return;
      }
    }
    ctx.save();
    ctx.translate(this.x, this.y + this.offsetY);
    
    //draw leg 1
    ctx.save();
    ctx.translate(51, 82 + this.offsetLegY);
    ctx.rotate(this.legAngle1 * (Math.PI/180));
    ctx.translate(-51, -82 - this.offsetLegY);
    ctx.drawImage(images['lk_leg'], 33, 75 + this.offsetLegY);
    ctx.restore();
    
    //draw leg 2
    ctx.save();
    ctx.translate(46, 87 + this.offsetLegY);
    ctx.rotate(this.legAngle2 * (Math.PI/180));
    ctx.translate(-46, -87 - this.offsetLegY);
    ctx.drawImage(images['lk_leg'], 28, 80 + this.offsetLegY);
    ctx.restore();
    
    //draw body
    ctx.translate(50, 47);
    ctx.rotate(this.bodyAngle * (Math.PI/180));
    ctx.translate(-50, -47);
    ctx.translate(0, this.offsetBodyY);
    var body = 'lk_body';
    if(lost && status == STOPPED) {
      body = Math.floor(this.lostDelay/10) % 2 == 1 ? 'lk_body4' : 'lk_body3';
      this.lostDelay++;
    } else if(status == RUNNING || status == STOPPED) {
      body = 'lk_body';
    } else {
      body = 'lk_body2';
    }
    ctx.drawImage(images[body], 0, 0);
    
    ctx.restore();
  };
  this.collidesWith = function(sprite) {
    var tx1 = this.x;
    var ty1 = this.y + this.offsetY + this.offsetBodyY;
    var rx1 = sprite.x;
    var ry1 = sprite.y;
    var tx2 = tx1; tx2 += 100;
    var ty2 = ty1; ty2 += 130;
    var rx2 = rx1; rx2 += images[sprite.name].width;
    var ry2 = ry1; ry2 += images[sprite.name].height;
    if (tx1 < rx1) tx1 = rx1;
    if (ty1 < ry1) ty1 = ry1;
    if (tx2 > rx2) tx2 = rx2;
    if (ty2 > ry2) ty2 = ry2;
    tx2 -= tx1;
    ty2 -= ty1;
    
    // if we got overlap => check if any of the pixels collide
    if(tx2 > 0 && ty2 > 0) {
      //get temporary context from collision canvas
      var tempCtx = collisionCanvas.getContext('2d');
      tempCtx.clearRect(0, 0, collisionCanvas.width, collisionCanvas.height);
      luke.draw(tempCtx);
      var imgData1 = tempCtx.getImageData(tx1, ty1, tx2, ty2);
      
      tempCtx.clearRect(0, 0, collisionCanvas.width, collisionCanvas.height);
      sprite.draw(tempCtx);
      var imgData2 = tempCtx.getImageData(tx1, ty1, tx2, ty2);
      
      for(var px=0;px<tx2*ty2*4;px+=4){
        //If we have to non-transparent pixels at the same position we have a collision
        if(imgData1.data[px+3] != 0 && imgData2.data[px+3] != 0) {
          /*imgData2.data[px] = 0;
          imgData2.data[px+1] = 0;
          imgData2.data[px+2] = 0;*/
          this.collision = true;
          break;
        }
      }
      
      //tempCtx.clearRect(0, 0, collisionCanvas.width, collisionCanvas.height);
      //tempCtx.putImageData(imgData2, 0, 0);
    }
  };
  return this;
}

function Al(x, y) {
  this.x = x;
  this.y = y;
  
  this.legAngle1 = 0;
  this.legAngle2 = 0;
  this.bodyAngle = 0;
  this.multiplier = 1;
  
  this.offsetY = 0;
  this.offsetBodyY = 0;
  this.offsetLegY = 0;
  this.delay = 0;
  this.lostDelay = 0;
  this.distract = false;

  this.update = function() {
    if(al_status == RUNNING) {
      this.legAngle1+=this.multiplier * 4;
      this.legAngle2-=this.multiplier * 4;
      this.bodyAngle+=this.multiplier / 2;
      if(this.legAngle1 > 15 || this.legAngle1 < -15) {
        this.multiplier*=-1;
      }
    } else if(al_status == START_JUMP) {
      this.bodyAngle=10;
      this.legAngle1=60;
      this.legAngle2=-60;
      this.multiplier=1;
      this.speed=6.84 + scrollingSpeed/3;
      al_status = JUMPING;
      document.getElementById('jump').play();
    } else if(al_status == JUMPING) {
      if(this.delay > 0) {
        this.delay--;
      } else {
        this.offsetY-=this.multiplier * this.speed;
        this.speed-=this.multiplier * 0.3;
      }
      
      if(this.offsetY < -160 && this.multiplier == 1) {
        this.multiplier=-1;
      }
      
      if(this.offsetY > 0) {
        this.offsetY=0;
        this.bodyAngle=0;
        this.legAngle1=0;
        this.legAngle2=0;
        al_status = RUNNING; 
        document.getElementById('jump').play();
      }
    } else if(al_status == START_SLIDE) {
      document.getElementById('al_slide').play();
      this.legAngle1=-90;
      this.legAngle2=-90;
      this.multiplier=1;
      this.speed=0.5 * scrollingSpeed;
      al_status = SLIDING;
    } else if(al_status == SLIDING) {
      if(this.delay > 0) {
        this.delay--;
      } else {
        this.offsetBodyY+=this.multiplier * this.speed;
        this.speed-=this.multiplier * 0.1;
      }
      
      if(this.offsetBodyY > 34 && this.multiplier == 1) {
        this.multiplier=-1;
        this.delay = 300 / scrollingSpeed;
      }
      if(this.offsetBodyY < 0) {
        this.offsetBodyY=0;
        this.offsetLegY=0;
        this.legAngle1=0;
        this.legAngle2=0;
        al_status = RUNNING; 
      }
      this.offsetLegY = this.offsetBodyY * 1.1;
    }
    
    if(lost) {
      this.bodyAngle=0;
      this.offsetLegY=0;
      this.legAngle1=0;
      this.legAngle2=0;
      this.bodyAngle=0;
      this.offsetY=0;
      if(this.lostDelay < 80 && this.lostDelay % 10 == 0) {
        this.multiplier *=-1;
        this.offsetBodyY += this.multiplier * 5;
      }
      this.lostDelay++;
    }
  };
  this.draw = function(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y + this.offsetY);
    //console.log(this.x + "," + this.y);
    
    //draw leg 1
    ctx.save();
    ctx.translate(17, 90 + this.offsetLegY);
    ctx.rotate(this.legAngle1 * (Math.PI/180));
    ctx.translate(-17, -90 - this.offsetLegY);
    ctx.drawImage(lost ? images['al_leg2'] : images['al_leg'], 12, 85 + this.offsetLegY);
    ctx.restore();
    
    //draw leg 2
    ctx.save();
    ctx.translate(21, 83 + this.offsetLegY);
    ctx.rotate(this.legAngle2 * (Math.PI/180));
    ctx.translate(-21, -83 - this.offsetLegY);
    ctx.drawImage(lost ? images['al_leg2'] : images['al_leg'], 16, 78 + this.offsetLegY);
    ctx.restore();
    
    //draw body
    ctx.translate(19, 100);
    ctx.rotate(this.bodyAngle * (Math.PI/180));
    ctx.translate(-19, -100);
    ctx.translate(0, this.offsetBodyY);
    ctx.drawImage(lost ? images['al_body2'] : images['al_body'], lost ? 20 : 0, 0);
    
    ctx.restore();
  };
}
    
function loop() {
  requestAnimFrame(loop);
  
  al.update();
  if(status != STOPPED) {
    score++;
    
    //spawn new sprite if enough time has expired
    if(score - lastSpawn > 90) {
      sprites.push(new Sprite(1000, Math.random() > 0.5 ? 350 : 270, 'red_cell'));
      lastSpawn = score;
      if(Math.random() > 0.75) {
        al.distract = true;
      }
    }
    
    //increase speed every 10 seconds
    var currTime = new Date().getTime();
    if(currTime - lastSpeedup > 10000) {
      scrollingSpeed += 2;
      lastSpeedup = currTime;
    }
    
    luke.update();
    luke.collision = false;
    
    for(var i=0; i<sprites.length; i++) {
      //update positions
      sprites[i].update();
      
      //check for collisions
      if(!luke.collision && hit == 0 && sprites[i].name != 'intro') {
        luke.collidesWith(sprites[i]);
      }
      
      //remove sprites which aren't rendered anymore
      if(sprites[i].x + images[sprites[i].name].width < 0) {
        sprites.splice(0, 1);
        i--;
        continue;
      }
      
      //check if we need al to do something
      var prediction =  al.distract ? 300 : 80;
      if(al_status == RUNNING && sprites[i].name == 'red_cell' 
          && al.x + prediction > sprites[i].x && al.x < sprites[i].x + images[sprites[i].name].width) {
        if(sprites[i].y == 350) {
          al_status = al.distract ? START_SLIDE : START_JUMP;
        } else if(sprites[i].y == 270) {
          al_status = al.distract ? START_JUMP : START_SLIDE;
        }
        if(al.distract) {
          al.needMove = true;
        }
        al.distract = false;
      }
      
      //check if we should have the sprite jump
      var check = sprites[i].y == 270 ? al.x - 80 : al.x;
      if(al.needMove && check > sprites[i].x && !sprites[i].screw 
          && al.x < sprites[i].x + images[sprites[i].name].width && sprites[i].name != 'intro') {
        sprites[i].y = (sprites[i].y == 270) ? 350 : 270;
        sprites[i].screw = true;
        document.getElementById('lift').play();
        al.needMove = false;
      }
    }
    
    //scroll background and ground
    backgroundPos-=scrollingSpeed;
    groundPos-=scrollingSpeed;
    if(backgroundPos<-985) {
      backgroundPos = 0;
    }
    if(groundPos<-800) {
      groundPos = 0;
    }
  }
  
  //reduce lives if there was a collision
  if(luke.collision) {
    lives--;
    hit = 90;
    
    if(!lost) {
      document.getElementById('hit').play();
    }
        
    //end game
    if(lives == 0) {
      al_status = STOPPED;
      status = STOPPED;
      lost = true;
      document.getElementById('bg').pause();
      
      al.offsetBodyY = 0;
      
      document.getElementById('evil').play();
    }
  }
  
  //clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  //draw background
  ctx.drawImage(images['bg'], -185 + backgroundPos, 0);
  ctx.drawImage(images['bg'], 800 + backgroundPos, 0);
  
  //draw ground
  ctx.drawImage(images['ground'], groundPos, 398);
  ctx.drawImage(images['ground'], 800 + groundPos, 398);
  
  //draw sprites
  for(var i=0; i<sprites.length; i++) {
    sprites[i].draw(ctx);
  }
  
  //draw main chars
  luke.draw(ctx);
  al.draw(ctx);
  
  //draw lives
  for(var i=0; i<lives; i++) {
    ctx.drawImage(images['heart'], 10 + i * 50, 10); 
  }
  
  //draw score
  var x = 800 - score.toString().length * 30;
  for(var i=0; i<score.toString().length; i++) {
    ctx.drawImage(images['num/' + score.toString().charAt(i)], x + i * 30, 10);
  }
}

function init() {
  canvas = document.getElementById('c');
  ctx = canvas.getContext('2d');
  
  collisionCanvas = document.createElement('canvas');
  //collisionCanvas = document.getElementById('c2');
  collisionCanvas.width = canvas.width;
  collisionCanvas.height = canvas.height;
  
  luke = new Luke(50, 290);
  al = new Al(650, 290);
  
  sprites.push(new Sprite(80, 120, 'intro'));
  
  for(var i = 0; i<imagePaths.length; i++) {
    var image = new Image();
    image.onload = function() {
      loaded++;

      if(loaded == imagePaths.length) {
        requestAnimFrame(loop);
      }
    }
    image.src = 'img/' + imagePaths[i] + '.png';
    images[imagePaths[i]] = image;
  }  
}

function keyListener(e) {
  if (status == STOPPED && e.keyCode == 32  && !lost) { // space
    status = RUNNING;  
    al_status = RUNNING;
    document.getElementById('bg').play();
  } 
  
  if (status == RUNNING) {
    if (e.keyCode == 87 || e.keyCode == 38) { // w or up arrow
      status = START_JUMP;  
    } else if (e.keyCode == 83 || e.keyCode == 40) { // s or down arrow
      status = START_SLIDE;  
    }
  }
  
  if(e.keyCode == 82) { // r
    document.getElementById('bg').pause();
    document.getElementById('bg').currentPosition = 0;
    
    sprites = new Array();
    
    luke = new Luke(50, 290);
    al = new Al(650, 290);
  
    sprites.push(new Sprite(80, 120, 'intro'));
    
    backgroundPos = 0;
    groundPos = 0;
       
    status = STOPPED;
    al_status = STOPPED;
    
    lives = 3;
    lost = false;
    hit = 0;
    score = 0;
    scrollingSpeed = 6;
    lastSpawn = 0;
    lastSpeedup = 0;
  }
}

$(document).ready(init);
$(document).keydown(keyListener);