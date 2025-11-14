let song;
let fft;
let amplitude;
let startButton;
let experienceStarted = false;
let loadingAudio = false;
let loadError = false;

let lasers = [];
let embers = [];

let beatThreshold = 170;
let beatDecayRate = 0.95;
let beatHoldFrames = 24;
let beatCutoff = beatThreshold;
let framesSinceLastBeat = beatHoldFrames;

let boomboxGlow = 0;
let overlayAlpha = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  angleMode(DEGREES);
  rectMode(CORNER);
  noStroke();

  startButton = createButton('Enter the Rave');
  styleStartButton(startButton);
  positionStartButton();
  startButton.mousePressed(handleStart);

  overlayAlpha = 0;
}

function draw() {
  if (experienceStarted && fft && amplitude) {
    const spectrum = fft.analyze(1024);
    const bass = fft.getEnergy(20, 140);
    const mid = fft.getEnergy(140, 2000);
    const treble = fft.getEnergy(2000, 8000);
    const level = amplitude.getLevel();

    drawRaveField(bass, mid, treble);

    const beat = detectBeat(bass);
    if (beat) {
      triggerPulse(bass);
    }

    updateLasers();
    updateEmbers();
    drawBoomBox({ bass, mid, treble, level, spectrum });
    drawTrackOverlay();

    boomboxGlow = lerp(boomboxGlow, 0, 0.1);
    overlayAlpha = max(overlayAlpha - 1.5, 0);
  } else {
    drawIdleField();
    drawStartOverlay();
  }

  if (loadError) {
    drawLoadError();
  }
}

function handleStart() {
  if (loadingAudio) {
    return;
  }

  userStartAudio().then(() => {
    if (!song) {
      loadingAudio = true;
      startButton.html('Loading track…');
      song = loadSound(
        'assets/song-in-my-mind-axwell-edit.mp3',
        () => {
          loadingAudio = false;
          startButton.html('Start the Rave');
          startExperience();
        },
        () => {
          loadingAudio = false;
          loadError = true;
          startButton.html('Track missing');
        }
      );
    } else if (song.isLoaded()) {
      startExperience();
    }
  });
}

function startExperience() {
  if (!song || !song.isLoaded() || experienceStarted) {
    return;
  }

  fft = new p5.FFT(0.9, 1024);
  amplitude = new p5.Amplitude();
  fft.setInput(song);
  amplitude.setInput(song);

  song.setVolume(0.9);
  song.loop();

  experienceStarted = true;
  overlayAlpha = 100;
  boomboxGlow = 0;
  beatCutoff = beatThreshold;
  framesSinceLastBeat = beatHoldFrames;

  if (startButton) {
    startButton.remove();
    startButton = null;
  }
}

function detectBeat(energy) {
  if (energy > beatCutoff) {
    beatCutoff = energy * 1.05;
    framesSinceLastBeat = 0;
    return true;
  }

  if (framesSinceLastBeat <= beatHoldFrames) {
    framesSinceLastBeat++;
  } else {
    beatCutoff *= beatDecayRate;
    beatCutoff = max(beatCutoff, beatThreshold);
  }

  return false;
}

function triggerPulse(bass) {
  boomboxGlow = 70;

  const beamCount = floor(map(bass, 120, 255, 6, 16));
  const hueBase = (frameCount * 2) % 360;

  for (let i = 0; i < beamCount; i++) {
    const angle = random(360);
    const hue = (hueBase + random(40)) % 360;
    lasers.push(new LaserBeam(angle, hue));
  }

  for (let i = 0; i < 24; i++) {
    embers.push(new Ember(bass));
  }
}

function updateLasers() {
  if (lasers.length === 0) return;

  blendMode(ADD);
  for (let i = lasers.length - 1; i >= 0; i--) {
    lasers[i].update();
    lasers[i].draw();
    if (lasers[i].isFinished() || lasers.length > 80) {
      lasers.splice(i, 1);
    }
  }
  blendMode(BLEND);
}

function updateEmbers() {
  if (embers.length === 0) return;

  blendMode(ADD);
  for (let i = embers.length - 1; i >= 0; i--) {
    embers[i].update();
    embers[i].draw();
    if (embers[i].isFinished() || embers.length > 120) {
      embers.splice(i, 1);
    }
  }
  blendMode(BLEND);
}

