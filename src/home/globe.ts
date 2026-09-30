// The film's opening shot: a WebGL Earth that turns from daylight into dusk,
// lights up its cities and dives onto Kuala Lumpur. NASA Blue Marble and
// Black Marble imagery, ray-cast on a full-screen quad.

const KL = { lat: 3.139, lon: 101.6869 };
const SUN = { lat: -2.9, lon: 3.7 }; // 30 September, just after sunset in KL

const VERT = `
attribute vec2 aPos;
varying vec2 vPos;
void main() {
  vPos = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vPos;
uniform vec2 uRes;
uniform float uDist;
uniform vec2 uView;
uniform float uRoll;
uniform vec3 uSun;
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uNightMY;

const float FOV = 0.3;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// World (camera) space to Earth-fixed space for the current view centre.
vec3 toEarth(vec3 w) {
  float cl = cos(uView.x), sl = sin(uView.x);
  vec3 a = vec3(w.x, w.y * cl + w.z * sl, -w.y * sl + w.z * cl);
  float co = cos(uView.y), so = sin(uView.y);
  return vec3(a.x * co + a.z * so, a.y, -a.x * so + a.z * co);
}

vec3 airglow(float ndl) {
  vec3 dusk = vec3(1.0, 0.42, 0.16);
  vec3 sky = vec3(0.3, 0.56, 1.0);
  return mix(dusk, sky, smoothstep(-0.02, 0.35, ndl)) * smoothstep(-0.3, 0.06, ndl);
}

void main() {
  // Frame against the shorter side, so the Earth fits wide and tall screens alike.
  vec2 uv = vPos * uRes / min(uRes.x, uRes.y);
  float c = cos(uRoll), s = sin(uRoll);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
  vec3 ro = vec3(0.0, 0.0, uDist);
  vec3 rd = normalize(vec3(uv * FOV, -1.0));
  float b = dot(ro, rd);
  float q2 = dot(ro, ro) - b * b;
  float q = sqrt(max(q2, 0.0));
  float aa = uDist * FOV * 3.0 / min(uRes.x, uRes.y);
  float cover = smoothstep(1.0 + aa, 1.0 - aa, q);

  // Space: stars drift with the camera, then fade as we dive.
  vec2 cell = floor(gl_FragCoord.xy / 2.0 + vec2(uView.y * 380.0, uView.x * 380.0));
  float r = hash(cell);
  vec3 bg = vec3(smoothstep(0.9968, 1.0, r) * (0.3 + 0.7 * hash(cell + 3.7)));
  bg *= smoothstep(2.4, 4.0, uDist);
  vec3 limb = normalize(ro + rd * max(-b, 0.0));
  float halo = exp(-max(q - 1.0, 0.0) * 24.0) * step(b, 0.0);
  bg += airglow(dot(toEarth(limb), uSun)) * halo * 0.95;

  // Surface
  float h = max(1.0 - q2, 0.0);
  vec3 n = normalize(ro + rd * (-b - sqrt(h)));
  vec3 e = toEarth(n);
  float lat = degrees(asin(clamp(e.y, -1.0, 1.0)));
  float lon = degrees(atan(e.x, e.z));
  // Keep the texture seam in the Pacific, out of shot.
  float lonS = lon < -140.0 ? lon + 360.0 : lon;
  vec2 guv = vec2((lonS + 180.0) / 360.0, (90.0 - lat) / 180.0);
  vec3 day = texture2D(uDay, guv).rgb;
  vec3 night = texture2D(uNight, guv).rgb;
  vec2 ruv = vec2((lon - 90.0) / 24.0, (18.0 - lat) / 24.0);
  float inside = smoothstep(0.0, 0.06, min(min(ruv.x, 1.0 - ruv.x), min(ruv.y, 1.0 - ruv.y)));
  night = mix(night, texture2D(uNightMY, clamp(ruv, 0.0, 1.0)).rgb, inside);

  float ndl = dot(e, uSun);
  float dark = 1.0 - smoothstep(-0.12, 0.2, ndl);
  vec3 col = day * (0.03 + 1.3 * pow(max(ndl, 0.0), 0.7));
  col += day * vec3(1.0, 0.5, 0.24) * exp(-pow((ndl - 0.03) / 0.1, 2.0)) * 0.7;
  float glow = max(max(night.r, night.g), night.b);
  col += night * 0.3 * dark;
  col += vec3(1.0, 0.76, 0.44) * pow(max(glow - 0.12, 0.0) * 1.35, 1.3) * 1.7 * dark;
  float ocean = smoothstep(0.02, 0.12, day.b - max(day.r, day.g) * 0.9);
  float glint = pow(max(dot(reflect(-uSun, e), toEarth(-rd)), 0.0), 180.0);
  col += vec3(1.0, 0.9, 0.78) * glint * ocean * (1.0 - dark) * 0.35;
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 2.5);
  col += airglow(ndl) * (0.06 + fres * 0.85);

  gl_FragColor = vec4(mix(bg, col, cover), 1.0);
}`;

