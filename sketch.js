let mic, fft;
let rings = [];
let started = false;
let fadeText = 255;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noFill();

  mic = new p5.AudioIn();
  mic.start();

  fft = new p5.FFT(0.8, 64);
  fft.setInput(mic);

  textAlign(CENTER, CENTER);
  textSize(26);
}

function draw() {
  // subtle motion blur background
  background(0, 0, 0, 20);

  // additive blending for neon glow
  blendMode(ADD);

  // analyze sound
  let spectrum = fft.analyze();
  let bass = fft.getEnergy("bass");
  let mid = fft.getEnergy("mid");
  let treble = fft.getEnergy("treble");
  let level = mic.getLevel();

  // add new rings if volume is above threshold
  if (level > 0.02) {
    let numRings = floor(map(level, 0.02, 0.3, 1, 3));
    for (let i = 0; i < numRings; i++) {
      let ring = new LightRing(
        width / 2,
        height / 2,
        map(level, 0, 0.3, 50, 250),
        level * 300
      );
      rings.push(ring);
    }
  }

  // update and draw rings
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].update();
    rings[i].show();
    if (rings[i].alpha <= 0) rings.splice(i, 1);
  }

  // reset blend mode for boombox
  blendMode(BLEND);

  // draw boombox
  drawBoomBox(bass, level);

  // floating instructions
  if (!started && fadeText > 0) {
    fill(255, fadeText);
    text("🔊 Speak, play music, or tap to see the boom box pulse!", width / 2, height / 2 - 200);
  } else if (fadeText > 0) {
    fadeText -= 3;
  }
}

function mousePressed() {
  getAudioContext().resume();
  started = true;
}

function touchStarted() {
  getAudioContext().resume();
  started = true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ---------------- Boombox Drawing ----------------
function drawBoomBox(bass, level) {
  push();
  translate(width / 2, height / 2);

  let s = min(width, height) / 800;
  scale(s);

  let pulseScale = 1 + (level * 0.3);
  scale(pulseScale);

  // main body
  fill(220, 60, 30);
  rectMode(CENTER);
  rect(0, 0, 400, 300, 30);

  // accent lines
  stroke(180, 80, 60);
  strokeWeight(3);
  line(-180, -80, 180, -80);
  line(-180, 80, 180, 80);

  // left speaker
  let speakerPulse = map(bass, 0, 255, 0, 20);
  fill(240, 70, 20);
  noStroke();
  ellipse(-120, 0, 180 + speakerPulse);

  // left grill
  stroke(200, 80, 50);
  strokeWeight(2);
  for (let i = 0; i < 8; i++) {
    let r = 20 + i * 10;
    noFill();
    ellipse(-120, 0, r * 2);
  }

  // right speaker
  fill(240, 70, 20);
  noStroke();
  ellipse(120, 0, 180 + speakerPulse);

  // right grill
  stroke(200, 80, 50);
  strokeWeight(2);
  for (let i = 0; i < 8; i++) {
    let r = 20 + i * 10;
    noFill();
    ellipse(120, 0, r * 2);
  }

  // display panel
  fill(280, 80, 40);
  rect(0, -100, 200, 40, 10);

  // VU meter
  let meterWidth = map(level, 0, 0.3, 0, 90);
  fill(320, 90, 90);
  rect(-50, -100, meterWidth, 20, 5);

  // buttons
  fill(180, 70, 60);
  ellipse(-80, 100, 40);
  ellipse(0, 100, 40);
  ellipse(80, 100, 40);

  pop();
}

// ---------------- LightRing Class ----------------
class LightRing {
  constructor(x, y, size, alpha) {
    this.pos = createVector(x, y);
    this.size = size;
    this.hue = random(200, 360);
    this.alpha = alpha;
    this.growth = map(size, 50, 250, 2, 6);
  }

  update() {
    this.size += this.growth;
    this.alpha -= map(this.growth, 2, 6, 3, 1);
  }

  show() {
    noFill();
    strokeWeight(map(this.size, 50, 250, 2, 8));
    stroke(this.hue, 80, 100, this.alpha);
    ellipse(this.pos.x, this.pos.y, this.size);
  }
}
