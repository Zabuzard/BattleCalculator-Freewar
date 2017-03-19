// ==UserScript==
// @name        BattleCalculator-Freewar
// @namespace   Zabuza
// @description Removes fastattack links for NPCs where the outcome of a battle is loosing for the player.
// @include     *.freewar.de/freewar/internal/main.php*
// @version     1
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @grant       none
// ==/UserScript==

/*
 * Routine function of the script.
 */
function routine() {
	initNpcData();
	initCriticalSpecialNpc();
	initNonCriticalSpecialNpc();
	
	var foundNpc = false;
	
	// First search for multiple NPC
	$('.listusersrow table tr td').each(function(index, cellElement) {
		var foundNpcInElement = processElement(cellElement);
		
		// Only update if a NPC was found
		if(foundNpcInElement) {
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
		} else  if (lifeLoss == -1) {
			// Player looses
			$(npcFastAttackElement).css('color', '#F00F0F');
			$(npcFastAttackElement).append(' (defeat)');
			$(npcFastAttackElement).removeAttr('href');
			$(npcFastAttackElement).removeAttr('onclick');
			$(npcNameElement).addClass('processedNPC knownNPC');
			return true;
		} else if (lifeLoss == -2){
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
			$(npcFastAttackElement).append(' (-' + lifeLoss + ' LP)');
			$(npcNameElement).addClass('processedNPC knownNPC');
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
		x = x.replace(/^\s+|\s+$/g,'');
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
 * Initializes the critical special NPC data structure.
 */
function initCriticalSpecialNpc() {
	// Resistance NPC
	critSpecialNpc['Achtsamer Stachelschuss-Igel'] = true;
	critSpecialNpc['Bockiger Stier'] = true;
	critSpecialNpc['Dickhäutiger Graustein-Bär'] = true;
	critSpecialNpc['Gepanzertes Undaron'] = true;
	critSpecialNpc['Glitschige Dunkelsee-Qualle'] = true;
	critSpecialNpc['Lebende Mauer'] = true;
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
	nonCritSpecialNpc['Glutschleim'] = true;
	nonCritSpecialNpc['Goldhornziege'] = true;
	nonCritSpecialNpc['Goldkraken'] = true;
	nonCritSpecialNpc['Grabräuber'] = true;
	nonCritSpecialNpc['Grabschlecker'] = true;
	nonCritSpecialNpc['Großer Blattalisk'] = true;
	nonCritSpecialNpc['Großer Nebelkreischer'] = true;
	nonCritSpecialNpc['Großes Eistentakel'] = true;
	nonCritSpecialNpc['Grüne Rotorlibelle'] = true;
	nonCritSpecialNpc['Heilender Baum'] = true;
	nonCritSpecialNpc['Jerodar-Anführer'] = true;
	nonCritSpecialNpc['Knorpel-Monster aus Draht'] = true;
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
	nonCritSpecialNpc['Portal in die Unterwelt'] = true;
	nonCritSpecialNpc['Randalierer'] = true;
	nonCritSpecialNpc['Rote Landkoralle'] = true;
	nonCritSpecialNpc['Roteiskoralle'] = true;
	nonCritSpecialNpc['Schatten-Ei'] = true;
	nonCritSpecialNpc['Schattenkreatur Gortari'] = true;
	nonCritSpecialNpc['Schattenkreatur Jalakori'] = true;
	nonCritSpecialNpc['Schattenkreatur Mantori'] = true;
	nonCritSpecialNpc['Schattenkreatur Turwakori'] = true;
	nonCritSpecialNpc['Schatzsucher'] = true;
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
	nonCritSpecialNpc['Untoter Bürgermeister'] = true;
	nonCritSpecialNpc['Vater aller Stachelschuss-Igel'] = true;
	nonCritSpecialNpc['Wahnsinniger Waldschlurch'] = true;
	nonCritSpecialNpc['Wasser-Schemen'] = true;
	nonCritSpecialNpc['Wetterkontroll-Magier'] = true;
	nonCritSpecialNpc['Wucherwurzelbaum'] = true;
	nonCritSpecialNpc['Wütender Stachelkäfer'] = true;
	nonCritSpecialNpc['Äonenjäger'] = true;
	
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
	nonCritSpecialNpc['Eiswelt-Echse'] = true;
	nonCritSpecialNpc['Feuerwachtel'] = true;
	nonCritSpecialNpc['Flimmernde Farbanomalie'] = true;
	nonCritSpecialNpc['Großer Prärieskorpion'] = true;
	nonCritSpecialNpc['Grünbaum-Affe'] = true;
	nonCritSpecialNpc['Grünes Stachel-Kowu'] = true;
	nonCritSpecialNpc['Herrscher der eisigen Dämonen'] = true;
	nonCritSpecialNpc['Herz des Blutwaldes'] = true;
	nonCritSpecialNpc['Kollektiver Salzhügel'] = true;
	nonCritSpecialNpc['Larpan'] = true;
	nonCritSpecialNpc['Lebende Waldwurzel'] = true;
	nonCritSpecialNpc['Lebender Tropfstein'] = true;
	nonCritSpecialNpc['Loroktom, der große Steingolem'] = true;
	nonCritSpecialNpc['Massive Landqualle'] = true;
	nonCritSpecialNpc['Nebelwolf'] = true;
	nonCritSpecialNpc['Phasenskelkos'] = true;
	nonCritSpecialNpc['Schattenkrokodil'] = true;
	nonCritSpecialNpc['Siedestein-Morschgreifer'] = true;
	nonCritSpecialNpc['Silberfluss-Bär'] = true;
	nonCritSpecialNpc['Siramücken-Schwarm'] = true;
	nonCritSpecialNpc['Sohn des Wiesengeistes'] = true;
	nonCritSpecialNpc['Spindelschreiter-Überwacher'] = true;
	nonCritSpecialNpc['Spinne der Staubnetze'] = true;
	nonCritSpecialNpc['Staubschleifer-Königin'] = true;
	nonCritSpecialNpc['Störrischer Stororaptor'] = true;
	nonCritSpecialNpc['Tempelhüter'] = true;
	nonCritSpecialNpc['Tempelwächter'] = true;
	nonCritSpecialNpc['Tollwütiger Graustein-Bär'] = true;
	nonCritSpecialNpc['Vertin'] = true;
	nonCritSpecialNpc['Waldmonster'] = true;
	nonCritSpecialNpc['Wandelnder Laubbaum'] = true;
	nonCritSpecialNpc['Weltenwandler'] = true;
	nonCritSpecialNpc['Wüstenkrake'] = true;
}

/*
 * Initializes the NPC data structure.
 */
function initNpcData() {
	// NPC Data Begin
	npcData['26-köpfiger Salamander'] = [67, 25000];
	npcData['Aasgeier'] = [2, 10];
	npcData['Abgesandter der Eiswelt '] = [34, 6000];
	npcData['Abgestürzte Lichtpflanze'] = [5, 45];
	npcData['Abgestürzter Weltraum-Kraken'] = [13, 200];
	npcData['Absorbierende Dunkelsee-Qualle'] = [360, 189];
	npcData['Abtrünnige Wolke'] = [95, 25000];
	npcData['Achtsamer Stachelschuss-Igel'] = [550, 274];
	npcData['Algenechse'] = [6, 60];
	npcData['Alte Grottenschlange'] = [2710, 420000];
	npcData['Alte Pilzwachtel'] = [1, 3];
	npcData['Alter Frostwolf'] = [420, 204];
	npcData['Alter Goldballenwurm'] = [5, 15];
	npcData['Alter Mann'] = [1, 3];
	npcData['Alter Serum-Geist'] = [0, 0];
	npcData['Alter Stororaptor'] = [250, 119];
	npcData['Alter Ölfisch'] = [12, 150];
	npcData['Altes Blätterwesen'] = [5, 50];
	npcData['Altes Kaklatron'] = [2, 7];
	npcData['Altstadtratte'] = [3, 12];
	npcData['Ameisenhügel'] = [2, 13];
	npcData['Anatubischer Windhund'] = [15, 200];
	npcData['Angebissene Lianenechse'] = [3, 10];
	npcData['Angepasster Ontolon'] = [80, 10000];
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
	npcData['Blumenbeißer'] = [2, 7];
	npcData['Blumenkasten'] = [0, 1000];
	npcData['Blutameise'] = [1, 1];
	npcData['Blutapfelbaum'] = [25, 12500];
	npcData['Blutblatt'] = [1, 1];
	npcData['Blutblob'] = [40, 1600];
	npcData['Blutende Lianenschlinge'] = [3, 5];
	npcData['Blutforsch'] = [1, 2];
	npcData['Blutgeflecht'] = [0, 0];
	npcData['Blutharzgeschoss'] = [261, 68121];
	npcData['Blutharzregen'] = [31, 961];
	npcData['Blutharztropfen'] = [1, 1];
	npcData['Blutige Peitschenliane'] = [37, 6500];
	npcData['Blutiges Schaf'] = [1, 5];
	npcData['Blutkrähe'] = [32, 1024];
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
	npcData['Brennendes Schaf'] = [1, 5];
	npcData['Bruder des Nebelbesens'] = [3, 15];
	npcData['Brummkäfer'] = [1, 10];
	npcData['Brutaler Fallensteller'] = [850, 135000];
	npcData['Brznkk Gttsnz'] = [0, 5000];
	npcData['Bulliges Erd-Skelkos'] = [85, 300];
	npcData['Busch-Frul'] = [5, 55];
	npcData['Bäcker'] = [0, 0];
	npcData['Bücherwurm'] = [1, 5];
	npcData['Chiup-Vogel'] = [2, 15];
	npcData['Crim Garaank'] = [40, 10000];
	npcData['Deckenkleiber'] = [3, 10];
	npcData['Denkender Lavablob'] = [28, 7000];
	npcData['Dicke, fette Strandkrabbe'] = [4, 20];
	npcData['Dicker Zukuvogel'] = [2, 15];
	npcData['Dickhäutiger Goldballenwurm'] = [340, 180];
	npcData['Dickhäutiger Graustein-Bär'] = [23, 68];
	npcData['Diebstahlfalle '] = [0, 100];
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
	npcData['Durstige Riesenlibelle'] = [2, 10];
	npcData['Dämonenhund'] = [20, 2000];
	npcData['Dämonisches Grünschleimwesen'] = [666, 90000];
	npcData['Ein Schwarm Blutkrähen'] = [100, 10000];
	npcData['Eine Schar Blutraben'] = [243, 59049];
	npcData['Einflügler'] = [400, 60000];
	npcData['Einsamer Schneehase'] = [2, 8];
	npcData['Einsamer Waldhüpfer'] = [5, 20];
	npcData['Einäugiger Stier'] = [3, 12];
	npcData['Eisbohrmaschine'] = [7, 90];
	npcData['Eisbohrmaschine-Prototyp'] = [7, 90];
	npcData['Eisvogel'] = [8, 60];
	npcData['Eiswelt-Echse'] = [340, 10000];
	npcData['Eiswurm'] = [6, 40];
	npcData['Ektofron'] = [50, 5000];
	npcData['Energetischer Falter'] = [6, 25];
	npcData['Energiewurm'] = [2, 40];
	npcData['Enorme Stachelschildkröte'] = [1800, 350000];
	npcData['Enormer Graustein-Bär'] = [49, 153];
	npcData['Entflohener Mörder'] = [215, 9000];
	npcData['Entlaufene Geisterschabe'] = [3, 17];
	npcData['Entspannte Flachassel'] = [2, 25];
	npcData['Erd-Skelkos'] = [8, 300];
	npcData['Erdfisch'] = [4, 25];
	npcData['Erdkäfer'] = [1, 2];
	npcData['Erdschlurch'] = [2, 13];
	npcData['Erdvogel'] = [7, 50];
	npcData['Erfahrener Frostwolf'] = [1700, 840000];
	npcData['Erfrorenes Schaf'] = [1, 5];
	npcData['Erschöpfte Klauenratte'] = [1, 7];
	npcData['Ertrinkender Energiewurm'] = [2, 40];
	npcData['Exil-Nomade'] = [5, 50];
	npcData['Exotischer Fisch'] = [2, 5];
	npcData['Experimental-Phasenwesen'] = [123, 1234567890];
	npcData['Explosionsfalle '] = [0, 100];
	npcData['Explosiver Tempelschleim'] = [2, 19];
	npcData['Fahrender Händler'] = [0, 1000];
	npcData['Fallensteller'] = [8, 90];
	npcData['Feldhase'] = [1, 2];
	npcData['Felsenechse'] = [5, 60];
	npcData['Felsenkrabbler'] = [473, 76450];
	npcData['Felsenkriecher'] = [762, 648000];
	npcData['Felsenschreier'] = [10, 1];
	npcData['Felsenwurm'] = [4, 20];
	npcData['Feuer-Schemen'] = [0, 0];
	npcData['Feuergeist'] = [25, 3000];
	npcData['Feuerlaub-Echse'] = [6, 70];
	npcData['Feuerlurch'] = [15, 150];
	npcData['Feuervogel'] = [25, 3000];
	npcData['Feuerwachtel'] = [17, 4000];
	npcData['Feuerwolf'] = [2, 9];
	npcData['Feueröl-Händler'] = [0, 1000];
	npcData['Finstereis-Bewacher'] = [1, 100];
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
	npcData['Flossenflinger'] = [3, 37];
	npcData['Fluktuatives Zauberlabor'] = [0, 1000];
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
	npcData['Frostwolf-Anführer'] = [3010, 3700000];
	npcData['Frostwolf-Welpe'] = [8, 70];
	npcData['Gardu-Strauchkäfer'] = [2, 8];
	npcData['Gartenschildkröte'] = [3643, 3126948];
	npcData['Gefallener Spindelschreiter'] = [5, 15];
	npcData['Gefallenes Lichtwesen'] = [9, 2000];
	npcData['Gefleckte Riesenlibelle'] = [4, 35];
	npcData['Gefrässiger Schattensalamander'] = [35, 3200];
	npcData['Gefräßige Schotterraupe'] = [5, 40];
	npcData['Gefährliches Tier'] = [1, 100000000];
	npcData['Geist der Depressionen'] = [80, 30000];
	npcData['Geist der Finsternis'] = [5, 15];
	npcData['Geist der Welt'] = [5, 40];
	npcData['Geist von Pur Pur'] = [10, 130];
	npcData['Geister-Undaron'] = [10, 5];
	npcData['Geisterschabe'] = [3, 17];
	npcData['Geknickter lebender Ast'] = [2, 15];
	npcData['Gelangweilter Fallensteller'] = [8, 90];
	npcData['Gelbbart-Yeti'] = [23, 2200];
	npcData['Gelbkatze'] = [1, 3];
	npcData['Gemeiner Unterwelt-Dämon'] = [45, 3000];
	npcData['Gepanzertes Undaron'] = [21, 80];
	npcData['Gepforn'] = [3, 20];
	npcData['Geröllschlange'] = [31, 2200];
	npcData['Geröllwiesenschlange'] = [2, 17];
	npcData['Geschwächter Abgesandter'] = [10, 300];
	npcData['Geschwächtes Kaklatron'] = [1, 7];
	npcData['Geysir-Schlucker'] = [1200, 200000];
	npcData['Giftbeißer'] = [4, 45];
	npcData['Giftfalle '] = [0, 100];
	npcData['Giftgeist von Narubia'] = [12, 17000];
	npcData['Giftgrabl'] = [10, 100];
	npcData['Giftiger Saugfisch'] = [2, 18];
	npcData['Giftschleimer'] = [6, 70];
	npcData['Giftsporenpilz'] = [3, 24];
	npcData['Gigantischer Spindelschreiter'] = [1500, 225000];
	npcData['Gigantischer Todesläufer'] = [1040, 180000];
	npcData['Gipfellöwe'] = [2837, 1538000];
	npcData['Glaswasserfisch'] = [7, 150];
	npcData['Gletscherente'] = [2, 10];
	npcData['Glibbriger Eiswurm'] = [6, 40];
	npcData['Glitschige Dunkelsee-Qualle'] = [380, 194];
	npcData['Glutlichtfalter'] = [123, 15951];
	npcData['Glypra'] = [12, 350];
	npcData['Glypra-Spion'] = [18, 15];
	npcData['Glypra-Späher'] = [12, 350];
	npcData['Glühende Staubechse'] = [180, 30000];
	npcData['Glühwürmchen'] = [1, 2];
	npcData['Goldballenwurm'] = [30, 40];
	npcData['Goldener Flutentaucher'] = [924, 777777];
	npcData['Goldener Undaronwächter'] = [104, 11428];
	npcData['Goldenes Tor'] = [0, 30];
	npcData['Goldfadenwurm'] = [5, 18];
	npcData['Goldflossenfisch'] = [2, 17];
	npcData['Goldhornziege'] = [3, 1];
	npcData['Goldkiste'] = [0, 1000];
	npcData['Goldkraken'] = [10, 8000];
	npcData['Goldkrebs'] = [2, 12];
	npcData['Goldkuh'] = [4, 30];
	npcData['Goldwurm'] = [6, 40];
	npcData['Goldwächter'] = [14, 300];
	npcData['Grabfliege'] = [2, 7];
	npcData['Grabgeist der vermissten Toten'] = [9, 140];
	npcData['Grabräuber'] = [8, 120];
	npcData['Grabschlecker'] = [4, 50];
	npcData['Grabwurm'] = [3, 18];
	npcData['Grafrather Stechmückenschwarm'] = [1, 1];
	npcData['Grasblatt-Schlange'] = [6, 55];
	npcData['Graswiesenschlange'] = [2, 17];
	npcData['Gratrat-Alien'] = [20, 800];
	npcData['Graubartechse'] = [1, 6];
	npcData['Graugoldfalter'] = [4, 18];
	npcData['Graustein-Bär'] = [10, 4800];
	npcData['Grottenschlange'] = [271, 32000];
	npcData['Großer Blattalisk'] = [10, 10000];
	npcData['Großer Bohnenschnapper'] = [3, 18];
	npcData['Großer Erdkäfer'] = [2, 20];
	npcData['Großer Laubbär'] = [24, 2600];
	npcData['Großer Lava-Käfer'] = [8, 120];
	npcData['Großer Nebelkreischer'] = [25, 400000];
	npcData['Großer Phasenvogel'] = [955, 380000];
	npcData['Großer Prärieskorpion'] = [19, 1000];
	npcData['Großer Schatten der Dunkelheit'] = [630, 85000];
	npcData['Großer Wurzelwurm'] = [10, 150];
	npcData['Großes Eistentakel'] = [20, 20000];
	npcData['Grunulum'] = [5, 40];
	npcData['Grünbaum-Affe'] = [70, 4000];
	npcData['Grüne Rotorlibelle'] = [26, 50000];
	npcData['Grünes Stachel-Kowu'] = [41, 5000];
	npcData['Grünschimmer-Ameise'] = [18, 260];
	npcData['Gurdz-Beerenstrauch'] = [3, 28];
	npcData['Handwerker'] = [0, 0];
	npcData['Hangstelzer'] = [46, 6500];
	npcData['Harmloser Giftsporenpilz'] = [3, 24];
	npcData['Hase'] = [1, 2];
	npcData['Heilender Baum '] = [8, 90];
	npcData['Herrscher der eisigen Dämonen'] = [64, 25000];
	npcData['Herz des Blutwaldes'] = [33, 400000];
	npcData['Hinterlistiger Stororaptor'] = [1630, 551000];
	npcData['Holz-Maus'] = [1, 7];
	npcData['Holzplatten-Schildkröte'] = [4, 45];
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
	npcData['Kanal-Krake'] = [3, 10];
	npcData['Kanalqualle'] = [50, 10000];
	npcData['Kastanienträne'] = [0, 0];
	npcData['Kauzumachbusch'] = [0, 0];
	npcData['Kellerkiste'] = [0, 1000];
	npcData['Kiste der Festung'] = [0, 1000];
	npcData['Kiste des Auftragshauses'] = [0, 0];
	npcData['Klapperschlange'] = [3, 8];
	npcData['Klauenbartrein'] = [22, 2000];
	npcData['Klauenratte'] = [1, 7];
	npcData['Kleine Blutratte'] = [2, 4];
	npcData['Kleine Blutweide'] = [256, 65536];
	npcData['Kleine Farbanomalie'] = [3, 25];
	npcData['Kleine Grottenschlange'] = [9, 120];
	npcData['Kleine Luftschnecke'] = [1, 6];
	npcData['Kleine Spinne'] = [2, 25];
	npcData['Kleine Stachelmade'] = [1, 1];
	npcData['Kleiner Laubbär'] = [3, 20];
	npcData['Kleiner Nebelkreischer'] = [6, 60];
	npcData['Kleiner Phasenbär'] = [2, 25];
	npcData['Kleiner Spindelschreiter'] = [1, 12];
	npcData['Kleiner Steingolem'] = [6, 160];
	npcData['Kleiner Waldschlurch'] = [2, 15];
	npcData['Kleines Haus-Schaf'] = [1, 5];
	npcData['Kleines Reen'] = [1, 10];
	npcData['Kleines Schaf'] = [1, 5];
	npcData['Kleines Schlangentier'] = [1, 8];
	npcData['Knochenpilz'] = [0, 5];
	npcData['Knochensammler'] = [5, 55];
	npcData['Knorpel-Monster aus Draht '] = [10, 3000];
	npcData['Knorrige Wurzel'] = [41, 1681];
	npcData['Knunglo'] = [10, 120];
	npcData['Knurrender Goldballenwurm'] = [560, 15000];
	npcData['Kollektiver Salzhügel'] = [25, 5000];
	npcData['Koloa-Käfer'] = [1, 2];
	npcData['Kopolaspinne'] = [16, 1000];
	npcData['Kraftvoller Sporenträger'] = [710, 98000];
	npcData['Kranke Grottenschlange'] = [271, 2000];
	npcData['Kranke Milchkuh'] = [1, 3];
	npcData['Kranker Todesläufer'] = [3, 30];
	npcData['Kranker Wüstensalamander'] = [1, 12];
	npcData['Kreisende Wippschwanzmöwe'] = [28, 3650];
	npcData['Kriechlapf'] = [4, 12];
	npcData['Kristall-Orwane'] = [7, 80];
	npcData['Kristallfisch'] = [3, 6];
	npcData['Kristallwasserpflanze'] = [20, 2000];
	npcData['Krumme Grünschimmer-Ameise'] = [10, 100];
	npcData['Krustenkäfer'] = [3, 12];
	npcData['Kräftiger Graustein-Bär'] = [100, 12800];
	npcData['Kuhmuh'] = [0, 0];
	npcData['Kurnotan - der dunkle Magier'] = [14, 500];
	npcData['Lablabkaktus'] = [2, 25];
	npcData['Langfaden-Spinne'] = [2, 25];
	npcData['Langzahnaffe'] = [4, 12];
	npcData['Larafstrauch'] = [3, 10];
	npcData['Larpan'] = [38, 80000];
	npcData['Larvennest'] = [2, 8];
	npcData['Laubwiesenschlange'] = [2, 17];
	npcData['Lava-Echse'] = [2, 20];
	npcData['Lava-Käfer'] = [4, 20];
	npcData['Lava-Wurm'] = [3, 20];
	npcData['Lawinengeist'] = [14, 250];
	npcData['Lebende Bergspitze'] = [13, 2500];
	npcData['Lebende Salzstatue'] = [84, 5300];
	npcData['Lebende Statue'] = [10, 240];
	npcData['Lebende Waldwurzel'] = [80, 4000];
	npcData['Lebender Ast'] = [3, 30];
	npcData['Lebender Salzhügel'] = [2, 15];
	npcData['Lebender Tropfstein'] = [37, 17000];
	npcData['Lehrlingskiste'] = [0, 1000];
	npcData['Lernfähiger Spindelschreiter'] = [21, 12138];
	npcData['Leuchtende Dunkelsee-Qualle'] = [890, 160000];
	npcData['Lianenechse'] = [3, 10];
	npcData['Lichtpflanze'] = [9, 90];
	npcData['Lichtwurm'] = [3, 30];
	npcData['Lola - Die Hauskawutze'] = [2, 10];
	npcData['Loroktom, der große Steingolem'] = [22, 3000];
	npcData['Magier der dunklen Macht'] = [8, 8000];
	npcData['Der Magier des Schutzes'] = [3, 13];
	npcData['Magische Farbanomalie'] = [47, 7000];
	npcData['Manticore'] = [5, 30];
	npcData['Massive Landqualle'] = [52, 8000];
	npcData['Metallischer Morschgreifer'] = [240, 99];
	npcData['Milchkuh'] = [1, 3];
	npcData['Mineralstein'] = [0, 0];
	npcData['Moorgeist'] = [7, 70];
	npcData['Moosgeflecht'] = [2, 25];
	npcData['Moosschildkröte'] = [241, 33817];
	npcData['Moosspinne'] = [2, 25];
	npcData['Mopfchen'] = [0, 1];
	npcData['Mormdat'] = [3, 10];
	npcData['Morschgreifer'] = [8, 80];
	npcData['Morschwaldaffe'] = [2, 30];
	npcData['Murmelndes Mormdat'] = [3, 10];
	npcData['Mutierte Wolkenblume'] = [1, 6];
	npcData['Mutierter Koloa-Käfer'] = [15, 1000];
	npcData['Mutierter Morschgreifer'] = [300, 800];
	npcData['Mutiges Mormdat'] = [3, 10];
	npcData['Mutter der Geysir-Schlucker'] = [35, 5000];
	npcData['Mächtige Phasenbarriere'] = [0, 90];
	npcData['Nachtfledermaus'] = [10, 120];
	npcData['Nachtgonk'] = [7, 80];
	npcData['Nachtgonk '] = [7, 80];
	npcData['Nachtgonk im dunklen Haus'] = [7, 40];
	npcData['Nachtschattenraupe'] = [3, 10];
	npcData['Narbiger Schneewurm'] = [2, 35];
	npcData['Naurofbusch'] = [1, 3];
	npcData['Nebelbesen'] = [3, 15];
	npcData['Nebelblume'] = [1, 1];
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
	npcData['Nebelhüpfer'] = [3, 15];
	npcData['Nebelkrebs'] = [14, 150];
	npcData['Nebelkreischer'] = [18, 250];
	npcData['Die Nebelkrähe'] = [3, 20];
	npcData['Die Nebelkröte'] = [1, 2];
	npcData['Nebelschleimer'] = [20, 500];
	npcData['Nebelschnecke'] = [3, 15];
	npcData['Das Nebelwesen'] = [6, 100];
	npcData['Nebelwiesel'] = [1, 2];
	npcData['Nebelwolf'] = [120, 5000];
	npcData['Nomade'] = [5, 50];
	npcData['Norpi'] = [5, 60];
	npcData['Onlo-Skelett'] = [18, 300];
	npcData['Ontolon'] = [34, 540];
	npcData['Onuk Kulo'] = [127, 10101];
	npcData['Panzerrochen'] = [94, 18000];
	npcData['Parabolspinne'] = [0, 0];
	npcData['Parfugurn'] = [400, 15000];
	npcData['Peitschende Blutliane'] = [72, 14000];
	npcData['Pfeilschnecke'] = [15, 150];
	npcData['Phasenassel'] = [2, 45];
	npcData['Phasenbarriere'] = [0, 30];
	npcData['Phasenenergiefalle '] = [0, 100];
	npcData['Phasenfalter'] = [135, 45000];
	npcData['Phasenfuchs'] = [7, 61];
	npcData['Phasengeier'] = [9, 90];
	npcData['Phasengreifer'] = [548, 3500];
	npcData['Phasenhummer'] = [710, 260000];
	npcData['Phasenkiste'] = [0, 1000];
	npcData['Phasenkraken'] = [370, 39000];
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
	npcData['Phasensalamander'] = [3, 26];
	npcData['Phasenschabe'] = [6, 18];
	npcData['Phasenschaf'] = [2, 12];
	npcData['Phasenschildkröte'] = [1450, 540000];
	npcData['Phasenschlamm'] = [1, 20];
	npcData['Phasenschlange'] = [8, 80];
	npcData['Phasenschleim'] = [4, 36];
	npcData['Phasenschnecke'] = [6, 55];
	npcData['Phasenseestern'] = [250, 85000];
	npcData['Phasenskelkos'] = [75, 10000];
	npcData['Phasenskorpion'] = [231, 23000];
	npcData['Phasenspinne'] = [25, 320];
	npcData['Phasentiger'] = [59, 5300];
	npcData['Phasenverbrenner'] = [110, 15000];
	npcData['Phasenvogel'] = [2, 13];
	npcData['Phasenwiesel'] = [1, 8];
	npcData['Phasenwolf'] = [23, 630];
	npcData['Phasenwurm'] = [3, 30];
	npcData['Pilzwachtel'] = [1, 3];
	npcData['Pironer'] = [35, 10000];
	npcData['Plätscherfluss-Krokodil'] = [586, 112000];
	npcData['Polarisations-Otter'] = [20, 300];
	npcData['Portal '] = [0, 100];
	npcData['Portal des Feuers'] = [0, 10];
	npcData['Portal des Wassers'] = [0, 10];
	npcData['Portal in die Unterwelt'] = [0, 100];
	npcData['Portalstab '] = [0, 100];
	npcData['Portalstab-Anbeter'] = [20, 250];
	npcData['Randalierer'] = [8, 80];
	npcData['Reen'] = [6, 50];
	npcData['Reicher Wüstensalamander'] = [3, 12];
	npcData['Reisender Fallensteller'] = [8, 90];
	npcData['Resistenter Schatten'] = [600, 244];
	npcData['Resistenter Stachelschuss-Igel'] = [570, 269];
	npcData['Riesenfalter-Kokon'] = [1, 5];
	npcData['Riesenhornisse'] = [9, 100];
	npcData['Riesenlibelle'] = [2, 10];
	npcData['Riesige Gift-Dschungelschlange'] = [7, 100];
	npcData['Riesige Landmuschel'] = [43, 9000];
	npcData['Riesige Schattenfledermaus'] = [14, 400];
	npcData['Rindenhagel'] = [160, 25600];
	npcData['Rindenwalze'] = [0, 0];
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
	npcData['Roter Sandhund'] = [10, 160];
	npcData['Rotfell-Reh'] = [186, 32000];
	npcData['Rotfell-Rehkitz'] = [5, 35];
	npcData['Rotpunkt-Tiger'] = [8, 200];
	npcData['Rotschimmer-Ameise'] = [5300, 890000];
	npcData['Rotzahnhai'] = [6, 70];
	npcData['Rubinroter Waldgeist'] = [3129, 1895760];
	npcData['Ruinen-Wurm'] = [1, 6];
	npcData['Ruinenschleicher'] = [5, 30];
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
	npcData['Schattenkreatur Gortari'] = [85, 30000];
	npcData['Schattenkreatur Jalakori'] = [55, 30000];
	npcData['Schattenkreatur Mantori'] = [30, 20000];
	npcData['Schattenkreatur Turwakori'] = [350, 30000];
	npcData['Schattenkreatur XY '] = [1, 1];
	npcData['Schattenkrokodil'] = [21, 3000];
	npcData['Schattenmoos'] = [3, 60];
	npcData['Schattensalamander'] = [35, 3200];
	npcData['Ein Schattenwesen'] = [2, 10];
	npcData['Schattenwiesel'] = [1, 2];
	npcData['Schattenwolf'] = [7, 20];
	npcData['Schatzsucher '] = [20, 2000];
	npcData['Schaufelmaulwurf'] = [15, 150];
	npcData['Schillernder Küstling'] = [5, 62];
	npcData['Schlammkaktus'] = [33, 800];
	npcData['Schleimraupe'] = [12, 180];
	npcData['Schleuderfalle '] = [0, 100];
	npcData['Schlingende Lianenpeitsche'] = [26, 5000];
	npcData['Schlurum'] = [15, 250];
	npcData['Schmatzende Blattspinne'] = [2, 25];
	npcData['Schmerzfalle '] = [0, 100];
	npcData['Schmieriger Geschäftemacher'] = [15, 350];
	npcData['Schneefisch'] = [1, 7];
	npcData['Schneehase'] = [2, 8];
	npcData['Schneehuhn'] = [1, 2];
	npcData['Schneekäfer'] = [2, 8];
	npcData['Schneekäfer-Kokon'] = [1, 8];
	npcData['Schneekäfer-Raupe'] = [2, 8];
	npcData['Schneesturmgeist'] = [127, 16000];
	npcData['Schneewiesel'] = [1, 2];
	npcData['Schneeworan'] = [8, 200];
	npcData['Schneewurm'] = [2, 35];
	npcData['Schnelle Bernstein-Raupe'] = [90, 49];
	npcData['Schneller Stachelsprungkrebs'] = [1674, 3132800];
	npcData['Schneller Steinmolch'] = [10, 120];
	npcData['Schneller Stororaptor'] = [240, 124];
	npcData['Schneller Tempelkrabbler'] = [2, 50];
	npcData['Schnelles Tonar-Reptil'] = [160, 84];
	npcData['Schnellflatter-Schmetterling'] = [280, 250];
	npcData['Schotterraupe'] = [5, 40];
	npcData['Schotterwurm'] = [0, 10];
	npcData['Schwacher Sporenträger'] = [3, 10];
	npcData['Schwacher Unterwelt-Dämon'] = [17, 280];
	npcData['Schwaches Stachelkrokodil'] = [12, 121];
	npcData['Schwangeres Schneehuhn'] = [1, 2];
	npcData['Schwarze Keitel-Spinne'] = [4, 18];
	npcData['Schwarzeisenbarrikade'] = [0, 20];
	npcData['Schwarzwespen'] = [5, 40];
	npcData['Schwebende Goldkutsche'] = [7, 5000];
	npcData['Schwimmendes Tentakel'] = [6, 40];
	npcData['Schwächefalle '] = [0, 100];
	npcData['Seeschlamm'] = [9, 100];
	npcData['Seichtwasserpilz'] = [2, 70];
	npcData['Seltsames Tier'] = [1, 2];
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
	npcData['Siramücken-Schwarm'] = [50, 12000];
	npcData['Sohn des Wiesengeistes'] = [16, 800];
	npcData['Solarda-Fisch'] = [3, 20];
	npcData['Spezialist für Erze'] = [5, 100];
	npcData['Spindelschreiter'] = [10, 1500];
	npcData['Spindelschreiter-Überwacher'] = [93, 10000];
	npcData['Spinne der Staubnetze'] = [80, 5000];
	npcData['Sporenträger'] = [4, 40];
	npcData['Sprungechse'] = [2, 7];
	npcData['Spröder Ast'] = [3, 9];
	npcData['Sprühregenwurm'] = [3, 25];
	npcData['Stabfisch'] = [1, 7];
	npcData['Stabkrebs'] = [3, 18];
	npcData['Stabschrecke'] = [8, 70];
	npcData['Stachelblutdickicht'] = [205, 42025];
	npcData['Stachelfisch'] = [3, 20];
	npcData['Stachelkrokodil'] = [510, 71000];
	npcData['Stachelkäfer'] = [2, 25];
	npcData['Stachelschildkröte'] = [590, 79000];
	npcData['Stachelschreck'] = [7, 80];
	npcData['Stachelsprungkrebs'] = [80, 3000];
	npcData['Starrfalle '] = [0, 100];
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
	npcData['Stein-Koloss'] = [35, 50000];
	npcData['Stein-Skelkos'] = [8, 120];
	npcData['Stein-Tentakel'] = [6, 40];
	npcData['Steingolem'] = [12, 320];
	npcData['Steinhuhn'] = [2, 30];
	npcData['Steinkatze'] = [1, 3];
	npcData['Steinkraller'] = [369, 18400];
	npcData['Steinkratzkäfer'] = [2, 25];
	npcData['Steinkäfer'] = [2, 20];
	npcData['Steinmolch'] = [4, 40];
	npcData['Steinpicker-Vogel'] = [3, 20];
	npcData['Steinschalenkäfer'] = [14, 1200];
	npcData['Steinschutt'] = [0, 20];
	npcData['Steinspinne'] = [3, 10];
	npcData['Steppenwolf'] = [4, 10];
	npcData['Stepto-Waran'] = [190, 152];
	npcData['Sterbliche Waldratte'] = [1, 7];
	npcData['Sternenzerstörer'] = [100, 60000];
	npcData['Stolperfalle '] = [0, 100];
	npcData['Stororaptor'] = [480, 68000];
	npcData['Strandlokil'] = [8, 90];
	npcData['Strauchkäfer'] = [2, 8];
	npcData['Störrischer Stororaptor'] = [165, 25000];
	npcData['Sula-Echse'] = [30, 30000];
	npcData['Sumpflandkröte'] = [2, 15];
	npcData['Sumpfschrecke'] = [12, 170];
	npcData['Sumpfspinne'] = [3, 20];
	npcData['Südmeer-Tucan'] = [1, 2];
	npcData['Teidam'] = [5, 50];
	npcData['Tempelhüpfer'] = [3, 25];
	npcData['Tempelhüter'] = [25, 4000];
	npcData['Tempelkrabbler'] = [2, 18];
	npcData['Tempelschatz'] = [0, 1000];
	npcData['Tempelwächter'] = [35, 12000];
	npcData['Temporaler Falter'] = [8, 35];
	npcData['Tentakel'] = [6, 40];
	npcData['Tentakel aus Gold'] = [6, 40];
	npcData['Thorom Logrid'] = [7, 50];
	npcData['Tiefsee-Aal'] = [8, 90];
	npcData['Tilua-Pflanze'] = [36, 200000];
	npcData['Todesflossen-Fisch'] = [150, 500000];
	npcData['Todesmoor-Krokodil'] = [8, 90];
	npcData['Tolloschein-Fresser'] = [2, 25];
	npcData['Tollwütiger Graustein-Bär'] = [1, 25000];
	npcData['Tonar-Reptil'] = [800, 130000];
	npcData['Tote Bergspitze'] = [53, 10200];
	npcData['Tote Kuh'] = [3, 1];
	npcData['Totes Wawruz'] = [2, 10];
	npcData['Transparenter Schatten'] = [560, 239];
	npcData['Triefender Wandschleim'] = [5, 40];
	npcData['Trockenwurm'] = [3, 10];
	npcData['Tropfsteinwandler'] = [15, 150];
	npcData['Tropfsteinwurm'] = [3, 20];
	npcData['Turmgeist'] = [20, 5000];
	npcData['Tänzerin von Beispieluser'] = [4, 40];
	npcData['Umnebeltes Schlangentier'] = [1, 8];
	npcData['Unbekannter Affe'] = [8, 80];
	npcData['Undaron'] = [10, 1];
	npcData['Unsterbliche Waldratte'] = [1, 7];
	npcData['Unterwelt-Dämon'] = [430, 55000];
	npcData['Untoter Bürger'] = [13, 200];
	npcData['Untoter Bürgermeister'] = [135, 21000];
	npcData['Untoter Winterbürger'] = [13, 200];
	npcData['Unverwüstliches Undaron'] = [30, 6];
	npcData['Uralte Bluteiche'] = [1496, 2238016];
	npcData['Uralter Unterwelt-Dämon'] = [3500, 650000];
	npcData['Urwaldkuh'] = [1, 3];
	npcData['Urwaldschnecke'] = [4, 40];
	npcData['Vater aller Stachelschuss-Igel'] = [350, 18000];
	npcData['Verirrter Aasgeier'] = [2, 10];
	npcData['Verirrter Tempelschleim'] = [3, 19];
	npcData['Verrosteter Wächtergolem'] = [5, 20];
	npcData['Verrückter Frostdämon'] = [65, 12000];
	npcData['Verschneites Geröllwiesel'] = [1, 2];
	npcData['Verstümmelter Morschgreifer'] = [4, 35];
	npcData['Verstümmeltes Holzmonster'] = [465, 72000];
	npcData['Vertin'] = [27, 10080];
	npcData['Vertrockneter Seichtwasserpilz'] = [1, 70];
	npcData['Verwehter Sandgeist'] = [4, 20];
	npcData['Verwirrtes Schaf'] = [1, 5];
	npcData['Verwirrtes Sägezahnblatt'] = [50000, 3000000];
	npcData['Verwundete Nebelmaus'] = [1, 7];
	npcData['Verzauberte Nachtfledermaus'] = [520, 56213];
	npcData['Verzauberter Energiewurm'] = [3, 40];
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
	npcData['Weltenwandler'] = [140, 100000];
	npcData['Weltraum-Kraken'] = [13, 200];
	npcData['Wendige Glypra'] = [25, 35];
	npcData['Werkstattarbeiter'] = [3, 0];
	npcData['Wetterkontroll-Magier'] = [25, 10000];
	npcData['Wiesenpfeifer'] = [1, 8];
	npcData['Wiesenschrecke'] = [2, 12];
	npcData['Wildwasserkrebs'] = [192, 38500];
	npcData['Wind-Schemen'] = [0, 0];
	npcData['Windgeist'] = [5, 40];
	npcData['Windgeist '] = [5, 40];
	npcData['Wippschwanzmöwe'] = [28, 3650];
	npcData['Wirbelnder Rindenspeer'] = [91, 8281];
	npcData['Wogenreiter'] = [63, 12248];
	npcData['Der Wolf der Finsternis'] = [4, 30];
	npcData['Wolkenflatterer'] = [35, 6000];
	npcData['Wolkenkiste'] = [0, 1000];
	npcData['Wolkenschaf'] = [2, 8];
	npcData['Wolliges Goldschaf'] = [1, 5];
	npcData['Wuchernde Efeuranke'] = [6, 80];
	npcData['Wucherwurzelbaum '] = [90, 10000];
	npcData['Wurzelkralle'] = [190, 36100];
	npcData['Wurzelnde Blutpeitsche'] = [84, 7056];
	npcData['Wurzelwurm'] = [2, 25];
	npcData['Wächter der Zelle'] = [6, 120];
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
	npcData['Zauberer der Bergwiesen'] = [14, 300];
	npcData['Zielscheibe '] = [1, 40];
	npcData['Zitternde Mooswurzel'] = [2, 20];
	npcData['Zottelfell-Hirsch'] = [0, 0];
	npcData['Zukuvogel'] = [2, 15];
	npcData['Zweibeinige Waldspinne'] = [3, 25];
	npcData['Zäher Ontolon'] = [500, 265];
	npcData['Zäher Spindelschreiter'] = [288, 0];
	// NPC Data End
}

// Create NPC data structure objects
var npcData = new Object();
var critSpecialNpc = new Object();
var nonCritSpecialNpc = new Object();

// Start the routine function
routine();