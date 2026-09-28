extends Node
## Sound — the city's sound (web Act I v4.59, `web/js/v3/sound.js`, the
## reference). Owner, 2026-09-27, answer 7: "yes" to a tram bell, the till and
## street rain.
##
## SYNTHESISED, NEVER SAMPLED (the house rule: no audio files to fetch, cache or
## license). Every sound is computed here, once, into an in-memory
## `AudioStreamWAV` and cached — the equivalent of the web's WebAudio graph,
## without a per-frame DSP loop in GDScript (a web export cannot afford one).
## The noise is a seeded xorshift, the same generator the web uses, so a sound
## bug can be reproduced rather than re-rolled.
##
## ONE MASTER BUS: every voice plays on "Master", so turning sound off mutes
## everything, and anything added later inherits it. OFF does more than mute:
## it stops and frees every player and the bell's timer, which is the web's
## "closes the whole audio graph rather than turning it down".
##
## The bed is rain on a roof and the city's low hum, with a distant tram bell
## every 22-48 s. On top of it: the till when cash moves (bright for money in,
## lower for money out), footsteps on a journey, a low sting when the road
## stops Aatami, and brakes then the bell for the arrival.
##
## The switch is persisted in the same settings file the language uses. A
## machine without an audio device gets the dummy driver: silence, never an
## error.

const CONFIG_PATH := "user://piritori-settings.cfg"
const RATE := 22050
const BUS := &"Master"
const VOICES := 6

var on := true
var _awake := false
var _rain: AudioStreamPlayer
var _hum: AudioStreamPlayer
var _voices: Array[AudioStreamPlayer] = []
var _next_voice := 0
var _bell_timer: Timer
var _cache: Dictionary = {}
## The bell's schedule is presentation, not a rule, but it is still seeded:
## nothing about a run should depend on the wall clock's dice.
var _bell_rng := RandomNumberGenerator.new()
## What was asked for, newest last — so a gate can prove a cue was really
## routed without an audio device to listen with.
var played: PackedStringArray = []


func _ready() -> void:
	on = _load_pref()
	_bell_rng.seed = 20030103


func _load_pref() -> bool:
	var cfg := ConfigFile.new()
	if cfg.load(CONFIG_PATH) == OK:
		return bool(cfg.get_value("sound", "on", true))
	return true


func _save_pref() -> void:
	var cfg := ConfigFile.new()
	cfg.load(CONFIG_PATH)
	cfg.set_value("sound", "on", on)
	cfg.save(CONFIG_PATH)


## Wake the graph. Safe to call again; does nothing while sound is off.
func wake() -> void:
	if _awake or not on:
		return
	_awake = true
	AudioServer.set_bus_mute(AudioServer.get_bus_index(BUS), false)
	_rain = _player()
	_rain.stream = _bed("rain")
	_rain.volume_db = linear_to_db(0.05)
	_hum = _player()
	_hum.stream = _bed("hum")
	_hum.volume_db = linear_to_db(0.09)
	for i in VOICES:
		_voices.append(_player())
	_rain.play()
	_hum.play()
	_bell_timer = Timer.new()
	_bell_timer.one_shot = true
	_bell_timer.timeout.connect(_far_bell)
	add_child(_bell_timer)
	_bell_timer.start(9.0)


func _player() -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	p.bus = BUS
	add_child(p)
	return p


func _far_bell() -> void:
	if not _awake:
		return
	bell(0.25)
	_bell_timer.start(22.0 + _bell_rng.randf() * 26.0)


## SOUND · ON / OFF, remembered.
func set_sound(value: bool) -> void:
	on = value
	_save_pref()
	if not on:
		_close()
		AudioServer.set_bus_mute(AudioServer.get_bus_index(BUS), true)
	else:
		wake()


func _close() -> void:
	_awake = false
	for p in [_rain, _hum]:
		if p != null:
			p.stop()
			p.queue_free()
	_rain = null
	_hum = null
	for p in _voices:
		p.stop()
		p.queue_free()
	_voices.clear()
	if _bell_timer != null:
		_bell_timer.stop()
		_bell_timer.queue_free()
		_bell_timer = null


## For gates: is a graph running, and where does it go?
func state() -> Dictionary:
	var routed := true
	var all: Array = []
	all.append_array(_voices)
	if _rain != null:
		all.append_array([_rain, _hum])
	for p in all:
		if (p as AudioStreamPlayer).bus != BUS:
			routed = false
	return {
		"on": on,
		"running": _awake and _rain != null and _rain.playing,
		"players": _voices.size() + (2 if _rain != null else 0),
		"routed_to_master": routed,
		"master_muted": AudioServer.is_bus_mute(AudioServer.get_bus_index(BUS)),
	}


