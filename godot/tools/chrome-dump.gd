extends SceneTree
## Dumps `PiritoriChrome._paint()` output for all five box kinds, full 64x64,
## as the reference fixture `port/vectors/chrome.json` checks `web/js/v3/
## chrome.js`'s `paintPixels()` against.
##
## Godot's own UI is still WIP — `chrome.gd` has moved three times in three
## commits already (see `godot/ui/chrome.gd` history) — so `chrome.js` is a
## port of a snapshot, not a frozen spec. Run this again and commit the new
## `port/vectors/chrome.json` whenever `chrome.gd`'s constants or algorithm
## change; `port/chrome-vectors.mjs --check` is what actually notices if
## nobody does.
##
##   godot --headless --path godot --script godot/tools/chrome-dump.gd
##   node port/chrome-vectors.mjs            # regenerate the fixture instead
##   node port/chrome-vectors.mjs --check     # the gate

const KINDS := [
	{ "label": "panel", "kind": "panel", "base": "CARD", "accent": "#a62bff", "tt": true, "tb": true },
	{ "label": "btn", "kind": "btn", "base": "CARD", "accent": "#9a4e34", "tt": false, "tb": false },
	{ "label": "bar", "kind": "bar", "base": "CARD", "accent": "#8a7355", "tt": true, "tb": false },
	{ "label": "plate", "kind": "plate", "base": "CARTON", "accent": "#16191b", "tt": true, "tb": true },
	{ "label": "plateBtn", "kind": "plateBtn", "base": "CARTON", "accent": "#4f7fa0", "tt": false, "tb": true },
]

func _initialize():
	var out := {}
	for spec in KINDS:
		var base: Color = PiritoriChrome.CARD if spec["base"] == "CARD" else PiritoriChrome.CARTON
		var tex := PiritoriChrome._paint(spec["kind"], base, Color(spec["accent"]), spec["tt"], spec["tb"])
		var img := tex.get_image()
		var hex := ""
		for y in 64:
			for x in 64:
				var c := img.get_pixel(x, y)
				hex += "%02x%02x%02x%02x" % [
					int(clampf(c.r, 0.0, 1.0) * 255.0),
					int(clampf(c.g, 0.0, 1.0) * 255.0),
					int(clampf(c.b, 0.0, 1.0) * 255.0),
					int(round(c.a * 255.0)),
				]
		out[spec["label"]] = hex

	var json := JSON.stringify({
		"model": "chrome",
		"source": "godot/ui/chrome.gd PiritoriChrome._paint()",
		"note": "Regenerate with godot/tools/chrome-dump.gd whenever chrome.gd changes. Godot's UI is WIP; this is a snapshot, not a spec.",
		"kinds": out,
	}, "  ")
	# `res://..` traversal isn't reliable across Godot versions — resolve the
	# repo root (the parent of this project's own directory) explicitly.
	var project_root: String = ProjectSettings.globalize_path("res://")
	if project_root.ends_with("/"):
		project_root = project_root.substr(0, project_root.length() - 1)
	var repo_root: String = project_root.get_base_dir()
	var out_path: String = repo_root.path_join("port/vectors/chrome.json")
	print("project_root=%s repo_root=%s out_path=%s" % [project_root, repo_root, out_path])
	var f := FileAccess.open(out_path, FileAccess.WRITE)
	if f == null:
		print("FileAccess.open FAILED: %s" % error_string(FileAccess.get_open_error()))
		quit(1)
		return
	f.store_string(json)
	f.close()
	print("wrote %s" % out_path)
	quit()
