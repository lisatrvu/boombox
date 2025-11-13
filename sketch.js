let fft;
let rings = [];
let started = false;
let fadeText = 255;
let startButton, fileInput, audioPlayer;
let audioContext;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noFill();

  // Create audio player (hidden)
  audioPlayer = createAudio();
  audioPlayer.id('audioPlayer');
  audioPlayer.style('display', 'none');
  audioPlayer.elt.crossOrigin = 'anonymous';

  // Create file input
  fileInput = createFileInput(handleFile);
  fileInput.style('font-size', '16px');
  fileInput.style('padding', '10px');
  fileInput.position(width / 2 - 120, height / 2 - 80);

  // Create play button
  startButton = createButton('▶ Play & Visualize');
  startButton.style('font-size', '18px');
  startButton.style('padding', '12px 24px');
  startButton.style('border-radius', '12px');
  startButton.style('border', 'none');
  startButton.style('background', '#ff3366');
  startButton.style('color', 'white');
  startButton.style('cursor', 'pointer');
  startButton.position(width / 2 - 80, height / 2 - 25);
  startButton.mousePressed(startVisualization);
}

function handleFile(file) {
  if (file.type === 'audio') {
    audioPlayer.elt.src = file.data;
  }
}

function startVisualization() {
  if (audioPlayer.elt.src === '') {
    alert('Please upload an audio file first!');
    return;
  }

  // Initialize audio context if needed
  if (!audioContext) {
    audioContext = getAudioContext();
  }

  // Create audio source from the audio element
  if (!audioPlayer.elt.mediaElementAudioSourceNode) {
    try {
      let source = audioContext.createMediaElementAudioSource(audioPlayer.elt);
      fft = new p5.FFT(0.8, 64);
      fft.setInput(source);
    } catch (e) {
      console.error('Error connecting audio:', e);
    }
  }

  audioPlayer.play();
  started = true;
  startButton.remove();
  fileInput.remove();
  fadeText = 255;
}

function initAudio() {
  userStartAudio().then(() => {
    mic = new p5.AudioIn();
    mic.start();
    fft = new p5.FFT(0.8, 64);
    fft.setInput(mic);
    started = true;
    startButton.remove(); // hide the button
  });
}

function draw() {
  background(0, 0, 0, 20);

  if (!started) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text('Upload an audio file to begin', width / 2, height / 2 - 120);
    textSize(16);
    text('(Works with MP3, WAV, OGG)', width / 2, height / 2 - 60);
    return;
  }

  blendMode(ADD);

  let spectrum = fft.analyze();
  let bass = fft.getEnergy("bass");
  let mid = fft.getEnergy("mid");
  let treble = fft.getEnergy("treble");
  let level = map(bass, 0, 255, 0, 1);

  if (bass > 50) {
    let numRings = floor(map(bass, 50, 255, 1, 4));
    for (let i = 0; i < numRings; i++) {
      let ring = new LightRing(
        width / 2,
        height / 2,
        map(bass, 50, 255, 50, 250),
        map(bass, 50, 255, 100, 200)
      );
      rings.push(ring);
    }
  }

  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].update();
    rings[i].show();
    if (rings[i].alpha <= 0) rings.splice(i, 1);
  }

  blendMode(BLEND);
  drawBoomBox(bass, level);

  if (fadeText > 0) {
    fill(255, fadeText);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('🎵 Enjoying the beats?', width / 2, height / 2 - 200);
    fadeText -= 2;
  }

  // Check if audio ended
  if (audioPlayer.elt.ended) {
    reset();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function reset() {
  started = false;
  rings = [];
  audioPlayer.stop();
  audioPlayer.elt.src = '';
  location.reload(); // Reload to show upload screen again
}

// ---------------- Boombox Drawing ----------------
function drawBoomBox(bass, level) {
  push();
  translate(width / 2, height / 2);
  let s = min(width, height) / 800;
  scale(s);
  let pulseScale = 1 + (level * 0.3);
  scale(pulseScale);

  fill(220, 60, 30);
  rectMode(CENTER);
  rect(0, 0, 400, 300, 30);

  stroke(180, 80, 60);
  strokeWeight(3);
  line(-180, -80, 180, -80);
  line(-180, 80, 180, 80);

  let speakerPulse = map(bass, 0, 255, 0, 20);
  fill(240, 70, 20);
  noStroke();
  ellipse(-120, 0, 180 + speakerPulse);
  stroke(200, 80, 50);
  strokeWeight(2);
  for (let i = 0; i < 8; i++) {
    noFill();
    ellipse(-120, 0, (20 + i * 10) * 2);
  }

  fill(240, 70, 20);
  noStroke();
  ellipse(120, 0, 180 + speakerPulse);
  stroke(200, 80, 50);
  strokeWeight(2);
  for (let i = 0; i < 8; i++) {
    noFill();
    ellipse(120, 0, (20 + i * 10) * 2);
  }

  fill(280, 80, 40);
  rect(0, -100, 200, 40, 10);

  let meterWidth = map(level, 0, 0.3, 0, 90);
  fill(320, 90, 90);
  rect(-50, -100, meterWidth, 20, 5);

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