func _play(key: String, stream: AudioStreamWAV, level: float = 1.0, delay: float = 0.0) -> void:
	if not _awake or _voices.is_empty():
		return
	played.append(key)
	if delay > 0.0:
		get_tree().create_timer(delay).timeout.connect(func(): _play_now(stream, level))
	else:
		_play_now(stream, level)


func _play_now(stream: AudioStreamWAV, level: float) -> void:
	if not _awake or _voices.is_empty():
		return
	var p := _voices[_next_voice % _voices.size()]
	_next_voice += 1
	p.stream = stream
	p.volume_db = linear_to_db(maxf(level, 0.0001))
	p.play()


# ── the cues (web `bell`, `till`, `steps`, `sting`, `arrival`) ─────────────

## A tram bell: two struck tones, the second a little lower.
func bell(level: float = 1.0) -> void:
	_play("bell", _cue("bell"), level)


## The till: a drawer, then a bright double ring. Up for money in.
func till(direction: int) -> void:
	_play("till-up" if direction >= 0 else "till-down",
		_cue("till-up" if direction >= 0 else "till-down"))


## Footsteps on wet stone, for a journey.
func steps() -> void:
	_play("steps", _cue("steps"))


## Something on the road: a low, short sting.
func sting(delay: float = 0.0) -> void:
	_play("sting", _cue("sting"), 1.0, delay)


## The tram pulling in: brakes, then the bell.
func arrival() -> void:
	_play("arrival", _cue("brakes"))
	_play("bell", _cue("bell"), 1.0, 2.3)


# ── synthesis ─────────────────────────────────────────────────────────────

var _noise_x := 0

func _noise_reset() -> void:
	_noise_x = 0x9e3779b9


## xorshift32, as the web's `noiseBuffer`: a value in [-1, 1).
func _noise() -> float:
	var x := _noise_x
	x ^= (x << 13) & 0xFFFFFFFF
	x ^= x >> 17
	x ^= (x << 5) & 0xFFFFFFFF
	_noise_x = x & 0xFFFFFFFF
	return float(_noise_x) / 4294967296.0 * 2.0 - 1.0