function drawRaveField(bass, mid, treble) {
  background(0, 0, 5);

  noStroke();
  const layers = 7;
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const hue = (frameCount * 0.5 + t * 80 + map(mid, 0, 255, 0, 50)) % 360;
    const brightness = 25 + t * 55 + map(treble, 0, 255, 0, 20);
    fill(hue, 70, constrain(brightness, 10, 100), 40);
    rect(0, i * (height / layers), width, height / layers + 2);
  }

  push();
  translate(width / 2, height / 2);
  const bassPulse = map(bass, 0, 255, 120, min(width, height) * 0.9);
  fill((frameCount * 0.8) % 360, 80, 100, 18);
  ellipse(0, 0, bassPulse);
  fill((frameCount * 0.6 + 120) % 360, 90, 100, 12);
  ellipse(0, 0, bassPulse * 0.7);
  pop();

  stroke((frameCount * 2) % 360, 60, 90, 18);
  strokeWeight(1.5);
  noFill();
  const spacing = map(mid, 0, 255, 65, 35);
  for (let y = -spacing * 2; y <= height + spacing * 2; y += spacing) {
    beginShape();
    for (let x = -spacing; x <= width + spacing; x += spacing) {
      const wave = sin(frameCount * 2 + (x + y) * 0.35) * map(treble, 0, 255, 2, 10);
      vertex(x, y + wave);
    }
    endShape();
  }
}

function drawIdleField() {
  const bass = map(sin(frameCount * 0.03), -1, 1, 60, 140);
  const mid = map(sin(frameCount * 0.04 + 1.2), -1, 1, 50, 110);
  const treble = map(sin(frameCount * 0.05 + 2.3), -1, 1, 40, 130);
  drawRaveField(bass, mid, treble);
}

function drawBoomBox({ bass, mid, treble, level, spectrum }) {
  push();
  translate(width / 2, height / 2 + map(level, 0, 0.5, 0, 16));
  const scaleFactor = min(width, height) / 760;
  scale(scaleFactor);

  rectMode(CENTER);
  stroke(220, 60, 40, 40 + boomboxGlow);
  strokeWeight(7);
  fill(220, 40, 20, 38 + boomboxGlow);
  rect(0, 80, 540, 340, 45);

  noStroke();
  fill(220, 60, 30, 45 + boomboxGlow);
  rect(0, 80, 540, 340, 45);

  fill(220, 25, 12, 65);
  rect(0, -30, 520, 120, 30);

  drawEqualizer(spectrum);

  drawSpeaker(-180, 80, bass, mid);
  drawSpeaker(180, 80, bass, treble);

  drawCenterDisplay(level);
  drawKnobs(level);

  rectMode(CORNER);
  pop();
}

function drawEqualizer(spectrum) {
  push();
  translate(0, -30);
  rectMode(CENTER);
  const bars = 18;
  const barWidth = 14;
  const spacing = 12;
  const startX = -((bars - 1) * (barWidth + spacing)) / 2;

  for (let i = 0; i < bars; i++) {
    const index = floor(map(i, 0, bars - 1, 0, spectrum.length - 1));
    const energy = spectrum[index];
    const barHeight = map(energy, 0, 255, 8, 160);
    const hue = (frameCount * 1.2 + i * 14) % 360;
    fill(hue, 90, 90, 82);

    rect(startX + i * (barWidth + spacing), -20 - barHeight / 2, barWidth, barHeight, 6);
  }
  pop();
}

function drawSpeaker(x, y, bass, energy) {
  push();
  translate(x, y);
  const pulse = map(bass, 60, 255, 0, 70);
  const hue = (frameCount * 1.5 + energy * 0.5) % 360;

  stroke(220, 60, 20, 55 + boomboxGlow);
  strokeWeight(6);
  fill(220, 20, 10, 25);
  ellipse(0, 0, 240 + pulse);

  noStroke();
  fill(220, 30, 18, 40);
  ellipse(0, 0, 200 + pulse * 0.7);

  fill(220, 40, 18, 50);
  ellipse(0, 0, 160 + pulse * 0.5);

  blendMode(ADD);
  fill(hue, 90, 90, 70);
  ellipse(0, 0, 80 + pulse * 0.25);
  blendMode(BLEND);

  fill(0, 0, 5, 80);
  ellipse(0, 0, 40 + pulse * 0.2);
  pop();
}

function drawCenterDisplay(level) {
  push();
  translate(0, -90);
  const glow = map(level, 0, 0.5, 0, 40);
  fill((frameCount * 1.5) % 360, 90, 95, 60 + glow);
  rect(0, 0, 260, 80, 22);

  fill(0, 0, 10, 80);
  rect(0, 0, 220, 50, 18);

  const bars = 5;
  const gap = 12;
  const baseX = -((bars - 1) * gap) / 2;
  for (let i = 0; i < bars; i++) {
    const h = map(level, 0, 0.5, 12, 38) + sin(frameCount * 3 + i * 0.6) * 12;
    const hue = (frameCount * 2 + i * 30) % 360;
    fill(hue, 90, 90, 85);
    rect(baseX + i * gap, 0, 6, h, 3);
  }
  pop();
}

