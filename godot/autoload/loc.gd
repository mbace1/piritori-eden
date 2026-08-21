extends Node
## Loc — language selection for the slice.
##
## UX_SPEC §13:
##   - "Finnish and English are complete slice languages."
##   - "Language changes at a decision boundary without restarting the run."
##
## OWNER EXTENSION, 2026-08-20: Japanese is added as a third language on direct
## owner instruction. UX_SPEC §13 names only Finnish and English, so this is
## recorded here rather than left as a silent contradiction (AGENTS.md §1).
## UX_SPEC should be amended to list three languages when the owner next
## revises it.
##
## English is the per-key fallback, which is the house rule across this repo.
## That fallback is deliberately SILENT at runtime and therefore invisible, so
## tools/check-locale.mjs reports coverage instead of trusting it.
##
## SCOPE. This translates the interface only. The authored slice content —
## encounter prose, choice labels, forecasts, crew names — is owner-written
## narrative in content/era1-slice-v1.json and is NOT machine-translated here.
## Inventing Finnish or Japanese prose and presenting it as canon would be a
## Canon-level fabrication. `content_language()` reports what the content is
## actually in, so the UI can say so rather than imply a translation exists.

signal language_changed(code: String)

const SUPPORTED := ["en", "fi", "ja"]
const CONFIG_PATH := "user://piritori-settings.cfg"

## The language the authored slice content is written in. Until the owner
## supplies translated content packages this stays "en" whatever the UI shows.
const CONTENT_LANGUAGE := "en"

var code: String = "en"


func _ready() -> void:
	code = _load_saved()
	_apply()


## Detect from the OS, but only to one of the languages we actually have.
func _detect() -> String:
	var sys := OS.get_locale_language()
	return sys if SUPPORTED.has(sys) else "en"


func _load_saved() -> String:
	var cfg := ConfigFile.new()
	if cfg.load(CONFIG_PATH) == OK:
		var saved := String(cfg.get_value("ui", "language", ""))
		if SUPPORTED.has(saved):
			return saved
	return _detect()


func _save() -> void:
	var cfg := ConfigFile.new()
	cfg.load(CONFIG_PATH)
	cfg.set_value("ui", "language", code)
	cfg.save(CONFIG_PATH)


func _apply() -> void:
	TranslationServer.set_locale(code)


## Change language. Callers must only do this at a decision boundary (§13);
## the shell offers it from the map and the menu, never mid-encounter.
func set_language(new_code: String) -> void:
	if not SUPPORTED.has(new_code) or new_code == code:
		return
	code = new_code
	_apply()
	_save()
	language_changed.emit(code)


func cycle() -> void:
	set_language(SUPPORTED[(SUPPORTED.find(code) + 1) % SUPPORTED.size()])


func language_name(c: String) -> String:
	match c:
		"fi": return "Suomi"
		"ja": return "日本語"
		_: return "English"


## True when the interface language differs from the language the authored
## content is actually written in.
func content_is_translated() -> bool:
	return code == CONTENT_LANGUAGE
