class_name CrewGenerator
extends RefCounted

## Makes the disposable half of the roster (COMBAT.md §7, decision 2b).
##
## Careers gave everyone a ceiling and nothing put anyone back, so a long
## campaign drained to an empty roster with no message. This is the other half:
## the city always has someone else.
##
## Three things this deliberately does NOT do:
##
## 1. It never generates a NAMED character. Named is derived from the authored
##    slice — an encounter calls them by id — and a generated person cannot be
##    referred to by content that was written before they existed.
## 2. It never invents a role. The six are the six the art has models for, and a
##    seventh would be a person with no body.
## 3. It never rolls stats freely. The bands come from the authored six, so a
##    hire sits in the same range as a hand-written one rather than quietly
##    out-classing them.
##
## PLACEHOLDER, and DESIGN_LOCKS.md §13 says to say so rather than let it
## harden: the name pools are flat, the stat bands are a first guess, and the
## six portraits are recycled. All three are marked in QUEUE.md.

## Kallio in 2003 is not a Finnish-only street, and the authored cast already
## says so — Mira Hämäläinen, Rauno Lahti, Samira Elmi, Duy Nguyen, Ilkka
## Koskinen, Jelena Marković. Generated people are drawn from the same mix, or
## the randomiser would quietly turn the neighbourhood Finnish over a long
## campaign. NARRATIVE.md: people are never scenery.
const GIVEN := {
	"fi": ["Aino", "Eero", "Hannele", "Jouni", "Kirsti", "Lasse", "Marja",
		"Olli", "Pirjo", "Reijo", "Sanna", "Tuomas", "Ulla", "Veikko"],
	"so": ["Abdi", "Ayaan", "Farah", "Hodan", "Idil", "Nasra", "Yusuf"],
	"vi": ["Anh", "Bao", "Hien", "Lan", "Minh", "Quang", "Thuy"],
	"yu": ["Boris", "Dragan", "Ivana", "Milena", "Nikola", "Vesna", "Zoran"],
	"ee": ["Kadri", "Maarja", "Priit", "Tarmo", "Ülle"],
	"ru": ["Galina", "Igor", "Ludmila", "Sergei", "Tatjana"],
}

const FAMILY := {
	"fi": ["Aaltonen", "Heikkilä", "Järvinen", "Kinnunen", "Laine", "Mäkelä",
		"Nieminen", "Peltola", "Rantanen", "Saarinen", "Toivonen", "Virtanen"],
	"so": ["Ahmed", "Dirie", "Hassan", "Jama", "Osman", "Warsame"],
	"vi": ["Bui", "Dang", "Ho", "Le", "Pham", "Tran", "Vu"],
	# Spelled properly, with the diacritics. Godot's own built-in font carries
	# Latin Extended-A and is what the web build falls through to, so these
	# draw correctly; the bundled Japanese subset never needed to cover them.
	# These names were briefly written without their accents because the font
	# gate demanded the JP subset cover c-acute and I believed it rather than
	# checking whether the glyph could be drawn. It could. See QUEUE.md.
	"yu": ["Babić", "Ilić", "Jovanović", "Kovač", "Popović", "Savić"],
	"ee": ["Kask", "Lepik", "Mägi", "Saar", "Tamm"],
	"ru": ["Ivanov", "Morozov", "Petrov", "Smirnov", "Volkov"],
}

## The six the art has bodies for. Not a design ceiling — expanding it means
## expanding UNIT_BY_ROLE and the torso/legs sets in the same step.
const ROLES := ["driver", "fixer", "local", "muscle", "runner", "watcher"]

## Each role's stat signature, read off the authored six rather than invented,
## so a generated muscle reads like the hand-written muscle. The spread is
## applied around these.
const ROLE_BASE := {
	"driver":  {"condition": 8, "nerve": 6, "tempo": 5, "wage": 22},
	"fixer":   {"condition": 7, "nerve": 7, "tempo": 6, "wage": 26},
	"local":   {"condition": 8, "nerve": 8, "tempo": 6, "wage": 24},
	"muscle":  {"condition": 10, "nerve": 7, "tempo": 4, "wage": 30},
	"runner":  {"condition": 8, "nerve": 6, "tempo": 8, "wage": 18},
	"watcher": {"condition": 7, "nerve": 8, "tempo": 7, "wage": 20},
}

const ROLE_COMPETENCIES := {
	"driver":  ["route-reliability", "extraction"],
	"fixer":   ["negotiation", "control"],
	"local":   ["local-access", "faction-memory"],
	"muscle":  ["cover", "improvised-support"],
	"runner":  ["delivery", "withdrawal"],
	"watcher": ["marking", "intent-reading"],
}

## Only six heads have been drawn. A seventh generated person wears a face
## somebody else is already wearing, and that is a known placeholder rather than
## a claim that six is enough.
const PORTRAITS := ["head-kallio-01-v03", "head-kallio-03-v03",
	"head-kallio-05-v03", "head-kallio-07-v03", "head-kallio-09-v03",
	"head-kallio-11-v03"]

## The band a rolled stat may land in, either side of the role's base. Kept
## narrow on purpose: churn is supposed to cost you continuity, not hand you a
## lottery ticket that beats every authored crew member.
const SPREAD := 1


## One candidate, decided entirely by `seed`. The same seed gives the same
## person forever, which is what lets a hiring pool be regenerated on demand
## instead of stored, and what makes a campaign reproducible from its seed.
static func generate(seed_value: int) -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value

	var role: String = ROLES[rng.randi_range(0, ROLES.size() - 1)]
	var base: Dictionary = ROLE_BASE[role]

	var pools: Array = GIVEN.keys()
	var origin: String = pools[rng.randi_range(0, pools.size() - 1)]
	var given: Array = GIVEN[origin]
	var family: Array = FAMILY[origin]

	var display := "%s %s" % [
		given[rng.randi_range(0, given.size() - 1)],
		family[rng.randi_range(0, family.size() - 1)],
	]

	# The id has to survive a save file and must not collide with an authored
	# one, so it is derived from the seed rather than from the name — two
	# Sanna Virtanens are entirely possible and must remain distinct people.
	var id := "hire-%d" % seed_value

	return {
		"id": id,
		"name": display,
		"role": role,
		"age": rng.randi_range(19, 48),
		"condition": maxi(1, int(base["condition"]) + rng.randi_range(-SPREAD, SPREAD)),
		"nerve": maxi(1, int(base["nerve"]) + rng.randi_range(-SPREAD, SPREAD)),
		"tempo": maxi(1, int(base["tempo"]) + rng.randi_range(-SPREAD, SPREAD)),
		"wage_eur": maxi(1, int(base["wage"]) + rng.randi_range(-4, 4)),
		"competencies": (ROLE_COMPETENCIES[role] as Array).duplicate(),
		"portrait_asset_id": PORTRAITS[rng.randi_range(0, PORTRAITS.size() - 1)],
		"torso_asset_id": "torso-%s-v03" % role,
		"legs_asset_id": "legs-%s-v03" % role,
		"initial_equipment": [],
		# Never true. See the class comment: named is a fact about authored
		# content, and no content can refer to somebody invented at runtime.
		"named": false,
		"generated": true,
	}


## A hiring pool. Derived from the campaign seed and the day, so the same day
## always offers the same people — walking away and coming back must not reroll
## the board, or the choice costs nothing.
static func pool(campaign_seed: int, day: int, count: int = 3) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for i in count:
		out.append(generate(campaign_seed * 1000 + day * 10 + i))
	return out