function drawKnobs(level) {
  push();
  translate(0, 180);
  const knobPositions = [-160, 0, 160];

  for (let i = 0; i < knobPositions.length; i++) {
    push();
    translate(knobPositions[i], 0);
    fill(220, 35, 16, 50);
    ellipse(0, 0, 70);

    fill(220, 25, 10, 25);
    ellipse(0, 0, 50);

    stroke(0, 0, 100, 85);
    strokeWeight(3);
    const angle = map(level, 0, 0.5, -70, 70) + i * 25;
    line(0, 0, cos(angle) * 24, sin(angle) * 24);
    pop();
  }
  pop();
}

function drawTrackOverlay() {
  if (overlayAlpha <= 0) {
    return;
  }

  fill(0, 0, 100, overlayAlpha);
  textAlign(CENTER, CENTER);
  textSize(20);
  text('Now playing: "Song In My Mind" (Axwell Edit)', width / 2, 48);
}

function drawStartOverlay() {
  fill(0, 0, 100, 90);
  textAlign(CENTER, CENTER);
  textSize(46);
  text('Boombox Beat Rave', width / 2, height / 2 - 150);

  textSize(18);
  text('Drop "song-in-my-mind-axwell-edit.mp3" into the assets folder.', width / 2, height / 2 - 60);
  text('Then tap "Enter the Rave" to launch the experience.', width / 2, height / 2 - 20);

  if (loadingAudio) {
    textSize(16);
    text('Loading track…', width / 2, height / 2 + 40);
  }
}

function drawLoadError() {
  fill(0, 0, 100, 95);
  textAlign(CENTER, CENTER);
  textSize(16);
  text('Could not find assets/song-in-my-mind-axwell-edit.mp3', width / 2, height - 70);
  text('Add the track to that location and reload the page.', width / 2, height - 44);
}

function positionStartButton() {
  if (!startButton) return;
  startButton.position(width / 2 - 110, height / 2 + 90);
}

function styleStartButton(btn) {
  btn.style('font-size', '18px');
  btn.style('font-family', 'Arial, sans-serif');
  btn.style('font-weight', '600');
  btn.style('letter-spacing', '0.08em');
  btn.style('text-transform', 'uppercase');
  btn.style('padding', '16px 28px');
  btn.style('border', 'none');
  btn.style('border-radius', '14px');
  btn.style('background', 'linear-gradient(135deg, #ff0066, #ffcc00)');
  btn.style('color', '#ffffff');
  btn.style('box-shadow', '0 10px 30px rgba(255, 0, 102, 0.4)');
  btn.style('cursor', 'pointer');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  positionStartButton();
}

function touchStarted() {
  if (!experienceStarted && !loadingAudio && !loadError) {
    handleStart();
  }
  return false;
}

class LaserBeam {
  constructor(angle, hue) {
    this.angle = angle;
    this.hue = hue;
    this.length = min(width, height) * random(0.4, 0.6);
    this.speed = random(12, 18);
    this.alpha = 80;
    this.thickness = random(6, 14);
  }

  update() {
    this.length += this.speed;
    this.alpha *= 0.9;
  }

  draw() {
    push();
    translate(width / 2, height / 2);
    stroke(this.hue, 90, 100, this.alpha);
    strokeWeight(this.thickness);
    line(0, 0, cos(this.angle) * this.length, sin(this.angle) * this.length);
    pop();
  }

  isFinished() {
    return this.alpha < 5;
  }
}

class Ember {
  constructor(bass) {
    const spread = map(bass, 120, 255, 80, 160);
    this.pos = createVector(
      width / 2 + random(-spread, spread),
      height / 2 + random(40, 140)
    );
    this.vel = createVector(random(-1.4, 1.4), random(-4.2, -2));
    this.size = random(6, 12);
    this.hue = random(10, 45);
    this.alpha = 90;
  }

  update() {
    this.pos.add(this.vel);
    this.vel.y += 0.08;
    this.vel.x *= 0.98;
    this.alpha *= 0.92;
  }

  draw() {
    noStroke();
    fill(this.hue, 90, 100, this.alpha);
    ellipse(this.pos.x, this.pos.y, this.size);
  }

  isFinished() {
    return this.alpha < 4;
  }
}