const rad = (d: number) => (d * Math.PI) / 180;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const easeOutSine = (x: number) => Math.sin((x * Math.PI) / 2);
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);

// Camera path over the first 8 seconds: turn from the Atlantic to Kuala Lumpur,
// drifting closer, then dive.
function camera(t: number) {
  const turn = easeInOutSine(clamp01(t / 5.8));
  const dist = t < 3.4 ? lerp(5.2, 4.4, easeOutSine(t / 3.4)) : lerp(4.4, 1.26, easeInOutCubic(clamp01((t - 3.4) / 4.2)));
  return { lat: rad(lerp(24, KL.lat, turn)), lon: rad(lerp(-35, KL.lon, turn)), roll: lerp(-0.22, 0, turn), dist };
}

function shader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  return img.decode().then(() => img);
}

export interface Globe {
  ready: Promise<void>;
}

// Draws the Earth for film time clock() (seconds) until `until`, then lets go of the GPU.
export function startGlobe(canvas: HTMLCanvasElement, clock: () => number, until: number): Globe {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
  if (!gl) return { ready: Promise.resolve() };

  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(program, name);
  const uRes = u("uRes");
  const uDist = u("uDist");
  const uView = u("uView");
  const uRoll = u("uRoll");
  gl.uniform3f(
    u("uSun"),
    Math.cos(rad(SUN.lat)) * Math.sin(rad(SUN.lon)),
    Math.sin(rad(SUN.lat)),
    Math.cos(rad(SUN.lat)) * Math.cos(rad(SUN.lon)),
  );

  const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
  const texture = (img: HTMLImageElement, unit: number, name: string, wrap: number) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    gl.uniform1i(u(name), unit);
  };

  const rect = canvas.getBoundingClientRect();
  const large = Math.max(rect.width, rect.height) >= 900 && gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 4096;
  const size = large ? 4096 : 2048;
  let loaded = false;
  const ready = Promise.all([
    loadImage(`/img/earth-day-${size}.webp`),
    loadImage(`/img/earth-night-${size}.webp`),
    loadImage("/img/earth-night-my.webp"),
  ]).then(([day, night, nightMY]) => {
    texture(day, 0, "uDay", gl.REPEAT);
    texture(night, 1, "uNight", gl.REPEAT);
    texture(nightMY, 2, "uNightMY", gl.CLAMP_TO_EDGE);
    loaded = true;
    canvas.dataset.ready = "";
  });

  let drawn = -1;
  const frame = () => {
    const t = clock();
    if (!canvas.isConnected || t > until) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return;
    }
    const box = canvas.getBoundingClientRect();
    const k = Math.min(devicePixelRatio, 1920 / Math.max(box.width, box.height, 1));
    const width = Math.round(box.width * k);
    const height = Math.round(box.height * k);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      drawn = -1;
    }
    if (loaded && t !== drawn) {
      const cam = camera(t);
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uRes, width, height);
      gl.uniform1f(uDist, cam.dist);
      gl.uniform2f(uView, cam.lat, cam.lon);
      gl.uniform1f(uRoll, cam.roll);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      drawn = t;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  return { ready };
}
