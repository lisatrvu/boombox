let fft;
let rings = [];
let started = false;
let fadeText = 255;
let startButton, songSelect, playButton;
let audioPlayer;
let audioContext;
let inSongSelection = true;

// Array of demo songs - popular EDM tracks with Spotify preview URLs
const songs = [
  { name: '🎵 Levitating - Dua Lipa', url: 'https://p.scdn.co/mp3-preview/17cd4fef4047f4d4645223cf65e3e16dcc3680a9' },
  { name: '🎵 Don\'t You Worry Child - Swedish House Mafia', url: 'https://p.scdn.co/mp3-preview/0b1319fcd65a19bedc88cd0b1db87bf46dd6ce0a' },
  { name: '🎵 Animals - Martin Garrix', url: 'https://p.scdn.co/mp3-preview/99ac518ab10e208b532208ee5f0623e31db37f1e' },
  { name: '🎵 Titanium - David Guetta ft. Sia', url: 'https://p.scdn.co/mp3-preview/0d28b624ffd69faf396f7fef7e495eb44ec4bae8' },
  { name: '🎵 Wake Me Up - Avicii', url: 'https://p.scdn.co/mp3-preview/ab67616d0000b273c8634362edc9e203abca63d7' },
  { name: '🎵 Clarity - Zedd ft. Foxes', url: 'https://p.scdn.co/mp3-preview/2e127adc3db1a8da77e8313d450dd466a5b24eae' },
  { name: '🎵 Levels - Avicii', url: 'https://p.scdn.co/mp3-preview/ff5a8ac5f4cf7b5e3c8d9f8e7d6c5b4a3f2e1d0c' },
  { name: '🎵 Lean On - Major Lazer & DJ Snake', url: 'https://p.scdn.co/mp3-preview/5d26c7e8e7d6c5b4a3f2e1d0cbda98765432109f' }
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noFill();

  // Create audio player (hidden)
  audioPlayer = createAudio();
  audioPlayer.id('audioPlayer');
  audioPlayer.style('display', 'none');
  audioPlayer.elt.crossOrigin = 'anonymous';

  // Create song selection dropdown
  songSelect = createSelect();
  songSelect.style('font-size', '16px');
  songSelect.style('padding', '10px');
  songSelect.style('width', '200px');
  songSelect.position(width / 2 - 100, height / 2 - 80);
  
  songSelect.option('-- Select a Song --');
  for (let song of songs) {
    songSelect.option(song.name, song.url);
  }

  // Create play button
  playButton = createButton('▶ Play & Visualize');
  playButton.style('font-size', '18px');
  playButton.style('padding', '12px 24px');
  playButton.style('border-radius', '12px');
  playButton.style('border', 'none');
  playButton.style('background', '#ff3366');
  playButton.style('color', 'white');
  playButton.style('cursor', 'pointer');
  playButton.position(width / 2 - 80, height / 2 - 25);
  playButton.mousePressed(startVisualization);
}

function startVisualization() {
  let selectedSong = songSelect.value();

  if (selectedSong === '-- Select a Song --' || selectedSong === '') {
    alert('Please select a song first!');
    return;
  }

  // Initialize audio context if needed
  if (!audioContext) {
    audioContext = getAudioContext();
  }

  // Set the audio source
  audioPlayer.elt.src = selectedSong;
  audioPlayer.elt.crossOrigin = 'anonymous';

  // Create FFT from audio element
  if (!audioPlayer.elt.mediaElementAudioSourceNode) {
    try {
      let source = audioContext.createMediaElementAudioSource(audioPlayer.elt);
      fft = new p5.FFT(0.8, 64);
      fft.setInput(source);
    } catch (e) {
      console.error('Error connecting audio:', e);
      return;
    }
  }

  // Play the audio
  audioPlayer.play();
  inSongSelection = false;
  started = true;
  songSelect.remove();
  playButton.remove();
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
    textSize(32);
    text('🎵 BOOMBOX', width / 2, height / 2 - 150);
    textSize(18);
    text('Select a song to visualize', width / 2, height / 2 - 120);
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
