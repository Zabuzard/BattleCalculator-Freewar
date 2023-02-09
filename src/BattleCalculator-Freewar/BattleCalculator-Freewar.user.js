// ==UserScript==
// @name        BattleCalculator - Freewar
// @namespace   Zabuza
// @description Removes fastattack links for NPCs where the outcome of a battle is loosing for the player.
// @match     *.freewar.de/freewar/internal/main.php*
// @version     1
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @grant       none
// ==/UserScript==
/* global $ */
var targetNode = document.querySelector('.listusersrow, .listusersrow table tr td');
if (targetNode) {
	var observerOptions = {
		childList: true,
		subtree: true
	};

	var observer = new MutationObserver(function(mutationsList) {
		routine();
	});

	observer.observe(targetNode, observerOptions);
}

var listenerRunning = false;

document.addEventListener("click", function(event) {
	if (!listenerRunning) {
		listenerRunning = true;
		if (event.target.matches('.fastattack')) {
			routine();
		}
	}
});

document.dispatchEvent(new Event("click"));

/*
 * Auto attack - use this at your own risk - false by default
 */
var npcAutoAttack = false;

/*
 * Routine function of the script.
 */
function routine() {
	initNpcData();
	initCriticalSpecialNpc();
	initNonCriticalSpecialNpc();
	initIgnoreNpcData();
	var foundNpc = false;
	// First search for multiple NPC
	$('.listusersrow table tr td').each(function(index, cellElement) {
		var foundNpcInElement = processElement(cellElement);
		// Only update if a NPC was found
		if (foundNpcInElement) {
			foundNpc = true;
		}
	});
	// If there where no multiple NPC there might be a single NPC
	if (!foundNpc) {
		$('.listusersrow').each(function(index, cellElement) {
			processElement(cellElement);
		});
	}
}

/*
 * Processes an element that might contain NPC data.
 *
 * @param cellElement The element that might contain NPC data
 *
 * @return True if a NPC was found, false if not
 */
function processElement(cellElement) {
	// Fix fallback player data
	var playerExpectedLife = extractStatValue('Lifepoints', 300);
	var playerStrength = extractStatValue('Attackpower', 3179 + 80);
	var playerDefense = extractStatValue('Defensepower', 1173 + 130);
	// Threshold at which lifepoint loss is critical
	var critLifeThreshold = 100;
	var npcNameElement = $(cellElement).find('b');
	var npcFastAttackElement = $(cellElement).find('.fastattack');
	if ($(npcNameElement).length > 0 && $(npcFastAttackElement).length > 0) {
		// Skip if NPC was already processed before
		if ($(npcNameElement).hasClass('processedNPC')) {
			return $(npcNameElement).hasClass('knownNPC');
		}
		var npcName = $(npcNameElement).text();
		// Remove stuff like '(Aggressiv)' from the name
		npcName = npcName.replace(/\(.*\)/gi, '').trim();
		var lifeLoss = computeOutcome(playerExpectedLife, playerStrength, playerDefense, npcName);
		if (isCriticalSpecialNpc(npcName)) {
			// NPC is a critical special NPC
			$(npcFastAttackElement).css('color', '#F00F0F');
			$(npcFastAttackElement).append(' (crit-special)');
			$(npcFastAttackElement).removeAttr('href');
			$(npcFastAttackElement).removeAttr('onclick');
			$(npcNameElement).addClass('processedNPC knownNPC');
		} else if (isNonCriticalSpecialNpc(npcName)) {
			// NPC is a non critical special NPC
			$(npcFastAttackElement).css('color', '#F00F0F');
			$(npcFastAttackElement).append(' (non-crit-special)');
			$(npcFastAttackElement).removeAttr('href');
			$(npcFastAttackElement).removeAttr('onclick');
			$(npcFastAttackElement).hide();
			$(npcNameElement).addClass('processedNPC knownNPC');
		} else if (initIgnoreNpcData(npcName) && npcAutoAttack) {
			// nothing because this is your ignore list for auto attack if set to true
		} else if (lifeLoss == -1) {
			// Player looses
			$(npcFastAttackElement).removeAttr('href');
			$(npcFastAttackElement).removeAttr('onclick');
			$(npcFastAttackElement).off('click');
			$(npcFastAttackElement).text('Defeat').css({
				color: 'red',
				fontWeight: 'bold'
			});
			$(npcNameElement).addClass('processedNPC knownNPC');
			return true;
		} else if (lifeLoss == -2) {
			// NPC is unknown
			$(npcFastAttackElement).css('color', '#0D4BF2');
			$(npcFastAttackElement).append(' (unknown)');
			$(npcNameElement).addClass('processedNPC unknownNPC');
			return false;
		} else {
			// Player wins
			if (lifeLoss >= critLifeThreshold || npcName == 'Undaron') {
				$(npcFastAttackElement).css('color', '#E7971F');
			}
			$(npcNameElement).addClass('processedNPC knownNPC');
			$(npcFastAttackElement).css('color', '#006400');
			$(npcFastAttackElement).append(' ( -' + lifeLoss + ' LP, = ' + (playerExpectedLife - lifeLoss) + ' LP )');
			// Npc auto attack if enable
			if (npcAutoAttack) {
				const randomWait = Math.floor(Math.random() * (2000 - 500 + 1) + 500);
				setTimeout(function() {
				$(npcFastAttackElement).trigger('click');
				}, randomWait)};
			return true;
		}
	}
}

/*
 * Computes the outcome of a battle between the player and a NPC.
 *
 * @param playerLife The amount of lifepoints the player has
 * @param playerStrength The strength of the player
 * @param playerDefense The defense of the player
 * @param npcName The name of the NPC
 *
 * @return The amount of lifepoints loosed in the battle. -1 if the player
 * gets defeated and -2 if the NPC is unknown.
 */
function computeOutcome(playerLife, playerStrength, playerDefense, npcName) {
	var npcStrength = getNpcStrength(npcName);
	var npcLife = getNpcLife(npcName);
	if (npcStrength < 0 || npcLife < 0) {
		return -2;
	}
	// A hit deals at most one point of damage
	var howManyHits = Math.ceil(npcLife / playerStrength);
	var lifeLossPerHit = Math.max(1, npcStrength - playerDefense);
	var lifeLoss = Math.max(1, Math.ceil(howManyHits * lifeLossPerHit));
	if (lifeLoss >= playerLife) {
		return -1;
	} else {
		return lifeLoss;
	}
}

/*
 * Gets the strength of a given NPC.
 *
 * @param npcName The name of the NPC
 *
 * @return The strength of the NPC or -1 if it is unknown or has 0 strength.
 */
function getNpcStrength(npcName) {
	var strength = 0;
	if (npcName in npcData) {
		strength = npcData[npcName][0];
	} else {
		// Try it with the first character uppered
		var upperedNpcName = firstCharToUpperCase(npcName);
		if (upperedNpcName in npcData) {
			strength = npcData[upperedNpcName][0];
		}
	}
	// If NPC data could not be found or strength is 0, NPC is unknown
	if (strength == 0) {
		return -1;
	} else {
		return strength;
	}
}

/*
 * Gets the amount of lifepoints the given NPC has.
 *
 * @param npcName The name of the NPC
 *
 * @return The amount of lifepoints the NPC has or -1 if it is unknown or has 0 lifepoints.
 */
function getNpcLife(npcName) {
	var life = 0;
	if (npcName in npcData) {
		life = npcData[npcName][1];
	} else {
		// Try it with the first character uppered
		var upperedNpcName = firstCharToUpperCase(npcName);
		if (upperedNpcName in npcData) {
			life = npcData[upperedNpcName][1];
		}
	}
	// If NPC data could not be found or life is 0, NPC is unknown
	if (life == 0) {
		return -1;
	} else {
		return life;
	}
}

/*
 * Returns wether the given NPC is a critical special NPC.
 *
 * @param npcName The name of the NPC
 *
 * @return True if the given NPC is a critical special NPC, false if not.
 */
function isCriticalSpecialNpc(npcName) {
	var foundNpc = false;
	if (npcName in critSpecialNpc) {
		foundNpc = true;
	} else {
		// Try it with the first character uppered
		var upperedNpcName = firstCharToUpperCase(npcName);
		if (upperedNpcName in critSpecialNpc) {
			foundNpc = true;
		}
	}
	return foundNpc;
}

/*
 * Returns wether the given NPC is a non critical special NPC.
 *
 * @param npcName The name of the NPC
 *
 * @return True if the given NPC is a non critical special NPC, false if not.
 */
function isNonCriticalSpecialNpc(npcName) {
	var foundNpc = false;
	if (npcName in nonCritSpecialNpc) {
		foundNpc = true;
	} else {
		// Try it with the first character uppered
		var upperedNpcName = firstCharToUpperCase(npcName);
		if (upperedNpcName in nonCritSpecialNpc) {
			foundNpc = true;
		}
	}
	return foundNpc;
}

/*
 * Uppers the first character of a given String.
 *
 * @param str String to upper first character
 *
 * @return String where the first character was uppered
 */
function firstCharToUpperCase(str) {
	return str.substr(0, 1).toUpperCase() + str.substr(1);
}

/*
 * Checks whether the browser does support webstorage or not.
 * @returns True if it is supported, false if not
 */
function isSupportingWebStorage() {
	return typeof(Storage) !== "undefined";
}

/*
 * Gets the content of the cookie with the given name
 * @param c_name The name of the cookie to get
 * @returns The content of the given cookie
 */
function getCookie(c_name) {
	var i, x, y, ARRcookies = document.cookie.split(';');
	for (i = 0; i < ARRcookies.length; i++) {
		x = ARRcookies[i].substr(0, ARRcookies[i].indexOf('='));
		y = ARRcookies[i].substr(ARRcookies[i].indexOf('=') + 1);
		x = x.replace(/^\s+|\s+$/g, '');
		if (x == c_name) {
			return unescape(y);
		}
	}
}

/*
 * Gets the value of the given player stat. The value is saved via webstorage or as cookie.
 * @param statName The name of the player stat to get
 * @returns The value of the given player stat, greater equals 0 or -1 if the value is invalid or does not exist
 */
function getStatValue(statName) {
	var value;
	if (isSupportingWebStorage()) {
		// Use webstorage
		value = sessionStorage.getItem('freewarBattleCalculatorStat' + statName);
	} else {
		// Fall back to cookies
		value = getCookie('freewarBattleCalculatorStat' + statName);
	}
	var valueAsNumber = parseInt(value);
	// If the value does not exist or contains invalid data, return -1
	if (value == null || value == '' || valueAsNumber < 0) {
		return -1;
	} else {
		return valueAsNumber;
	}
}

/*
 * Extracts the value of the given player stat. The value is saved via webstorage or as cookie.
 * @param statName The name of the player stat to get
 * @param fallbackValue The value to use if the extracted value is inexistent or invalid
 * @returns The extracted value of the given player stat, greater equals 0 or the fallback value if
 *   the extracted value is invalid or does not exist
 */
function extractStatValue(statName, fallbackValue) {
	var extractedValue = getStatValue(statName);
	// If value is invalid, fall back
	if (extractedValue == -1) {
		return fallbackValue;
	} else {
		return extractedValue;
	}
}

/*
 * Initializes the ignore list NPC data structure.
 */
function initIgnoreNpcData() {
	// Ignore NPC
	npcData['Sprühregenwurm'] = [3, 25];
	npcData['Alter Mann'] = [1, 3];
	npcData['Undaron'] = [1, 10];
}

/*
 * Initializes the critical special NPC data structure.
 */