func _wav(samples: PackedFloat32Array, loop: bool = false) -> AudioStreamWAV:
	var bytes := PackedByteArray()
	bytes.resize(samples.size() * 2)
	for i in samples.size():
		bytes.encode_s16(i * 2, int(clampf(samples[i], -1.0, 1.0) * 32767.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = RATE
	w.stereo = false
	w.data = bytes
	if loop:
		w.loop_mode = AudioStreamWAV.LOOP_FORWARD
		w.loop_begin = 0
		w.loop_end = samples.size()
	return w


static func _alpha(fc: float) -> float:
	return 1.0 - exp(-TAU * fc / float(RATE))


## The bed: two seconds of filtered noise, looped. Rain is noise between 900 Hz
## and 5.2 kHz; the hum is what is left under 160 Hz.
func _bed(kind: String) -> AudioStreamWAV:
	if _cache.has(kind):
		return _cache[kind]
	_noise_reset()
	var n := RATE * 2
	var out := PackedFloat32Array()
	out.resize(n)
	var lo := 0.0
	var hi_lp := 0.0
	var a_hp := _alpha(900.0)
	var a_lp := _alpha(5200.0)
	var a_hum := _alpha(160.0)
	for i in n:
		var x := _noise()
		if kind == "rain":
			lo += a_hp * (x - lo)
			hi_lp += a_lp * ((x - lo) - hi_lp)
			out[i] = hi_lp * 2.0
		else:
			lo += a_hum * (x - lo)
			out[i] = lo * 6.0
	# A loop must not click where it wraps: fade the last 50 ms into the first.
	var fade := int(RATE * 0.05)
	for i in fade:
		var k := float(i) / float(fade)
		out[n - fade + i] = out[n - fade + i] * (1.0 - k) + out[i] * k
	_cache[kind] = _wav(out, true)
	return _cache[kind]


func _cue(key: String) -> AudioStreamWAV:
	if _cache.has(key):
		return _cache[key]
	var buf := PackedFloat32Array()
	match key:
		"bell":
			buf = _silence(1.5)
			for dt_f in [[0.0, 1318.0], [0.16, 1175.0]]:
				_tone(buf, dt_f[1], dt_f[0], 1.1, 0.12, "sine")
				_tone(buf, dt_f[1] * 2.76, dt_f[0], 0.35, 0.03, "sine")
		"till-up", "till-down":
			buf = _silence(0.8)
			_burst(buf, 0.0, 0.08, 0.25, 1800.0, 4200.0)
			var ab := [1568.0, 2093.0] if key == "till-up" else [1397.0, 1047.0]
			_tone(buf, ab[0], 0.06, 0.35, 0.10, "triangle")
			_tone(buf, ab[1], 0.14, 0.55, 0.10, "triangle")
		"steps":
			buf = _silence(1.2)
			for i in 4:
				_burst(buf, i * 0.26, 0.09, 0.22 - i * 0.02, 250.0, 900.0)
		"sting":
			buf = _silence(1.0)
			_tone(buf, 110.0, 0.0, 0.9, 0.16, "saw")
			_tone(buf, 116.5, 0.0, 0.9, 0.10, "saw")
			_burst(buf, 0.0, 0.3, 0.12, 300.0, 1200.0)
		"brakes":
			buf = _brakes()
	_cache[key] = _wav(buf)
	return _cache[key]


func _silence(seconds: float) -> PackedFloat32Array:
	var b := PackedFloat32Array()
	b.resize(int(RATE * seconds))
	return b


## A struck tone: 8 ms up to `peak`, then an exponential fall to nothing.
func _tone(buf: PackedFloat32Array, freq: float, start: float, dur: float,
		peak: float, wave: String) -> void:
	var s0 := int(start * RATE)
	var n := mini(int((dur + 0.05) * RATE), buf.size() - s0)
	var attack := 0.008 * RATE
	var decay_k := log(0.0001 / peak) / maxf(dur * RATE - attack, 1.0)
	var phase := 0.0
	var step := freq / float(RATE)
	for i in n:
		var env := peak * (float(i) / attack) if i < attack else peak * exp(decay_k * (i - attack))
		var v := 0.0
		match wave:
			"sine": v = sin(TAU * phase)
			"triangle": v = 1.0 - 4.0 * absf(phase - 0.5)
			_: v = 2.0 * phase - 1.0
		buf[s0 + i] += v * env
		phase = fmod(phase + step, 1.0)


## A burst of band-passed noise (RBJ band-pass, 0 dB peak), decaying.
func _burst(buf: PackedFloat32Array, start: float, dur: float, peak: float,
		lo: float, hi: float) -> void:
	_noise_reset()
	var f0 := (lo + hi) * 0.5
	var q := f0 / (hi - lo)
	var bq := _bandpass(f0, q)
	var s0 := int(start * RATE)
	var n := mini(int((dur + 0.05) * RATE), buf.size() - s0)
	var k := log(0.0001 / peak) / maxf(dur * RATE, 1.0)
	var z := [0.0, 0.0, 0.0, 0.0]
	for i in n:
		var y := _biquad(bq, z, _noise())
		buf[s0 + i] += y * peak * exp(k * i)


## The tram's brakes: noise through a narrow band-pass sweeping 2.6 kHz down to
## 900 Hz, swelling in and dying away over 2.4 s.
func _brakes() -> PackedFloat32Array:
	var buf := _silence(2.7)
	_noise_reset()
	var z := [0.0, 0.0, 0.0, 0.0]
	for i in buf.size():
		var t := float(i) / RATE
		var f := 2600.0 * pow(900.0 / 2600.0, minf(t / 2.2, 1.0))
		var g := 0.0
		if t < 0.6:
			g = 0.0001 * pow(0.10 / 0.0001, t / 0.6)
		elif t < 2.4:
			g = 0.10 * pow(0.0001 / 0.10, (t - 0.6) / 1.8)
		buf[i] = _biquad(_bandpass(f, 9.0), z, _noise()) * g * 3.0
	return buf


static func _bandpass(f0: float, q: float) -> Array:
	var w0 := TAU * f0 / float(RATE)
	var alpha := sin(w0) / (2.0 * q)
	var a0 := 1.0 + alpha
	return [alpha / a0, 0.0, -alpha / a0, -2.0 * cos(w0) / a0, (1.0 - alpha) / a0]


## Direct form I; `z` is [x1, x2, y1, y2].
static func _biquad(c: Array, z: Array, x: float) -> float:
	var y: float = c[0] * x + c[1] * z[0] + c[2] * z[1] - c[3] * z[2] - c[4] * z[3]
	z[1] = z[0]
	z[0] = x
	z[3] = z[2]
	z[2] = y
	return y