function initCriticalSpecialNpc() {
	// Resistance NPC
	critSpecialNpc['Achtsamer Stachelschuss-Igel'] = true;
	critSpecialNpc['Blutresistenz-NPC'] = true;
	critSpecialNpc['Bockiger Stier'] = true;
	critSpecialNpc['Dickhäutiger Graustein-Bär'] = true;
	critSpecialNpc['Gepanzertes Undaron'] = true;
	critSpecialNpc['Glitschige Dunkelsee-Qualle'] = true;
	critSpecialNpc['Robuster Morschgreifer'] = true;
	critSpecialNpc['Sandiger Wirbelwind'] = true;
	critSpecialNpc['Schnelle Bernstein-Raupe'] = true;
	critSpecialNpc['Schneller Stororaptor'] = true;
	critSpecialNpc['Schneller Tempelkrabbler'] = true;
	critSpecialNpc['Schnelles Tonar-Reptil'] = true;
	critSpecialNpc['Stepto-Waran'] = true;
	critSpecialNpc['Transparenter Schatten'] = true;
	critSpecialNpc['Wachsamer Frostwolf'] = true;
	critSpecialNpc['Wendige Glypra'] = true;
	critSpecialNpc['Zäher Spindelschreiter'] = true;
	// Super Resistance NPC
	critSpecialNpc['Absorbierende Dunkelsee-Qualle'] = true;
	critSpecialNpc['Alter Frostwolf'] = true;
	critSpecialNpc['Alter Stororaptor'] = true;
	critSpecialNpc['Bestialisches Tonar-Reptil'] = true;
	critSpecialNpc['Dickhäutiger Goldballenwurm'] = true;
	critSpecialNpc['Enormer Graustein-Bär'] = true;
	critSpecialNpc['Flinker Bernstein-Falke'] = true;
	critSpecialNpc['Glypra-Spion'] = true;
	critSpecialNpc['Metallischer Morschgreifer'] = true;
	critSpecialNpc['Resistenter Schatten'] = true;
	critSpecialNpc['Resistenter Stachelschuss-Igel'] = true;
	critSpecialNpc['Robuster Spindelschreiter'] = true;
	critSpecialNpc['Schnellflatter-Schmetterling'] = true;
	critSpecialNpc['Unverwüstliches Undaron'] = true;
	critSpecialNpc['Zäher Ontolon'] = true;
	// Special exeptions
	critSpecialNpc['kräftiger Graustein-Bär'] = true;
}

/*
 * Initializes the non critical special NPC data structure.
 */
function initNonCriticalSpecialNpc() {
	// Unique-NPC
	nonCritSpecialNpc['Abtrünnige Wolke'] = true;
	nonCritSpecialNpc['Anatubischer Windhund'] = true;
	nonCritSpecialNpc['Ausgesaugter Energiewurm'] = true;
	nonCritSpecialNpc['Blutapfelbaum'] = true;
	nonCritSpecialNpc['Diebstahlfallen-Verwalter'] = true;
	nonCritSpecialNpc['Dreiköpfige Wasserschlange'] = true;
	nonCritSpecialNpc['Dunkler Matschreißer'] = true;
	nonCritSpecialNpc['Dämonenhund'] = true;
	nonCritSpecialNpc['Entflohener Mörder'] = true;
	nonCritSpecialNpc['Erd-Skelkos'] = true;
	nonCritSpecialNpc['Experimental-Phasenwesen'] = true;
	nonCritSpecialNpc['Fliegender Todesfarn'] = true;
	nonCritSpecialNpc['Gefallenes Lichtwesen'] = true;
	nonCritSpecialNpc['Giftgeist von Narubia'] = true;
	nonCritSpecialNpc['Goldhornziege'] = true;
	nonCritSpecialNpc['Goldkrake'] = true;
	nonCritSpecialNpc['Grabräuber'] = true;
	nonCritSpecialNpc['Grabschlecker'] = true;
	nonCritSpecialNpc['Großer Blattalisk'] = true;
	nonCritSpecialNpc['Großer Nebelkreischer'] = true;
	nonCritSpecialNpc['Großes Eistentakel'] = true;
	nonCritSpecialNpc['Grüne Rotorlibelle'] = true;
	nonCritSpecialNpc['Heilender Baum (NPC)'] = true;
	nonCritSpecialNpc['Jerodar-Anführer'] = true;
	nonCritSpecialNpc['Knorpel-Monster aus Draht (NPC)'] = true;
	nonCritSpecialNpc['Kopolaspinne'] = true;
	nonCritSpecialNpc['Kurnotan - der dunkle Magier'] = true;
	nonCritSpecialNpc['Lola - Die Hauskawutze'] = true;
	nonCritSpecialNpc['Magier der dunklen Macht'] = true;
	nonCritSpecialNpc['Mutierter Koloa-Käfer'] = true;
	nonCritSpecialNpc['Mutter der Geysir-Schlucker'] = true;
	nonCritSpecialNpc['Nebelgeist Argarie'] = true;
	nonCritSpecialNpc['Nebelgeist Bargu'] = true;
	nonCritSpecialNpc['Nebelgeist Frorie'] = true;
	nonCritSpecialNpc['Nebelgeist Girie'] = true;
	nonCritSpecialNpc['Nebelgeist Murahn'] = true;
	nonCritSpecialNpc['Nebelgeist Napirie'] = true;
	nonCritSpecialNpc['Nebelgeist Nukarie'] = true;
	nonCritSpecialNpc['Nebelgeist Sorlie'] = true;
	nonCritSpecialNpc['Nebelgeist Viginur'] = true;
	nonCritSpecialNpc['Nebelgeist Wrozie'] = true;
	nonCritSpecialNpc['Onuk Kulo'] = true;
	nonCritSpecialNpc['Phasenverbrenner'] = true;
	nonCritSpecialNpc['Pironer'] = true;
	nonCritSpecialNpc['Randalierer'] = true;
	nonCritSpecialNpc['Rote Landkoralle'] = true;
	nonCritSpecialNpc['Roteiskoralle'] = true;
	nonCritSpecialNpc['Schatten-Ei'] = true;
	nonCritSpecialNpc['Schattenkreatur Gortari'] = true;
	nonCritSpecialNpc['Schattenkreatur Jalakori'] = true;
	nonCritSpecialNpc['Schattenkreatur Mantori'] = true;
	nonCritSpecialNpc['Schattenkreatur Turwakori'] = true;
	nonCritSpecialNpc['Schattenkreatur XY (Unique-NPC)'] = true;
	nonCritSpecialNpc['Schatzsucher (Unique-NPC)'] = true;
	nonCritSpecialNpc['Schmieriger Geschäftemacher'] = true;
	nonCritSpecialNpc['Schneeworan'] = true;
	nonCritSpecialNpc['Schwebende Goldkutsche'] = true;
	nonCritSpecialNpc['Spezialist für Erze'] = true;
	nonCritSpecialNpc['Staubkrieger'] = true;
	nonCritSpecialNpc['Stein-Koloss'] = true;
	nonCritSpecialNpc['Stein-Skelkos'] = true;
	nonCritSpecialNpc['Sula-Echse'] = true;
	nonCritSpecialNpc['Tilua-Pflanze'] = true;
	nonCritSpecialNpc['Todesflossen-Fisch'] = true;
	nonCritSpecialNpc['Turmgeist'] = true;
	nonCritSpecialNpc['Tänzerin von Beispieluser'] = true;
	nonCritSpecialNpc['Untoter Bürgermeister'] = true;
	nonCritSpecialNpc['Vater aller Stachelschuss-Igel'] = true;
	nonCritSpecialNpc['Wahnsinniger Waldschlurch'] = true;
	nonCritSpecialNpc['Wasser-Schemen'] = true;
	nonCritSpecialNpc['Wetterkontroll-Magier'] = true;
	nonCritSpecialNpc['Wucherwurzelbaum (NPC)'] = true;
	nonCritSpecialNpc['Wütender Stachelkäfer'] = true;
	// Group-NPC
	nonCritSpecialNpc['26-köpfiger Salamander'] = true;
	nonCritSpecialNpc['Angepasster Ontolon'] = true;
	nonCritSpecialNpc['Baru-Schrecke'] = true;
	nonCritSpecialNpc['Behüter der Kathedrale'] = true;
	nonCritSpecialNpc['Bernstein-Dokun'] = true;
	nonCritSpecialNpc['Beuteltiger'] = true;
	nonCritSpecialNpc['Bierbraumeister'] = true;
	nonCritSpecialNpc['Blauer Landfisch'] = true;
	nonCritSpecialNpc['Blaues Stachel-Kowu'] = true;
	nonCritSpecialNpc['Blutprobenwesen'] = true;
	nonCritSpecialNpc['Bulliges Erd-Skelkos'] = true;
	nonCritSpecialNpc['Diener des Feuers'] = true;
	nonCritSpecialNpc['Dunkelmorin'] = true;
	nonCritSpecialNpc['Dunkelschlamm-Wurm'] = true;
	nonCritSpecialNpc['Dunkelstern-Seher'] = true;
	nonCritSpecialNpc['Dunkelwald-Skelett'] = true;
	nonCritSpecialNpc['Eis-Tornado'] = true;
	nonCritSpecialNpc['Eiswelt-Echse'] = true;
	nonCritSpecialNpc['Element-Wurm'] = true;
	nonCritSpecialNpc['Erzbohrmaschine'] = true;
	nonCritSpecialNpc['Feuerwachtel'] = true;
	nonCritSpecialNpc['Finsterer Magier'] = true;
	nonCritSpecialNpc['Flimmernde Farbanomalie'] = true;
	nonCritSpecialNpc['Flondor'] = true;
	nonCritSpecialNpc['Gepanzerte Eidechse'] = true;
	nonCritSpecialNpc['Gieriger Barsch'] = true;
	nonCritSpecialNpc['gigantische Seerose'] = true;
	nonCritSpecialNpc['Gigantischer Schneewurm'] = true;
	nonCritSpecialNpc['Großer Prärieskorpion'] = true;
	nonCritSpecialNpc['Grünbaum-Affe'] = true;
	nonCritSpecialNpc['Grünes Stachel-Kowu'] = true;
	nonCritSpecialNpc['Halbverarbeiteter Taruner'] = true;
	nonCritSpecialNpc['Herrscher der eisigen Dämonen'] = true;
	nonCritSpecialNpc['Herz des Blutwaldes'] = true;
	nonCritSpecialNpc['Holzbeißer'] = true;
	nonCritSpecialNpc['Klippenspringer'] = true;
	nonCritSpecialNpc['Kollektiver Salzhügel'] = true;
	nonCritSpecialNpc['Königlicher Schmetterling'] = true;
	nonCritSpecialNpc['Kranker Schmetterling'] = true;
	nonCritSpecialNpc['Kreidekrokodil'] = true;
	nonCritSpecialNpc['Larpan'] = true;
	nonCritSpecialNpc['Lebende Waldwurzel'] = true;
	nonCritSpecialNpc['Lebender Tropfstein'] = true;
	nonCritSpecialNpc['lebender Steingipfel'] = true;
	nonCritSpecialNpc['Loroktom, der große Steingolem'] = true;
	nonCritSpecialNpc['Luftschloss'] = true;
	nonCritSpecialNpc['Massive Landqualle'] = true;
	nonCritSpecialNpc['mutierte Koralle'] = true;
	nonCritSpecialNpc['Nebelprinzessin'] = true;
	nonCritSpecialNpc['Nebelwolf'] = true;
	nonCritSpecialNpc['Papagei'] = true;
	nonCritSpecialNpc['Phasenskelkos'] = true;
	nonCritSpecialNpc['Schattenkreatur XY (Gruppen-NPC)'] = true;
	nonCritSpecialNpc['Schattenkrokodil'] = true;
	nonCritSpecialNpc['Siedestein-Morschgreifer'] = true;
	nonCritSpecialNpc['Silberfluss-Bär'] = true;
	nonCritSpecialNpc['Siramücken-Schwarm'] = true;
	nonCritSpecialNpc['Sohn des Wiesengeistes'] = true;
	nonCritSpecialNpc['Spindelschreiter-Überwacher'] = true;
	nonCritSpecialNpc['Spinne der Staubnetze'] = true;
	nonCritSpecialNpc['Staubschleifer-Königin'] = true;
	nonCritSpecialNpc['Störrischer Stororaptor'] = true;
	nonCritSpecialNpc['Teidam-Baby'] = true;
	nonCritSpecialNpc['Tempelhüter'] = true;
	nonCritSpecialNpc['Tempelwächter'] = true;
	nonCritSpecialNpc['Tollwütiger Graustein-Bär'] = true;
	nonCritSpecialNpc['Turmwart'] = true;
	nonCritSpecialNpc['Vertin'] = true;
	nonCritSpecialNpc['Untoter Kaklatron'] = true;
	nonCritSpecialNpc['Untoter Laubbär'] = true;
	nonCritSpecialNpc['Untoter Wandschleim'] = true;
	nonCritSpecialNpc['Waldmonster'] = true;
	nonCritSpecialNpc['Wandelnder Laubbaum'] = true;
	nonCritSpecialNpc['Weltenwandler'] = true;
	nonCritSpecialNpc['Wüstenkrake'] = true;
	nonCritSpecialNpc['zartbesaiteter Goldballenwurm'] = true;
}

/*
 * Initializes the NPC data structure.
 */
function initNpcData() {
	// NPC Data Begin
	npcData['26-köpfiger Salamander'] = [67, 25000];
	npcData['Aasgeier'] = [2, 10];
	npcData['Aasgeier'] = [2, 7];
	npcData['Abgesandter der Eiswelt (Oberfläche)'] = [34, 6000];
	npcData['Abgesandter der Eiswelt (Vorhof der Eiswelt)'] = [34, 6000];
	npcData['Abgestürzte Lichtpflanze'] = [5, 45];
	npcData['Abgestürzter Weltraum-Krake'] = [13, 200];
	npcData['Absorbierende Dunkelsee-Qualle'] = [360, 189];
	npcData['Abtrünnige Wolke'] = [95, 25000];
	npcData['Achtsamer Stachelschuss-Igel'] = [550, 274];
	npcData['Aggressiver Vipara'] = [18, 300];
	npcData['Algenechse'] = [6, 60];
	npcData['Alte Grottenschlange'] = [2710, 420000];
	npcData['Alte Pilzwachtel'] = [1, 3];
	npcData['Alter Frostwolf'] = [420, 204];
	npcData['Alter Goldballenwurm'] = [5, 15];
	npcData['Alter Steinbrunnen'] = [12, 60];
	npcData['Alter Stororaptor'] = [250, 119];
	npcData['Alter Ölfisch'] = [12, 150];
	npcData['Altes Blätterwesen'] = [5, 50];
	npcData['Altes Kaklatron'] = [2, 7];
	npcData['Altstadtratte'] = [3, 12];
	npcData['Ameisenhügel'] = [2, 13];
	npcData['Anatubischer Windhund'] = [15, 200];
	npcData['Anemonenfisch'] = [9, 90];
	npcData['Angebissene Lianenechse'] = [3, 10];
	npcData['Angepasster Ontolon'] = [80, 10000];
	npcData['Angriffslustiger Riesenkrebs'] = [6142, 188620820];
	npcData['Angstbarriere'] = [0, 5];
	npcData['Aschenfledermaus'] = [2, 12];
	npcData['Aschenflügel'] = [24, 640];
	npcData['Aschenvogel'] = [2, 20];
	npcData['Astgreifer'] = [228, 51948];
	npcData['Aufgeregter Nebelhüpfer'] = [5, 15];
	npcData['Ausgesaugter Energiewurm'] = [1, 1];
	npcData['Ausgestoßener Glypra'] = [12, 350];
	npcData['Ausgewachsener Strativar'] = [552, 75000];
	npcData['Baby-Einflügler'] = [5, 90];
	npcData['Badender Frostwolf-Welpe'] = [8, 70];
	npcData['Baru-Giftegel'] = [2, 7];
	npcData['Baru-Schrecke'] = [50, 7000];
	npcData['Baumkuschler'] = [5, 70];
	npcData['Behüter der Kathedrale'] = [55, 1000];
	npcData['Belebender Falter'] = [3, 12];
	npcData['Belpharia-Tucan'] = [1, 2];
	npcData['Bemooster Felsblock'] = [1111, 555555];
	npcData['Benebeltes Mormdat'] = [3, 10];
	npcData['Berghase'] = [1, 2];
	npcData['Berghund'] = [5, 45];
	npcData['Bergpilz'] = [2, 70];
	npcData['Bernstein-Dokun'] = [100, 80000];
	npcData['Bernstein-Falke'] = [199, 40000];
	npcData['Bernstein-Raupe'] = [8, 100];
	npcData['Bestialisches Tonar-Reptil'] = [180, 80];
	npcData['Betrunkener Rabauke'] = [0, 0];
	npcData['Beuteltiger'] = [40, 8000];
	npcData['Bierbraumeister'] = [60, 200];
	npcData['Bissiger Ölfisch'] = [73, 8000];
	npcData['Blattalisk'] = [5, 50];
	npcData['Blattspinne'] = [2, 25];
	npcData['Blauer Landfisch'] = [30, 29000];
	npcData['Blauer Stachelschuss-Igel'] = [86, 6000];
	npcData['Blauer Todesläufer'] = [35, 1200];
	npcData['Blaues Glühwürmchen'] = [12, 200];
	npcData['Blaues Stachel-Kowu'] = [41, 10000];
	npcData['Blaukamm-Vogel'] = [1, 10];
	npcData['Blauschimmer-Ameise'] = [62, 3900];
	npcData['Blauwaldwurm'] = [2, 30];
	npcData['Blitzeiskuppel'] = [0, 3];
	npcData['Blumenbeißer'] = [2, 7];
	npcData['Blutameise'] = [1, 1];
	npcData['Blutapfelbaum'] = [25, 12500];
	npcData['Blutblatt'] = [1, 1];
	npcData['Blutblob'] = [40, 1600];
	npcData['Blutende Lianenschlinge'] = [3, 5];
	npcData['Blutforsch'] = [1, 2];
	npcData['Blutgeflecht'] = [0, 0];
	npcData['Blutharzgeschoss'] = [172, 29584];
	npcData['Blutharzregen'] = [31, 961];
	npcData['Blutharztropfen'] = [1, 1];
	npcData['Blutige Peitschenliane'] = [37, 6500];
	npcData['Blutiger Stein'] = [8, 40];
	npcData['Blutiges Schaf'] = [1, 5];
	npcData['Blutkrähe'] = [33, 1089];
	npcData['Blutkäfer'] = [1, 4];
	npcData['Blutprobenwesen'] = [0, 0];
	npcData['Blutrabe'] = [22, 484];
	npcData['Blutresistenz-NPC'] = [0, 0];
	npcData['Blutspinne'] = [2, 4];
	npcData['Blutspinnennetz'] = [3, 9];
	npcData['Blutwanze'] = [3, 9];
	npcData['Blutwurm'] = [4, 18];
	npcData['Bockiger Stier'] = [0, 0];
	npcData['Borkende Blutbirke'] = [0, 0];
	npcData['Borstenfisch'] = [3, 20];
	npcData['Braktarian'] = [1750, 305];
	npcData['Bran-Schleim'] = [90, 980];
	npcData['Braunbär'] = [19, 190];
	npcData['Braune Raubspinne'] = [283, 24834];
	npcData['Breiter Felsen'] = [3, 12];
	npcData['Brennendes Schaf'] = [1, 5];
	npcData['Briefbeschwerer-Dieb'] = [8, 65];
	npcData['Brotandro-Virus'] = [111, 1300];
	npcData['Bruder des Nebelbesens'] = [3, 15];
	npcData['Brummkäfer'] = [1, 10];
	npcData['Brutaler Fallensteller'] = [850, 135000];
	npcData['Brznkk Gttsnz'] = [0, 5000];
	npcData['Bulliges Erd-Skelkos'] = [85, 300];
	npcData['Buntbachfilche'] = [6, 55];
	npcData['Busch-Frul'] = [5, 55];
	npcData['Bussard'] = [17, 260];
	npcData['Bücherwurm'] = [1, 5];
	npcData['Chiup-Vogel'] = [2, 15];
	npcData['Crim Garaank'] = [40, 10000];
	npcData['Deckenkleiber'] = [3, 10];
	npcData['Denkender Lavablob'] = [28, 7000];
	npcData['Der Unermüdliche'] = [38, 1420];
	npcData['Diamantader'] = [0, 5];
	npcData['Diamantfisch'] = [6, 70];
	npcData['Dicke, fette Strandkrabbe'] = [4, 20];
	npcData['Dicker Zukuvogel'] = [2, 15];
	npcData['Dickhäutiger Goldballenwurm'] = [340, 180];
	npcData['Dickhäutiger Graustein-Bär'] = [20, 62];
	npcData['Diebstahlfalle (NPC)'] = [0, 100];
	npcData['Diebstahlfallen-Verwalter'] = [42, 10000];
	npcData['Diener des Feuers'] = [150, 20000];
	npcData['Diener von Beispieluser'] = [0, 0];
	npcData['Dilinug'] = [1, 2];
	npcData['Donnersandschlange'] = [6, 60];
	npcData['Donnerstier'] = [9, 180];
	npcData['Doppelköpfiger Riesenskorpion'] = [8, 100];
	npcData['Dradonfalter'] = [9, 60];
	npcData['Dreiköpfige Wasserschlange'] = [25, 10000];
	npcData['Dreiäugiger Stier'] = [3, 3];
	npcData['Duftendes Grünschleimwesen'] = [666, 90000];
	npcData['Dummer Lavablob'] = [3, 15];
	npcData['Dunbrakatze'] = [2, 20];
	npcData['Dunkelgrottenpilz'] = [9, 120];
	npcData['Dunkelmorin'] = [800, 80000];
	npcData['Dunkelmorin-Skelett'] = [311, 45000];
	npcData['Dunkelsand-Schmetterling'] = [13, 50];
	npcData['Dunkelsandkrebs'] = [12, 250];
	npcData['Dunkelschlamm-Wurm'] = [23, 3000];
	npcData['Dunkelsee-Qualle'] = [32, 250];
	npcData['Dunkelstern-Arbeiter'] = [4, 30];
	npcData['Dunkelstern-Krieger'] = [7, 70];
	npcData['Dunkelstern-Magier'] = [9, 100];
	npcData['Dunkelstern-Seher'] = [255, 40000];
	npcData['Dunkelwald-Skelett'] = [90, 400000];
	npcData['Dunkelwanze'] = [4, 20];
	npcData['Dunkle Sandratte'] = [2, 7];
	npcData['Dunkler Matschreißer'] = [24, 10000];
	npcData['Dunkler Sandtaprap'] = [17, 700];
	npcData['Dunkler Schamane'] = [12, 180];
	npcData['Durchgedrehter Felsenschreier'] = [343, 46000];
	npcData['Durchgeknallter Nebelkreischer'] = [240, 35];
	npcData['Durstige Riesenlibelle'] = [2, 10];
	npcData['Dämonenhund'] = [20, 2000];
	npcData['Dämonisches Grünschleimwesen'] = [666, 90000];
	npcData['Edelsteinschlurch'] = [39, 356];
	npcData['Ein Schwarm Blutkrähen'] = [100, 10000];
	npcData['Eine Schar Blutraben'] = [147, 21609];
	npcData['Einflügler'] = [400, 60000];
	npcData['Einsamer Schneehase'] = [2, 8];
	npcData['Einsamer Waldhüpfer'] = [5, 20];
	npcData['Einäugiger Stier'] = [3, 12];
	npcData['Eis-Tornado'] = [200, 17000];
	npcData['Eisbohrmaschine'] = [7, 90];
	npcData['Eisbohrmaschine-Prototyp'] = [7, 90];
	npcData['Eiskaktus'] = [307, 91827];
	npcData['Eisqualle'] = [7603, 288800230];
	npcData['Eisschleimgrünling'] = [0, 0];
	npcData['Eisseeigel'] = [6, 52];
	npcData['Eisvogel'] = [8, 60];
	npcData['Eiswelt-Echse'] = [340, 10000];
	npcData['Eiswurm'] = [6, 40];
	npcData['Ektofron'] = [50, 5000];
	npcData['Element-Wurm'] = [1132, 50000];
	npcData['Energetischer Falter'] = [6, 25];
	npcData['Energiewurm'] = [2, 40];
	npcData['Enorme Stachelschildkröte'] = [1800, 350000];
	npcData['Enormer Graustein-Bär'] = [49, 0];
	npcData['Entflohener Mörder'] = [215, 9000];
	npcData['Entlaufene Geisterschabe'] = [3, 17];
	npcData['Entspannte Flachassel'] = [2, 25];
	npcData['Erd-Skelkos'] = [8, 300];
	npcData['Erdfisch'] = [4, 25];
	npcData['Erdkäfer'] = [1, 2];
	npcData['Erdschlurch'] = [2, 13];
	npcData['Erdvogel'] = [7, 50];
	npcData['Erfahrener Frostwolf'] = [1700, 840000];
	npcData['Erfahrener Frostwolf'] = [1110, 380000];
	npcData['Erfahrener Frostwolf'] = [1240, 420000];
	npcData['Erfahrener Frostwolf'] = [1400, 640000];
	npcData['Erfahrener Frostwolf'] = [1540, 740000];
	npcData['Erfrorener Lava-Käfer'] = [1, 1];
	npcData['Erfrorenes Schaf'] = [1, 5];
	npcData['Erschöpfte Klauenratte'] = [1, 7];
	npcData['Ertrinkender Energiewurm'] = [2, 40];
	npcData['Erzbohrmaschine'] = [26, 16000];
	npcData['Erzschnecke'] = [4586, 131331333];
	npcData['Exil-Nomade'] = [5, 50];
	npcData['Exotischer Fisch'] = [2, 5];
	npcData['Experimental-Phasenwesen'] = [123, 1234567890];
	npcData['Explosionsfalle (NPC)'] = [0, 100];
	npcData['Explosiver Tempelschleim'] = [2, 19];
	npcData['Fahrender Händler'] = [0, 1000];
	npcData['Fahrgrid'] = [0, 1000];
	npcData['Fallensteller'] = [8, 90];
	npcData['Fauler Eisbär'] = [0, 22000];
	npcData['Feldhase'] = [1, 2];
	npcData['Felsenassel'] = [2, 15];
	npcData['Felsenechse'] = [5, 60];
	npcData['Felsenkrabbler'] = [473, 76450];
	npcData['Felsenkriecher'] = [762, 648000];
	npcData['Felsenkriecher'] = [332, 45000];
	npcData['Felsenkriecher'] = [762, 348000];
	npcData['Felsenkriecher'] = [762, 354000];
	npcData['Felsenschreier'] = [10, 1];
	npcData['Felsenwurm'] = [4, 20];
	npcData['Fenir Moosbart'] = [0, 0];
	npcData['Feuerfuchs'] = [276, 380880];
	npcData['Feuergeist'] = [25, 3000];
	npcData['Feuerkäfer'] = [3, 30];
	npcData['Feuerlaub-Echse'] = [6, 70];
	npcData['Feuerlurch'] = [15, 150];
	npcData['Feuerskorpion'] = [8954, 482955205];
	npcData['Feuervogel'] = [25, 3000];
	npcData['Feuerwachtel'] = [17, 4000];
	npcData['Feuerwolf'] = [2, 9];
	npcData['Feueröl-Händler'] = [0, 1000];
	npcData['Feurige Torpon-Schlange'] = [5000, 25000];
	npcData['Feuriger Schmetterling'] = [23, 230];
	npcData['Finstereis-Bewacher'] = [1, 100];
	npcData['Finsterer Magier'] = [42, 5];
	npcData['Fischer von Terasi'] = [0, 9999];
	npcData['Flachassel'] = [2, 25];
	npcData['Flammendes Glühwürmchen'] = [1, 2];
	npcData['Flammenwurm'] = [2, 15];
	npcData['Flecken-Wolf'] = [2, 18];
	npcData['Fleckfarbenfisch'] = [25, 800];
	npcData['Fleischfressende Sao-Pflanze'] = [3, 20];
	npcData['Fleißiges Lichtwesen'] = [8, 155];
	npcData['Fliegende Kuh'] = [1, 3];
	npcData['Fliegende Nebelkugel'] = [20, 200];
	npcData['Fliegender Todesfarn'] = [28, 28000];
	npcData['Flimmernde Farbanomalie'] = [26, 1000];
	npcData['Flinker Bernstein-Falke'] = [120, 54];
	npcData['Flondor'] = [996, 200000];
	npcData['Flossenflinger'] = [3, 37];
	npcData['Fluktuatives Zauberlabor'] = [0, 1000];
	npcData['Flussmakrele'] = [45, 404];
	npcData['Flüstergeist'] = [1, 30];
	npcData['Frierender Schneefisch'] = [1, 7];
	npcData['Frierender Schneekäfer'] = [2, 8];
	npcData['Frierender Schneewurm'] = [2, 35];
	npcData['Frierendes Schneewiesel'] = [1, 2];
	npcData['Frost-Wiesel'] = [9, 150];
	npcData['Frostaugen-Bestie'] = [7, 70];
	npcData['Frostdämon'] = [65, 12000];
	npcData['Frostgeist'] = [14, 250];
	npcData['Frostwolf'] = [870, 280000];
	npcData['Frostwolf'] = [145, 50000];
	npcData['Frostwolf'] = [215, 70000];
	npcData['Frostwolf'] = [251, 80000];
	npcData['Frostwolf'] = [327, 90000];
	npcData['Frostwolf'] = [385, 105000];
	npcData['Frostwolf'] = [416, 120000];
	npcData['Frostwolf'] = [433, 130000];
	npcData['Frostwolf'] = [449, 140000];
	npcData['Frostwolf'] = [495, 150000];
	npcData['Frostwolf'] = [534, 160000];
	npcData['Frostwolf'] = [571, 170000];
	npcData['Frostwolf'] = [610, 180000];
	npcData['Frostwolf'] = [648, 190000];
	npcData['Frostwolf'] = [680, 210000];
	npcData['Frostwolf'] = [781, 250000];
	npcData['Frostwolf-Anführer'] = [3010, 3700000];
	npcData['Frostwolf-Anführer'] = [2100, 2680000];
	npcData['Frostwolf-Anführer'] = [2400, 3080000];
	npcData['Frostwolf-Anführer'] = [2760, 3480000];
	npcData['Frostwolf-Welpe'] = [8, 70];
	npcData['Gardu-Strauchkäfer'] = [2, 8];
	npcData['Gartenschildkröte'] = [3643, 3126948];
	npcData['Gefallener Spindelschreiter'] = [5, 15];
	npcData['Gefallenes Lichtwesen'] = [9, 2000];
	npcData['Gefleckte Riesenlibelle'] = [4, 35];
	npcData['Gefräßiger Grashüpfer'] = [4, 33];
	npcData['Gefrässiger Schattensalamander'] = [35, 3200];
	npcData['Gefräßige Schotterraupe'] = [5, 40];
	npcData['Gefährliches Tier'] = [1, 100000000];
	npcData['Geist der Beschleunigung'] = [74, 760];
	npcData['Geist der Depressionen'] = [80, 30000];
	npcData['Geist der Finsternis'] = [5, 15];
	npcData['Geist der Flamme'] = [50, 400];
	npcData['Geist der heilenden Aura'] = [58, 520];
	npcData['Geist der Heilung'] = [50, 400];
	npcData['Geist der Regeneration'] = [86, 940];
	npcData['Geist der Ruhelosigkeit'] = [62, 580];
	npcData['Geist der Welt'] = [5, 40];
	npcData['Geist der Wärme'] = [66, 640];
	npcData['Geist des Frostes'] = [54, 460];
	npcData['Geist des Gesteins'] = [78, 820];
	npcData['Geist des Zorns'] = [82, 880];
	npcData['Geist von Pur Pur'] = [10, 130];
	npcData['Geister-Undaron'] = [10, 3];
	npcData['Geisterfetzen'] = [4, 30];
	npcData['Geisterschabe'] = [3, 17];
	npcData['Geisterschiff'] = [7238, 190456732];
	npcData['Geknickter lebender Ast'] = [2, 15];
	npcData['Gekrümmter Kreidewurm'] = [4, 5];
	npcData['Gelangweilter Fallensteller'] = [8, 90];
	npcData['Gelbbart-Yeti'] = [23, 2200];
	npcData['Gelbkatze'] = [1, 3];
	npcData['Gemeiner Unterwelt-Dämon'] = [45, 3000];
	npcData['Gepanzerte Eidechse'] = [63, 37000];
	npcData['Gepanzertes Undaron'] = [21, 80];
	npcData['Gepforn'] = [3, 20];
	npcData['Gerftar-Bakterium'] = [28, 230];
	npcData['Geröllschlange'] = [31, 2200];
	npcData['Geröllschlange'] = [23, 800];
	npcData['Geröllwiesenschlange'] = [2, 17];
	npcData['Geschwächter Abgesandter'] = [10, 300];
	npcData['Geschwächter Kreidevogel'] = [6, 10];
	npcData['Geschwächtes Kaklatron'] = [1, 7];
	npcData['Gestörter Schattenskorpion'] = [300, 270];
	npcData['Gewöhnliche Goldader'] = [0, 1];
	npcData['Geysir-Schlucker'] = [1200, 200000];
	npcData['Gieriger Barsch'] = [376, 100000];
	npcData['Giftbeißer'] = [4, 45];
	npcData['Giftblubberzahnmonster'] = [3, 12];
	npcData['Giftfalle (NPC)'] = [0, 100];
	npcData['Giftgeist von Narubia'] = [12, 17000];
	npcData['Giftgrabl'] = [10, 100];
	npcData['Giftiger Saugfisch'] = [2, 18];
	npcData['Giftschleimer'] = [6, 70];
	npcData['Giftsporenpilz'] = [3, 24];
	npcData['Gigantische Glasglocke'] = [0, 25];
	npcData['Gigantische Goldader'] = [0, 1];
	npcData['Gigantische Seerose'] = [1, 15];
	npcData['Gigantischer Schneewurm'] = [2878, 142521];
	npcData['Gigantischer Spindelschreiter'] = [1500, 225000];
	npcData['Gigantischer Staubgeist'] = [1021, 1080000];
	npcData['Gigantischer Todesläufer'] = [1040, 180000];
	npcData['Gipfellöwe'] = [2837, 1538000];
	npcData['Glashautmotte'] = [3422, 68444444];
	npcData['Glaswasserfisch'] = [7, 150];
	npcData['Gletscherente'] = [2, 10];
	npcData['Glibbriger Eiswurm'] = [6, 40];
	npcData['Glimmerfliege'] = [3, 10];
	npcData['Glimmermade'] = [30, 310];
	npcData['Glitschige Dunkelsee-Qualle'] = [380, 194];
	npcData['Glutlichtfalter'] = [123, 15951];
	npcData['Glutschleim (NPC)'] = [316, 50];
	npcData['Glutschleim (Unique-NPC)'] = [316, 147000];
	npcData['Glutschleimtropfen'] = [1, 50];
	npcData['Glypra'] = [12, 350];
	npcData['Glypra-Spion'] = [18, 15];
	npcData['Glypra-Späher'] = [12, 350];
	npcData['Glühende Staubechse'] = [180, 30000];
	npcData['Glühnebel'] = [2, 32];
	npcData['Glühwürmchen'] = [1, 2];
	npcData['Goldballenwurm'] = [30, 40];
	npcData['Goldbaronesse'] = [71, 10000];
	npcData['Goldene Giftschlange'] = [821, 295];
	npcData['Goldener Flutentaucher'] = [924, 777777];
	npcData['Goldener Undaronwächter'] = [104, 11428];
	npcData['Goldenes Tor'] = [0, 30];
	npcData['Goldfadenwurm'] = [5, 18];
	npcData['Goldflossenfisch'] = [2, 17];
	npcData['Goldhornziege'] = [3, 1];
	npcData['Goldkiste'] = [0, 1000];
	npcData['Goldkrake'] = [10, 8000];
	npcData['Goldkrebs'] = [2, 12];
	npcData['Goldkuh'] = [4, 30];
	npcData['Goldwurm'] = [6, 40];
	npcData['Goldwächter'] = [14, 300];
	npcData['Gorilla'] = [14, 190];
	npcData['Grabfliege'] = [2, 7];
	npcData['Grabgeist der vermissten Toten'] = [9, 140];
	npcData['Grabräuber'] = [8, 120];
	npcData['Grabschlecker'] = [4, 50];
	npcData['Grabwurm'] = [3, 18];
	npcData['Grafrather Stechmückenschwarm'] = [1, 1];
	npcData['Grasblatt-Schlange'] = [6, 55];
	npcData['Graspferd'] = [3, 18];
	npcData['Grasstein'] = [4, 22];
	npcData['Graswiesenschlange'] = [2, 17];
	npcData['Gratrat-Alien'] = [20, 800];
	npcData['Graubartechse'] = [1, 6];
	npcData['Graugoldfalter'] = [4, 18];
	npcData['Graustein-Bär'] = [10, 4800];
	npcData['Grefekfisch'] = [3, 15];
	npcData['Grottenschlange'] = [271, 32000];
	npcData['Große Goldader'] = [0, 1];
	npcData['Großer Blattalisk'] = [10, 10000];
	npcData['Großer Bohnenschnapper'] = [3, 18];
	npcData['Großer Erdkäfer'] = [2, 20];
	npcData['Großer Laubbär'] = [24, 2600];
	npcData['Großer Lava-Käfer'] = [8, 120];
	npcData['Großer Nebelkreischer'] = [25, 400000];
	npcData['Großer Phasenvogel'] = [955, 380000];
	npcData['Großer Prärieskorpion'] = [19, 1000];
	npcData['Großer Raubvogel'] = [65, 20480];
	npcData['Großer Schatten der Dunkelheit'] = [630, 85000];
	npcData['Großer Wurzelwurm'] = [10, 150];
	npcData['Großes Aschen-Skelett'] = [1391, 8746251];
	npcData['Großes Eistentakel'] = [20, 20000];
	npcData['Grubensingvogel'] = [8, 700];
	npcData['Grunulum'] = [5, 40];
	npcData['Grünbaum-Affe'] = [70, 4000];
	npcData['Gründorn-Gurkenwurm'] = [31, 290];
	npcData['Grüne Baumschlange'] = [23, 202];
	npcData['Grüne Rotorlibelle'] = [26, 50000];
	npcData['Grünes Schleimwesen'] = [7, 64];
	npcData['Grünes Stachel-Kowu'] = [41, 5000];
	npcData['Grünschimmer-Ameise'] = [18, 260];
	npcData['Gurdz-Beerenstrauch'] = [3, 28];
	npcData['Gämse'] = [8, 75];
	npcData['Hakka der Brutale'] = [64, 3500];
	npcData['Hakkas Beil'] = [0, 0];
	npcData['Halbverarbeiteter Taruner'] = [100, 10000];
	npcData['Hand des Feuers'] = [100, 10000];
	npcData['Hangstelzer'] = [46, 6500];
	npcData['Harmloser Giftsporenpilz'] = [3, 24];
	npcData['Hase'] = [1, 2];
	npcData['Heilender Baum (NPC)'] = [8, 90];
	npcData['Heilender Tropfen'] = [0, 0];
	npcData['Helmfamitsu'] = [16, 140];
	npcData['Herrscher der eisigen Dämonen'] = [64, 25000];
	npcData['Herz der Magie'] = [0, 1000000];
	npcData['Herz des Blutwaldes'] = [33, 400000];
	npcData['Hinterlistiger Stororaptor'] = [1630, 551000];
	npcData['Hinterlistiger Stororaptor'] = [710, 105000];
	npcData['Holz-Maus'] = [1, 7];
	npcData['Holzbeißer'] = [1000, 100000];
	npcData['Holzplatten-Schildkröte'] = [4, 45];
	npcData['Hornkäfer'] = [3, 32];
	npcData['Hornrücken'] = [0, 10];
	npcData['Hulnodar-Heiler'] = [7, 80];
	npcData['Hulnodar-Kiste'] = [0, 1000];
	npcData['Hulnodar-Wächter'] = [12, 250];
	npcData['Hundertfüßiger Dilinug'] = [1, 2];
	npcData['Hyperaktiver Waldhüpfer'] = [3100, 480000];
	npcData['Hyäne'] = [2, 13];
	npcData['Höhlenbär'] = [12, 170];
	npcData['Höhlenmensch'] = [5, 35];
	npcData['Insel-Schnapper'] = [2, 40];
	npcData['Itolos-Schrecke'] = [5, 30];
	npcData['Jerodar-Anführer'] = [20, 150000];
	npcData['Jerodar-Dieb'] = [3, 15];
	npcData['Jerodar-Erdwühler'] = [2, 15];
	npcData['Jerodar-Kiste'] = [0, 1000];
	npcData['Jerodar-Lehrling'] = [1, 15];
	npcData['Junger Abgesandter'] = [5, 40];
	npcData['Junger Giftgrabl'] = [9, 100];
	npcData['Junger Graustein-Bär'] = [1, 100];
	npcData['Junger Schatten der Dunkelheit'] = [3, 25];
	npcData['Junger Stororaptor'] = [25, 330];
	npcData['Junger Strativar'] = [10, 150];
	npcData['Kaklatron'] = [2, 7];
	npcData['Kamel'] = [11, 125];
	npcData['Kampflibelle (NPC)'] = [1545, 290];
	npcData['Kanal-Krake'] = [3, 10];
	npcData['Kanalqualle'] = [50, 10000];
	npcData['Karakal'] = [14, 160];
	npcData['Kastanienträne'] = [0, 0];
	npcData['Kellerassel'] = [7, 777];
	npcData['Kellerkiste'] = [0, 1000];
	npcData['Kiste der Festung'] = [0, 1000];
	npcData['Kiste des Auftragshauses'] = [0, 100];
	npcData['Kiste des Seemanns'] = [0, 1000];
	npcData['Klapperschlange'] = [3, 8];
	npcData['Klauenbartrein'] = [22, 2000];
	npcData['Klauenratte'] = [1, 7];
	npcData['Kleine Blutratte'] = [2, 4];
	npcData['Kleine Blutweide'] = [256, 65536];
	npcData['Kleine Farbanomalie'] = [3, 25];
	npcData['Kleine Goldader'] = [0, 1];
	npcData['Kleine Grottenschlange'] = [9, 120];
	npcData['Kleine Luftschnecke'] = [1, 6];
	npcData['Kleine Spinne'] = [2, 25];
	npcData['Kleine Stachelmade'] = [1, 1];
	npcData['Kleiner Feuerfuchs'] = [21, 321];
	npcData['Kleiner Hüpfstein'] = [1, 8];
	npcData['Kleiner Laubbär'] = [3, 20];
	npcData['Kleiner Nebelkreischer'] = [6, 60];
	npcData['Kleiner Phasenbär'] = [2, 25];
	npcData['Kleiner Schattenskorpion'] = [70, 600];
	npcData['Kleiner Spindelschreiter'] = [1, 12];
	npcData['Kleiner Steingolem'] = [6, 160];
	npcData['Kleiner Vipara'] = [8, 100];
	npcData['Kleiner Waldschlurch'] = [2, 15];
	npcData['Kleines Haus-Schaf'] = [1, 5];
	npcData['Kleines Reen'] = [1, 10];
	npcData['Kleines Schaf'] = [1, 5];
	npcData['Kleines Schlangentier'] = [1, 8];
	npcData['Klippenspringer'] = [1640, 173804];
	npcData['Knochenpilz'] = [0, 5];
	npcData['Knochensammler'] = [5, 55];
	npcData['Knorpel-Monster aus Draht (NPC)'] = [10, 3000];
	npcData['Knorrige Wurzel'] = [40, 1600];
	npcData['Knunglo'] = [10, 120];
	npcData['Knurrender Goldballenwurm'] = [560, 15000];
	npcData['Kollektiver Salzhügel'] = [25, 5000];
	npcData['Koloa-Käfer'] = [1, 2];
	npcData['Komische Nachbarin der Gärtnerin'] = [0, 10000];
	npcData['Kopolaspinne'] = [16, 1000];
	npcData['Kraftvoller Sporenträger'] = [710, 98000];
	npcData['Kranke Grottenschlange'] = [271, 2000];
	npcData['Kranke Milchkuh'] = [1, 3];
	npcData['Kranker Schmetterling'] = [1791, 50000];
	npcData['Kranker Todesläufer'] = [3, 30];
	npcData['Kranker Wüstensalamander'] = [1, 12];
	npcData['Kreidehirsch'] = [1222, 210000];
	npcData['Kreidekrokodil'] = [183, 18381];
	npcData['Kreidekäfer'] = [130, 4500];
	npcData['Kreidevogel'] = [20, 289];
	npcData['Kreidewurm'] = [5, 25];
	npcData['Kreisende Wippschwanzmöwe'] = [28, 3650];
	npcData['Kriechkäfer'] = [1, 6];
	npcData['Kriechlapf'] = [4, 12];
	npcData['Kriechspinne'] = [1, 5];
	npcData['Kristall-Orwane'] = [7, 80];
	npcData['Kristallfisch'] = [3, 6];
	npcData['Kristallwasserpflanze'] = [20, 2000];
	npcData['Krumme Grünschimmer-Ameise'] = [10, 100];
	npcData['Krustenkäfer'] = [3, 12];
	npcData['Kräftiger Graustein-Bär'] = [100, 12800];
	npcData['Kurnotan - der dunkle Magier'] = [14, 500];
	npcData['Kutsche des Auftragshauses'] = [0, 50];
	npcData['Königlicher Schmetterling'] = [37, 8000];
	npcData['Königsblume'] = [11425, 611862304];
	npcData['Königskäfer'] = [23, 100000];
	npcData['Lablabkaktus'] = [2, 25];
	npcData['Langfaden-Spinne'] = [2, 25];
	npcData['Langzahnaffe'] = [4, 12];
	npcData['Larafstrauch'] = [3, 10];
	npcData['Larpan'] = [38, 80000];
	npcData['Larvennest'] = [2, 8];
	npcData['Lastenmuli'] = [3, 15];
	npcData['Laubwiesenschlange'] = [2, 17];
	npcData['Lava-Echse'] = [2, 20];
	npcData['Lava-Käfer'] = [4, 20];
	npcData['Lava-Wurm'] = [2, 20];
	npcData['Lava-Wurm'] = [3, 20];
	npcData['Lawinengeist'] = [14, 250];
	npcData['Lebende Bergspitze'] = [13, 2500];
	npcData['Lebende Mauer'] = [150, 535];
	npcData['Lebende Ruine'] = [15, 300];
	npcData['Lebende Salzstatue'] = [84, 5300];
	npcData['Lebende Statue'] = [10, 240];
	npcData['Lebende Straße'] = [6058, 546360000];
	npcData['Lebende Waldwurzel'] = [80, 4000];
	npcData['Lebender Ast'] = [3, 30];
	npcData['Lebender Salzhügel'] = [2, 15];
	npcData['Lebender Steingipfel'] = [4759, 875346];
	npcData['Lebender Tropfstein'] = [37, 17000];
	npcData['Lebendes Haus'] = [500, 800000];
	npcData['Lebendige Torpon-Schlange'] = [5000, 25000];
	npcData['Lebendiger Schatten'] = [0, 0];
	npcData['Lehrlingskiste'] = [0, 1000];
	npcData['Lembrak-Kultur'] = [5, 31];
	npcData['Lernfähiger Spindelschreiter'] = [21, 12138];
	npcData['Leuchtende Dunkelsee-Qualle'] = [890, 160000];
	npcData['Lianenechse'] = [3, 10];
	npcData['Lichtpflanze'] = [9, 90];
	npcData['Lichtwurm'] = [3, 30];
	npcData['Lola - Die Hauskawutze'] = [2, 10];
	npcData['Loroktom, der große Steingolem'] = [22, 3000];
	npcData['Luchs'] = [1, 1];
	npcData['Luftpferdchen'] = [24605, 1];
	npcData['Luftschloss'] = [1200, 5000000];
	npcData['Magier der dunklen Macht'] = [8, 8000];
	npcData['Magier des Schutzes'] = [3, 13];
	npcData['Magische Farbanomalie'] = [47, 7000];
	npcData['Mankei'] = [4, 35];
	npcData['Manticore'] = [5, 30];
	npcData['Massive Landqualle'] = [52, 8000];
	npcData['Massive Steinplatte'] = [0, 15000000];
	npcData['Masu-Lachs'] = [13, 110];
	npcData['Mechanische Spinne'] = [4212, 88200000];
	npcData['Mechanischer Giftvogel'] = [1, 1];
	npcData['Meeresbürger'] = [34, 5780];
	npcData['Mereller-Keim'] = [17, 290];
	npcData['Metallischer Morschgreifer'] = [240, 99];
	npcData['Milchkuh'] = [1, 3];
	npcData['Minengolem'] = [16, 1300];
	npcData['Mittlere Goldader'] = [0, 1];
	npcData['Moorgeist'] = [7, 70];
	npcData['Moosgeflecht'] = [2, 25];
	npcData['Mooskäfer'] = [2, 18];
	npcData['Moosnashorn'] = [5, 80];
	npcData['Moosschildkröte'] = [241, 33817];
	npcData['Moosskarabäus'] = [12, 190];
	npcData['Moosspinne'] = [2, 25];
	npcData['Mopfchen'] = [0, 1];
	npcData['Mormdat'] = [3, 10];
	npcData['Morschgreifer'] = [8, 80];
	npcData['Morschwaldaffe'] = [2, 30];
	npcData['Murmelndes Mormdat'] = [3, 10];
	npcData['Mutierte Koralle'] = [7, 222];
	npcData['Mutierte Wolkenblume'] = [1, 6];
	npcData['Mutierter Koloa-Käfer'] = [15, 1000];
	npcData['Mutierter Morschgreifer'] = [300, 800];
	npcData['Mutiges Mormdat'] = [3, 10];
	npcData['Mutter der Geysir-Schlucker'] = [35, 5000];
	npcData['Mächtige Phasenbarriere'] = [0, 90];
	npcData['Mächtiger Propellerstein'] = [300, 500000];
	npcData['Nachtfledermaus'] = [10, 120];
	npcData['Nachtgonk'] = [7, 80];
	npcData['Nachtgonk (Quest)'] = [7, 80];
	npcData['Nachtgonk im dunklen Haus'] = [7, 40];
	npcData['Nachtschattenraupe'] = [3, 10];
	npcData['Narbiger Schneewurm'] = [2, 35];
	npcData['Naurofbusch'] = [1, 3];
	npcData['Nebelalpaka'] = [14, 853];
	npcData['Nebelbaum'] = [602, 1888320];
	npcData['Nebelbesen'] = [3, 15];
	npcData['Nebelblume'] = [1, 1];
	npcData['Nebeldampfgeist'] = [1381, 839084];
	npcData['Nebelgeist Argarie'] = [124, 20000];
	npcData['Nebelgeist Bargu'] = [15, 400];
	npcData['Nebelgeist Frorie'] = [30, 5000];
	npcData['Nebelgeist Girie'] = [9, 300];
	npcData['Nebelgeist Murahn'] = [5, 30];
	npcData['Nebelgeist Napirie'] = [30, 500];
	npcData['Nebelgeist Nukarie'] = [52, 500000];
	npcData['Nebelgeist Sorlie'] = [21, 600];
	npcData['Nebelgeist Viginur'] = [50, 6000];
	npcData['Nebelgeist Wrozie'] = [40, 800];
	npcData['Nebelhase'] = [1, 15];
	npcData['Nebelhüpfer'] = [3, 15];
	npcData['Nebelkoloss'] = [9573, 248008341];
	npcData['Nebelkoralle'] = [336, 1054401];
	npcData['Nebelkrebs'] = [14, 150];
	npcData['Nebelkreischer'] = [18, 250];
	npcData['Nebelkrokodil'] = [112, 38239];
	npcData['Nebelkrähe'] = [3, 20];
	npcData['Nebelkröte'] = [1, 2];
	npcData['Nebelmagierin'] = [0, 0];
	npcData['Nebelmöwe'] = [21, 2380];
	npcData['Nebelmöwenschwarm'] = [3811, 79452201];
	npcData['Nebelprinzessin'] = [22222, 1000000];
	npcData['Nebelschleimer'] = [20, 500];
	npcData['Nebelschnecke'] = [3, 15];
	npcData['Nebelschwinge'] = [1333, 275];
	npcData['Nebelsoldat'] = [4937, 148998362];
	npcData['Nebelspinne'] = [218, 208362];
	npcData['Nebelsteinmolch'] = [4, 140];
	npcData['Nebelwal'] = [1175, 1000000];
	npcData['Nebelwelle'] = [443, 948576];
	npcData['Nebelwesen'] = [6, 100];
	npcData['Nebelwiesel'] = [1, 2];
	npcData['Nebelwolf'] = [120, 5000];
	npcData['Nebelwächter'] = [1111, 275];
	npcData['Nebelzofe'] = [50, 191616];
	npcData['Nebelzwerg'] = [32, 2364];
	npcData['Nebliger Nebelkreischer'] = [18, 250];
	npcData['Nomade'] = [5, 50];
	npcData['Norpi'] = [5, 60];
	npcData['Onlo-Skelett'] = [18, 300];
	npcData['Ontolon'] = [34, 540];
	npcData['Onuk Kulo'] = [127, 10101];
	npcData['Orang-Utan'] = [14, 190];
	npcData['Organist'] = [6, 241];
	npcData['Pantherfisch'] = [83, 808];
	npcData['Panzerrochen'] = [94, 18000];
	npcData['Papagei'] = [29, 5000];
	npcData['Papierbeispiel-NPC (NPC)'] = [0, 1];
	npcData['Parfugurn'] = [400, 15000];
	npcData['Peitschende Blutliane'] = [72, 14000];
	npcData['Pfefug-Aal'] = [16, 110];
	npcData['Pfeilfisch'] = [96, 48020];
	npcData['Pfeilschnecke'] = [15, 150];
	npcData['Phasenanomalie'] = [45, 2000];
	npcData['Phasenassel'] = [2, 45];
	npcData['Phasenbarriere'] = [0, 30];
	npcData['Phasenenergiefalle (NPC)'] = [0, 100];
	npcData['Phasenente'] = [1, 12];
	npcData['Phasenfalter'] = [135, 45000];
	npcData['Phasenfossil'] = [8500, 1440004];
	npcData['Phasenfuchs'] = [7, 61];
	npcData['Phasengarnele'] = [30, 1011];
	npcData['Phasengeier'] = [9, 90];
	npcData['Phasengreifer'] = [548, 3500];
	npcData['Phasenhummer'] = [710, 260000];
	npcData['Phasenkiste'] = [0, 1000];
	npcData['Phasenkrake'] = [370, 39000];
	npcData['Phasenkrebs'] = [3, 25];
	npcData['Phasenkrokodil'] = [14, 160];
	npcData['Phasenkuh'] = [2, 15];
	npcData['Phasenlibelle'] = [4, 41];
	npcData['Phasenlurch'] = [3, 27];
	npcData['Phasenmade'] = [5, 35];
	npcData['Phasenmücke'] = [1, 18];
	npcData['Phasenportal'] = [0, 1000];
	npcData['Phasenqualle'] = [5850, 950000];
	npcData['Phasenratte'] = [1, 10];
	npcData['Phasenraupe'] = [24, 350];
	npcData['Phasenrochen'] = [95, 30000];
	npcData['Phasensalamander'] = [3, 26];
	npcData['Phasenschabe'] = [6, 18];
	npcData['Phasenschaf'] = [2, 12];
	npcData['Phasenschildkröte'] = [1450, 540000];
	npcData['Phasenschlamm'] = [1, 20];
	npcData['Phasenschlange'] = [8, 80];
	npcData['Phasenschleim'] = [4, 36];
	npcData['Phasenschlurch'] = [19, 1127];
	npcData['Phasenschnecke'] = [6, 55];
	npcData['Phasenseestern'] = [250, 85000];
	npcData['Phasenskelkos'] = [75, 10000];
	npcData['Phasenskorpion'] = [231, 23000];
	npcData['Phasenspinne'] = [25, 320];
	npcData['Phasenstier'] = [189, 26661];
	npcData['Phasentiger'] = [59, 5300];
	npcData['Phasenverbrenner'] = [110, 15000];
	npcData['Phasenvogel'] = [2, 13];
	npcData['Phasenwachtel'] = [3, 39];
	npcData['Phasenwiesel'] = [1, 8];
	npcData['Phasenwolf'] = [23, 630];
	npcData['Phasenwurm'] = [3, 30];
	npcData['Pilzwachtel'] = [1, 3];
	npcData['Pinguin'] = [66, 24558];
	npcData['Pironer'] = [35, 10000];
	npcData['Plätscherfluss-Krokodil'] = [586, 112000];
	npcData['Polarisations-Otter'] = [20, 300];
	npcData['Portal (NPC)'] = [0, 100];
	npcData['Portal des Feuers'] = [0, 10];
	npcData['Portal des Wassers'] = [0, 10];
	npcData['Portal in die Unterwelt'] = [0, 100];
	npcData['Portalstab (NPC)'] = [0, 100];
	npcData['Portalstab-Anbeter'] = [20, 250];
	npcData['Propellerstein'] = [7, 90];
	npcData['Puma'] = [27, 432];
	npcData['Quellhuhn'] = [2, 4];
	npcData['Quellschleim'] = [0, 25];
	npcData['Randalierer'] = [8, 80];
	npcData['Rebendos'] = [71, 10000];
	npcData['Reen'] = [6, 50];
	npcData['Reicher Wüstensalamander'] = [3, 12];
	npcData['Reisender Fallensteller'] = [8, 90];
	npcData['Resistenter Schatten'] = [600, 244];
	npcData['Resistenter Stachelschuss-Igel'] = [570, 269];
	npcData['Riesenfalter-Kokon'] = [1, 5];
	npcData['Riesenhornisse'] = [9, 100];
	npcData['Riesenkrake'] = [62, 15];
	npcData['Riesenlibelle'] = [2, 10];
	npcData['Riesige Gift-Dschungelschlange'] = [7, 100];
	npcData['Riesige Landmuschel'] = [43, 9000];
	npcData['Riesige Schattenfledermaus'] = [14, 400];
	npcData['Riesiger Salamander'] = [17, 220];
	npcData['Riesiger Salamander'] = [3, 40];
	npcData['Riesiger Salamander'] = [9, 80];
	npcData['Riesiger Salamander'] = [11, 123];
	npcData['Riesiger Salamander'] = [12, 140];
	npcData['Riesiger Wolf'] = [1250, 300];
	npcData['Rindenhagel'] = [160, 25600];
	npcData['Rindenwalze'] = [0, 0];
	npcData['Ringelkatze'] = [19, 168];
	npcData['Ringraupe'] = [3, 10];
	npcData['Robuster Morschgreifer'] = [220, 104];
	npcData['Robuster Spindelschreiter'] = [176, 0];
	npcData['Rotbandwurm'] = [50, 2000];
	npcData['Rote Landkoralle'] = [10, 100];
	npcData['Rote Riesenlibelle'] = [1, 15];
	npcData['Rote Steinspinne'] = [3, 10];
	npcData['Roteiskoralle'] = [16, 12000];
	npcData['Roter Baumkuschler'] = [5, 70];
	npcData['Roter Felswurm'] = [2, 30];
	npcData['Roter Fisch'] = [282, 397620];
	npcData['Roter Flughund'] = [152, 14789];
	npcData['Roter Sandhund'] = [10, 160];
	npcData['Rotfell-Reh'] = [186, 32000];
	npcData['Rotfell-Rehkitz'] = [5, 35];
	npcData['Rotpunkt-Tiger'] = [8, 200];
	npcData['Rotschimmer-Ameise'] = [5300, 890000];
	npcData['Rotschimmer-Ameise'] = [1600, 280000];
	npcData['Rotschimmer-Ameise'] = [4200, 650000];
	npcData['Rotzahnhai'] = [6, 70];
	npcData['Rubinkoralle'] = [25, 10000];
	npcData['Rubinroter Waldgeist'] = [3129, 1895760];
	npcData['Ruinen-Wurm'] = [1, 6];
	npcData['Ruinenschleicher'] = [5, 30];
	npcData['Runenwurm'] = [0, 0];
	npcData['Röhrenkrebs'] = [6, 90];
	npcData['Saftende Itolos-Schrecke'] = [11, 111];
	npcData['Salz-Maus'] = [1, 7];
	npcData['Salzfleckensalamander'] = [41, 3700];
	npcData['Salzpicker-Vogel'] = [3, 20];
	npcData['Salzsüchtiger Staubschleifer'] = [5, 35];
	npcData['Salzwasservogel'] = [3, 20];
	npcData['Sandalin'] = [6, 40];
	npcData['Sandechse'] = [2, 7];
	npcData['Sandfresserwurm'] = [6, 70];
	npcData['Sandgeist'] = [4, 20];
	npcData['Sandgolem'] = [1, 26];
	npcData['Sandiger Wirbelwind'] = [800, 7000];
	npcData['Sandvogel'] = [8, 80];
	npcData['Saugfisch'] = [2, 16];
	npcData['Savannen-Vogel'] = [2, 12];
	npcData['Schachtelmesserfarn'] = [37, 700];
	npcData['Schaf'] = [2, 10];
	npcData['Schatten der Dunkelheit'] = [14, 180];
	npcData['Schatten des Weltenwandlers'] = [10, 121];
	npcData['Schatten-Ei'] = [67, 8000];
	npcData['Schattengeist'] = [1, 1];
	npcData['Schattenkreatur Gortari'] = [85, 30000];
	npcData['Schattenkreatur Jalakori'] = [55, 30000];
	npcData['Schattenkreatur Loxutizori'] = [10080, 66666];
	npcData['Schattenkreatur Mantori'] = [30, 20000];
	npcData['Schattenkreatur Noxomiwori'] = [4630, 40000];
	npcData['Schattenkreatur Surujanuri'] = [7310, 50000];
	npcData['Schattenkreatur Turwakori'] = [350, 30000];
	npcData['Schattenkreatur XY (Gruppen-NPC)'] = [1, 1];
	npcData['Schattenkreatur XY (NPC)'] = [1, 1];
	npcData['Schattenkreatur XY (Unique-NPC)'] = [1, 1];
	npcData['Schattenkrokodil'] = [21, 3000];
	npcData['Schattenmoos'] = [3, 60];
	npcData['Schattensalamander'] = [35, 3200];
	npcData['Schattenskorpion'] = [800, 6000];
	npcData['Schattenwesen'] = [2, 10];
	npcData['Schattenwiesel'] = [1, 2];
	npcData['Schattenwolf'] = [7, 20];
	npcData['Schatzsucher (Unique-NPC)'] = [20, 2000];
	npcData['Schaufelmaulwurf'] = [15, 150];
	npcData['Schillernder Küstling'] = [5, 62];
	npcData['Schimmerente'] = [1, 1];
	npcData['Schimmerstein'] = [0, 3];
	npcData['Schlammkaktus'] = [33, 800];
	npcData['Schleimgreifer'] = [0, 0];
	npcData['Schleimraupe'] = [12, 180];
	npcData['Schleuderfalle (NPC)'] = [0, 100];
	npcData['Schlingende Lianenpeitsche'] = [26, 5000];
	npcData['Schlurum'] = [15, 250];
	npcData['Schläfriger Hornrücken'] = [0, 1000];
	npcData['Schmatzende Blattspinne'] = [2, 25];
	npcData['Schmerzfalle (NPC)'] = [0, 100];
	npcData['Schmerzstein'] = [1, 19];
	npcData['Schmetterlingsfisch'] = [18, 1980];
	npcData['Schmieriger Geschäftemacher'] = [15, 350];
	npcData['Schneefisch'] = [1, 7];
	npcData['Schneehase'] = [2, 8];
	npcData['Schneehuhn'] = [1, 2];
	npcData['Schneekäfer'] = [2, 8];
	npcData['Schneekäfer-Kokon'] = [1, 8];
	npcData['Schneekäfer-Raupe'] = [2, 8];
	npcData['Schneelangohrhase'] = [2, 8];
	npcData['Schneesturmgeist'] = [127, 16000];
	npcData['Schneewiesel'] = [1, 2];
	npcData['Schneeworan'] = [8, 200];
	npcData['Schneewurm'] = [2, 35];
	npcData['Schnelle Bernstein-Raupe'] = [90, 49];
	npcData['Schneller Stachelsprungkrebs'] = [1674, 3132800];
	npcData['Schneller Steinmolch'] = [10, 120];
	npcData['Schneller Stororaptor'] = [240, 124];
	npcData['Schneller Tempelkrabbler'] = [1, 50];
	npcData['Schnelles Tonar-Reptil'] = [160, 84];
	npcData['Schnellflatter-Schmetterling'] = [280, 0];
	npcData['Schotterraupe'] = [5, 40];
	npcData['Schotterwurm'] = [0, 10];
	npcData['Schwacher Sporenträger'] = [3, 10];
	npcData['Schwacher Unterwelt-Dämon'] = [17, 280];
	npcData['Schwacher Unterwelt-Dämon'] = [8, 200];
	npcData['Schwacher Unterwelt-Dämon'] = [13, 240];
	npcData['Schwacher Unterwelt-Dämon'] = [14, 260];
	npcData['Schwaches Stachelkrokodil'] = [12, 121];
	npcData['Schwangeres Schneehuhn'] = [1, 2];
	npcData['Schwarm-Kriegerin'] = [0, 0];
	npcData['Schwarm-Königin'] = [1927, 92410];
	npcData['Schwarze Keitel-Spinne'] = [4, 18];
	npcData['Schwarze Netzspinne'] = [52, 485];
	npcData['Schwarzeisenbarrikade'] = [0, 20];
	npcData['Schwarzwespen'] = [5, 40];
	npcData['Schwebehörnchen'] = [18, 149];
	npcData['Schwebende Goldkutsche'] = [7, 5000];
	npcData['Schwimmendes Tentakel'] = [6, 40];
	npcData['Schwächefalle (NPC)'] = [0, 100];
	npcData['Seelendieb'] = [71, 10000];
	npcData['Seeschlamm'] = [9, 100];
	npcData['Seetang-Ölfisch'] = [120, 7190];
	npcData['Seetangfisch'] = [1, 5];
	npcData['Seetangmagier'] = [3230, 51232001];
	npcData['Seeungeheuer'] = [123456, 2000000000];
	npcData['Seichtwasserkrokodil'] = [94, 52088];
	npcData['Seichtwasserpilz'] = [2, 70];
	npcData['Seltsamer Pinguin'] = [11, 1111];
	npcData['Seltsames Tier'] = [1, 2];
	npcData['Septafron'] = [380, 4000];
	npcData['Serbanthi'] = [9, 90];
	npcData['Seuchenflügler'] = [2, 4];
	npcData['Siedestein-Dampfgeist'] = [80, 8000];
	npcData['Siedestein-Morschgreifer'] = [30, 30000];
	npcData['Siedesteinkäfer'] = [5, 40];
	npcData['Silberfluss-Bär'] = [8, 300];
	npcData['Silberfuchs'] = [2, 8];
	npcData['Silbergras-Spinne'] = [1, 10];
	npcData['Silberstein-Salamander'] = [1, 12];
	npcData['Silberwurmhaufen'] = [2, 25];
	npcData['Silfin'] = [6, 320];
	npcData['Singender Bettler'] = [15, 578];
	npcData['Siramücken-Schwarm'] = [50, 12000];
	npcData['Sitzstein'] = [1, 9];
	npcData['Slofoyfisch'] = [13, 265];
	npcData['Sohn des Wiesengeistes'] = [16, 800];
	npcData['Solarda-Fisch'] = [3, 20];
	npcData['Spezialist für Erze'] = [5, 100];
	npcData['Spindelschreiter'] = [13, 1500];
	npcData['Spindelschreiter-Überwacher'] = [93, 10000];
	npcData['Spinne der Staubnetze'] = [80, 5000];
	npcData['Sporenträger'] = [4, 40];
	npcData['Sporling'] = [1, 5];
	npcData['Sprechende Schatztruhe'] = [1, 0];
	npcData['Sprengpockenspinne'] = [1, 100];
	npcData['Springkäfer'] = [1, 9];
	npcData['Sprungechse'] = [2, 7];
	npcData['Spröder Ast'] = [3, 9];
	npcData['Stabfisch'] = [1, 7];
	npcData['Stabkrebs'] = [3, 18];
	npcData['Stabschrecke'] = [8, 70];
	npcData['Stachelblutdickicht'] = [81, 6561];
	npcData['Stachelfisch'] = [3, 20];
	npcData['Stachelkrokodil'] = [510, 71000];
	npcData['Stachelkäfer'] = [2, 25];
	npcData['Stachelschildkröte'] = [590, 79000];
	npcData['Stachelschreck'] = [7, 80];
	npcData['Stachelsprungkrebs'] = [80, 3000];
	npcData['Stadtmauersegler'] = [49, 14844];
	npcData['Stadtwache von Konlir'] = [0, 30];
	npcData['Starrfalle (NPC)'] = [0, 100];
	npcData['Staub-Maus'] = [1, 7];
	npcData['Staub-Skelett'] = [5, 50];
	npcData['Staubassel'] = [2, 25];
	npcData['Staubflatterer'] = [1, 10];
	npcData['Staubgeist'] = [16, 800];
	npcData['Staubige Pilzwachtel'] = [1, 3];
	npcData['Staubkrieger'] = [33, 200000];
	npcData['Staubschleifer'] = [5, 35];
	npcData['Staubschleifer-Königin'] = [29, 12000];
	npcData['Stechmücken'] = [2, 15];
	npcData['Stegovar'] = [2, 17];
	npcData['Stein-Gamasche'] = [9, 87];
	npcData['Stein-Koloss'] = [35, 50000];
	npcData['Stein-Skelkos'] = [8, 120];
	npcData['Stein-Tentakel'] = [6, 40];
	npcData['Steinbär'] = [2390, 30730120];
	npcData['Steingolem'] = [12, 320];
	npcData['Steinhuhn'] = [2, 30];
	npcData['Steinkatze'] = [1, 3];
	npcData['Steinkraller'] = [369, 18400];
	npcData['Steinkratzkäfer'] = [2, 25];
	npcData['Steinkäfer'] = [2, 20];
	npcData['Steinmolch'] = [4, 40];
	npcData['Steinpicker-Vogel'] = [3, 20];
	npcData['Steinschalenkäfer'] = [14, 1200];
	npcData['Steinschlange'] = [1, 12];
	npcData['Steinschutt'] = [0, 20];
	npcData['Steinspinne'] = [3, 10];
	npcData['Steinturm'] = [1, 8];
	npcData['Steppenwolf'] = [4, 10];
	npcData['Stepto-Waran'] = [190, 152];
	npcData['Sterbender Brotandro-Virus'] = [6, 23];
	npcData['Sterbender Mereller-Keim'] = [7, 18];
	npcData['Sterbendes Gerftar-Bakterium'] = [3, 10];
	npcData['Sterbliche Waldratte'] = [1, 7];
	npcData['Sternenzerstörer'] = [100, 60000];
	npcData['Stielaugenforsch'] = [7, 58];
	npcData['Stolperfalle (NPC)'] = [0, 100];
	npcData['Stororaptor'] = [480, 68000];
	npcData['Strandlokil'] = [8, 90];
	npcData['Strauchkäfer'] = [2, 8];
	npcData['Störrischer Stororaptor'] = [165, 25000];
	npcData['Sula-Echse'] = [30, 30000];
	npcData['Sumpflandkröte'] = [2, 15];
	npcData['Sumpfschrecke'] = [12, 170];
	npcData['Sumpfspinne'] = [3, 20];
	npcData['Südmeer-Tucan'] = [1, 2];
	npcData['Tapir'] = [12, 101];
	npcData['Taucher'] = [115, 6938];
	npcData['Teidam'] = [5, 50];
	npcData['Teidam-Baby'] = [3, 45];
	npcData['Tempelhüpfer'] = [3, 25];
	npcData['Tempelhüter'] = [25, 4000];
	npcData['Tempelkrabbler'] = [2, 18];
	npcData['Tempelschatz'] = [0, 1000];
	npcData['Tempelwächter'] = [35, 12000];
	npcData['Temporaler Falter'] = [8, 35];
	npcData['Tentakel'] = [6, 40];
	npcData['Tentakel aus Gold'] = [6, 40];
	npcData['Tentakel-Skelkos'] = [0, 400];
	npcData['Tentakelbesetzter Phasenriss'] = [1000, 25000];
	npcData['Thorom Logrid'] = [7, 50];
	npcData['Tiefsee-Aal'] = [8, 90];
	npcData['Tilua-Pflanze'] = [36, 200000];
	npcData['Todesflossen-Fisch'] = [150, 500000];
	npcData['Todesgrotten-Molch'] = [15, 500];
	npcData['Todesmoor-Krokodil'] = [8, 90];
	npcData['Tolloschein-Fresser'] = [2, 25];
	npcData['Tollwütiger Graustein-Bär'] = [1, 25000];
	npcData['Tonar-Reptil'] = [800, 130000];
	npcData['Torpon-Schlange'] = [60000, 8000000];
	npcData['Tote Bergspitze'] = [53, 10200];
	npcData['Tote Kuh'] = [3, 1];
	npcData['Totes Wawruz'] = [2, 10];
	npcData['Transparenter Schatten'] = [560, 239];
	npcData['Triefender Wandschleim'] = [5, 40];
	npcData['Trockenwurm'] = [3, 10];
	npcData['Tropfsteinwandler'] = [15, 150];
	npcData['Tropfsteinwurm'] = [3, 20];
	npcData['Turmgeist'] = [20, 0];
	npcData['Turmwart'] = [0, 20];
	npcData['Tänzerin von Beispieluser'] = [4, 40];
	npcData['Uhnar-Bazillus'] = [480, 2455];
	npcData['Umnebeltes Schlangentier'] = [1, 8];
	npcData['Unbekannter Affe'] = [8, 80];
	npcData['Unsterbliche Waldratte'] = [1, 7];
	npcData['Untertage-Salamander'] = [9, 800];
	npcData['Unterwelt-Dämon'] = [430, 55000];
	npcData['Unterwelt-Dämon'] = [45, 3000];
	npcData['Unterwelt-Dämon'] = [90, 12000];
	npcData['Unterwelt-Dämon'] = [170, 28000];
	npcData['Unterwelt-Dämon'] = [240, 31000];
	npcData['Untote Schildkröte'] = [1, 1];
	npcData['Untoter Bürger'] = [13, 200];
	npcData['Untoter Bürgermeister'] = [135, 21000];
	npcData['Untoter Grubensingvogel'] = [8, 700];
	npcData['Untoter Höllenhund'] = [29, 1600];
	npcData['Untoter Kaklatron'] = [32, 20];
	npcData['Untoter Laubbär'] = [3829, 20];
	npcData['Untoter Minenarbeiter'] = [15, 800];
	npcData['Untoter Wandschleim'] = [372, 20];
	npcData['Untoter Winterbürger'] = [13, 200];
	npcData['Unverwüstliches Undaron'] = [5, 0];
	npcData['Uralte Bluteiche'] = [1496, 2238016];
	npcData['Uralter Unterwelt-Dämon'] = [3500, 650000];
	npcData['Uralter Unterwelt-Dämon'] = [1300, 240000];
	npcData['Uralter Unterwelt-Dämon'] = [1500, 280000];
	npcData['Uralter Unterwelt-Dämon'] = [2300, 370000];
	npcData['Urwaldeule'] = [17, 230];
	npcData['Urwaldkuh'] = [1, 3];
	npcData['Urwaldschlange'] = [9, 120];
	npcData['Urwaldschnecke'] = [4, 40];
	npcData['Urwaldspinne'] = [5, 50];
	npcData['Vater aller Stachelschuss-Igel'] = [350, 18000];
	npcData['Veranstalter der Rennen'] = [0, 0];
	npcData['Verbrannter Elufianer'] = [0, 0];
	npcData['Verirrter Aasgeier'] = [2, 10];
	npcData['Verirrter Tempelschleim'] = [3, 19];
	npcData['Verrosteter Wächtergolem'] = [5, 20];
	npcData['Verrückter Frostdämon'] = [65, 12000];
	npcData['Verschneites Geröllwiesel'] = [1, 2];
	npcData['Versteinerte Frau'] = [18, 10];
	npcData['Verstümmelter Morschgreifer'] = [4, 35];
	npcData['Verstümmeltes Holzmonster'] = [465, 72000];
	npcData['Vertin'] = [27, 10080];
	npcData['Vertrockneter Seichtwasserpilz'] = [1, 70];
	npcData['Verwehter Sandgeist'] = [4, 20];
	npcData['Verwildeter, blausilberner Glodo'] = [2, 7];
	npcData['Verwildeter, rotsilberner Glodo'] = [2, 7];
	npcData['Verwirrtes Schaf'] = [1, 5];
	npcData['Verwirrtes Sägezahnblatt'] = [50000, 3000000];
	npcData['Verwundete Nebelmaus'] = [1, 7];
	npcData['Verzauberte Nachtfledermaus'] = [520, 56213];
	npcData['Verzauberter Energiewurm'] = [3, 40];
	npcData['Vipara-Jäger'] = [28, 4253];
	npcData['Vorhof-Koordinator'] = [10, 160];
	npcData['Vulkandämon'] = [30, 5000];
	npcData['Wachsamer Frostwolf'] = [320, 199];
	npcData['Wachsende Efeuranke'] = [68, 9305];
	npcData['Wahnsinniger Waldschlurch'] = [8, 120];
	npcData['Waldhüpfer'] = [23, 200];
	npcData['Waldmonster'] = [12, 500];
	npcData['Waldratte'] = [1, 7];
	npcData['Waldschlurch'] = [2, 15];
	npcData['Waldschlurch-Skelett'] = [3, 21];
	npcData['Waldspinne'] = [3, 25];
	npcData['Waldvogel'] = [2, 10];
	npcData['Wallwurzel'] = [835, 3654781];
	npcData['Wandelnde Blutesche'] = [777, 603729];
	npcData['Wandelnder Laubbaum'] = [20, 6000];
	npcData['Wandschleim'] = [5, 40];
	npcData['Wasser-Schemen'] = [35, 300000];
	npcData['Wasserbär'] = [4, 35];
	npcData['Wasserkatze'] = [1, 3];
	npcData['Wasserschlange'] = [1, 8];
	npcData['Wassertentakel'] = [5, 60];
	npcData['Wawruz'] = [2, 10];
	npcData['Wegelagerer'] = [10, 280];
	npcData['Weinende Kastanie'] = [12, 144];
	npcData['Weiser Ontolon'] = [7500, 1800000];
	npcData['Weiße Fettmade'] = [5, 552934023];
	npcData['Weltenwandler'] = [140, 100000];
	npcData['Weltraum-Krake'] = [13, 200];
	npcData['Wendige Glypra'] = [25, 35];
	npcData['Wetterforsch'] = [100, 100000000];
	npcData['Wetterkontroll-Magier'] = [25, 10000];
	npcData['Wiesenpfeifer'] = [1, 8];
	npcData['Wiesenschrecke'] = [2, 12];
	npcData['Wildwassergans'] = [12, 101];
	npcData['Wildwasserkrebs'] = [192, 38500];
	npcData['Windgeist'] = [5, 40];
	npcData['Windgeist (Quest)'] = [5, 40];
	npcData['Wippschwanzmöwe'] = [28, 3650];
	npcData['Wirbelnder Rindenspeer'] = [91, 8281];
	npcData['Wogenreiter'] = [63, 12248];
	npcData['Wolf der Finsternis'] = [4, 30];
	npcData['Wolkenflatterer'] = [35, 6000];
	npcData['Wolkenkiste'] = [0, 1000];
	npcData['Wolkenschaf'] = [2, 8];
	npcData['Woll-Yeti'] = [23, 2200];
	npcData['Wolliges Goldschaf'] = [1, 5];
	npcData['Wuchernde Efeuranke'] = [6, 80];
	npcData['Wucherwurzelbaum (NPC)'] = [90, 10000];
	npcData['Wurzelkralle'] = [142, 20164];
	npcData['Wurzelnde Blutpeitsche'] = [84, 7056];
	npcData['Wurzelwurm'] = [2, 25];
	npcData['Wächter der Zelle'] = [6, 120];
	npcData['Wächter des rauschenden Flusses'] = [10, 2000];
	npcData['Wächter des Vulkans'] = [10, 200];
	npcData['Wächtergolem'] = [50, 1300];
	npcData['Wühlratte'] = [2, 20];
	npcData['Wüsten-Ektofron'] = [52, 5521];
	npcData['Wüstenkrake'] = [27, 7000];
	npcData['Wüstenmaus'] = [1, 2];
	npcData['Wüstenplankton'] = [2, 7];
	npcData['Wüstensalamander'] = [1, 12];
	npcData['Wüstenschreck'] = [3, 10];
	npcData['Wüstenspinne'] = [2, 7];
	npcData['Wütende Mooswurzel'] = [33, 530];
	npcData['Wütender Stachelkäfer'] = [2, 25];
	npcData['Xander'] = [0, 0];
	npcData['Zartbesaiteter Goldballenwurm'] = [280, 33000];
	npcData['Zauberer der Bergwiesen'] = [14, 300];
	npcData['Zauberfalle (NPC)'] = [0, 100];
	npcData['Zauberhafte Torpon-Schlange'] = [5000, 25000];
	npcData['Zielscheibe (NPC)'] = [1, 40];
	npcData['Zitterdachs'] = [1, 1];
	npcData['Zitternde Mooswurzel'] = [2, 20];
	npcData['Zottelfell-Hirsch'] = [0, 0];
	npcData['Zukuvogel'] = [2, 15];
	npcData['Zweibeinige Waldspinne'] = [3, 25];
	npcData['Zwielichtiger Händler'] = [38, 8672];
	npcData['Zäher Ontolon'] = [500, 265];
	npcData['Zäher Spindelschreiter'] = [153, 85];
	npcData['Zähnefletschender Wachhund'] = [0, 2500];
	npcData['Äonenjäger'] = [176, 132435];
	// NPC Data End
}

// Create NPC data structure objects
var npcData = new Object();
var critSpecialNpc = new Object();
var nonCritSpecialNpc = new Object();

// Start the routine function
routine();
