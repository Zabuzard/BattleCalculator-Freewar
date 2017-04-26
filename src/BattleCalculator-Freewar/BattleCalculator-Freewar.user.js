// ==UserScript==
// @name        BattleCalculator - Freewar
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
	npcData['26-köpfiger Salamander'] = [0, 25000];
	npcData['Aasgeier'] = [0, 10];
	npcData['Abgesandter der Eiswelt '] = [0, 6000];
	npcData['Abgestürzte Lichtpflanze'] = [0, 45];
	npcData['Abgestürzter Weltraum-Krake'] = [0, 200];
	npcData['Absorbierende Dunkelsee-Qualle'] = [0, 189];
	npcData['Abtrünnige Wolke'] = [0, 25000];
	npcData['Achtsamer Stachelschuss-Igel'] = [0, 274];
	npcData['Algenechse'] = [0, 60];
	npcData['Alte Grottenschlange'] = [0, 420000];
	npcData['Alte Pilzwachtel'] = [0, 3];
	npcData['Alter Frostwolf'] = [0, 204];
	npcData['Alter Goldballenwurm'] = [0, 15];
	npcData['Alter Mann'] = [0, 3];
	npcData['Alter Stororaptor'] = [0, 119];
	npcData['Alter Ölfisch'] = [0, 150];
	npcData['Altes Blätterwesen'] = [0, 50];
	npcData['Altes Kaklatron'] = [0, 7];
	npcData['Altstadtratte'] = [0, 12];
	npcData['Ameisenhügel'] = [0, 13];
	npcData['Anatubischer Windhund'] = [0, 200];
	npcData['Angebissene Lianenechse'] = [0, 10];
	npcData['Angepasster Ontolon'] = [0, 10000];
	npcData['Angstbarriere'] = [0, 20];
	npcData['Aschenvogel'] = [0, 20];
	npcData['Astgreifer'] = [0, 51948];
	npcData['Aufgeregter Nebelhüpfer'] = [0, 15];
	npcData['Ausgesaugter Energiewurm'] = [0, 1];
	npcData['Ausgestoßener Glypra'] = [0, 350];
	npcData['Ausgewachsener Strativar'] = [0, 75000];
	npcData['Baby-Einflügler'] = [0, 90];
	npcData['Badender Frostwolf-Welpe'] = [0, 70];
	npcData['Baru-Giftegel'] = [0, 7];
	npcData['Baru-Schrecke'] = [0, 7000];
	npcData['Baumkuschler'] = [0, 70];
	npcData['Behüter der Kathedrale'] = [0, 1000];
	npcData['Belebender Falter'] = [0, 12];
	npcData['Belpharia-Tucan'] = [0, 2];
	npcData['Bemooster Felsblock'] = [0, 555555];
	npcData['Benebeltes Mormdat'] = [0, 10];
	npcData['Berghund'] = [0, 45];
	npcData['Bergpilz'] = [0, 70];
	npcData['Bernstein-Dokun'] = [0, 80000];
	npcData['Bernstein-Falke'] = [0, 40000];
	npcData['Bernstein-Raupe'] = [0, 100];
	npcData['Bestialisches Tonar-Reptil'] = [0, 80];
	npcData['Betrunkener Rabauke'] = [0, 0];
	npcData['Beuteltiger'] = [0, 8000];
	npcData['Bierbraumeister'] = [0, 200];
	npcData['Bissiger Ölfisch'] = [0, 8000];
	npcData['Blattalisk'] = [0, 50];
	npcData['Blattspinne'] = [0, 25];
	npcData['Blauer Landfisch'] = [0, 29000];
	npcData['Blauer Stachelschuss-Igel'] = [0, 6000];
	npcData['Blauer Todesläufer'] = [0, 1200];
	npcData['Blaues Glühwürmchen'] = [0, 200];
	npcData['Blaues Stachel-Kowu'] = [0, 10000];
	npcData['Blaukamm-Vogel'] = [0, 10];
	npcData['Blauschimmer-Ameise'] = [0, 3900];
	npcData['Blauwaldwurm'] = [0, 30];
	npcData['Blitzeiskuppel'] = [0, 3];
	npcData['Blumenbeißer'] = [0, 7];
	npcData['Blutameise'] = [0, 1];
	npcData['Blutapfelbaum'] = [0, 12500];
	npcData['Blutblatt'] = [0, 1];
	npcData['Blutblob'] = [0, 1600];
	npcData['Blutende Lianenschlinge'] = [0, 5];
	npcData['Blutforsch'] = [0, 2];
	npcData['Blutgeflecht'] = [0, 0];
	npcData['Blutharzgeschoss'] = [0, 68121];
	npcData['Blutharzregen'] = [0, 961];
	npcData['Blutharztropfen'] = [0, 1];
	npcData['Blutige Peitschenliane'] = [0, 6500];
	npcData['Blutiges Schaf'] = [0, 5];
	npcData['Blutkrähe'] = [0, 1024];
	npcData['Blutkäfer'] = [0, 4];
	npcData['Blutprobenwesen'] = [0, 0];
	npcData['Blutrabe'] = [0, 484];
	npcData['Blutresistenz-NPC'] = [0, 0];
	npcData['Blutspinne'] = [0, 4];
	npcData['Blutspinnennetz'] = [0, 9];
	npcData['Blutwanze'] = [0, 9];
	npcData['Blutwurm'] = [0, 18];
	npcData['Bockiger Stier'] = [0, 0];
	npcData['Borkende Blutbirke'] = [0, 0];
	npcData['Borstenfisch'] = [0, 20];
	npcData['Brennendes Schaf'] = [0, 5];
	npcData['Bruder des Nebelbesens'] = [0, 15];
	npcData['Brummkäfer'] = [0, 10];
	npcData['Brutaler Fallensteller'] = [0, 135000];
	npcData['Brznkk Gttsnz'] = [0, 5000];
	npcData['Bulliges Erd-Skelkos'] = [0, 300];
	npcData['Busch-Frul'] = [0, 55];
	npcData['Bücherwurm'] = [0, 5];
	npcData['Chiup-Vogel'] = [0, 15];
	npcData['Crim Garaank'] = [0, 10000];
	npcData['Deckenkleiber'] = [0, 10];
	npcData['Denkender Lavablob'] = [0, 7000];
	npcData['Dicke, fette Strandkrabbe'] = [0, 20];
	npcData['Dicker Zukuvogel'] = [0, 15];
	npcData['Dickhäutiger Goldballenwurm'] = [0, 180];
	npcData['Dickhäutiger Graustein-Bär'] = [0, 68];
	npcData['Diebstahlfalle '] = [0, 100];
	npcData['Diebstahlfallen-Verwalter'] = [0, 10000];
	npcData['Diener des Feuers'] = [0, 20000];
	npcData['Diener von Beispieluser'] = [0, 0];
	npcData['Dilinug'] = [0, 2];
	npcData['Donnersandschlange'] = [0, 60];
	npcData['Donnerstier'] = [0, 180];
	npcData['Doppelköpfiger Riesenskorpion'] = [0, 100];
	npcData['Dradonfalter'] = [0, 60];
	npcData['Dreiköpfige Wasserschlange'] = [0, 10000];
	npcData['Dreiäugiger Stier'] = [0, 3];
	npcData['Duftendes Grünschleimwesen'] = [0, 90000];
	npcData['Dummer Lavablob'] = [0, 15];
	npcData['Dunbrakatze'] = [0, 20];
	npcData['Dunkelgrottenpilz'] = [0, 120];
	npcData['Dunkelmorin'] = [0, 80000];
	npcData['Dunkelmorin-Skelett'] = [0, 45000];
	npcData['Dunkelsand-Schmetterling'] = [0, 50];
	npcData['Dunkelsandkrebs'] = [0, 250];
	npcData['Dunkelschlamm-Wurm'] = [0, 3000];
	npcData['Dunkelsee-Qualle'] = [0, 250];
	npcData['Dunkelstern-Arbeiter'] = [0, 30];
	npcData['Dunkelstern-Krieger'] = [0, 70];
	npcData['Dunkelstern-Magier'] = [0, 100];
	npcData['Dunkelstern-Seher'] = [0, 40000];
	npcData['Dunkelwald-Skelett'] = [0, 400000];
	npcData['Dunkelwanze'] = [0, 20];
	npcData['Dunkle Sandratte'] = [0, 7];
	npcData['Dunkler Matschreißer'] = [0, 10000];
	npcData['Dunkler Sandtaprap'] = [0, 700];
	npcData['Dunkler Schamane'] = [0, 180];
	npcData['Durchgedrehter Felsenschreier'] = [0, 46000];
	npcData['Durstige Riesenlibelle'] = [0, 10];
	npcData['Dämonenhund'] = [0, 2000];
	npcData['Dämonisches Grünschleimwesen'] = [0, 90000];
	npcData['Ein Schwarm Blutkrähen'] = [0, 10000];
	npcData['Eine Schar Blutraben'] = [0, 59049];
	npcData['Einflügler'] = [0, 60000];
	npcData['Einsamer Schneehase'] = [0, 8];
	npcData['Einsamer Waldhüpfer'] = [0, 20];
	npcData['Einäugiger Stier'] = [0, 12];
	npcData['Eisbohrmaschine'] = [0, 90];
	npcData['Eisbohrmaschine-Prototyp'] = [0, 90];
	npcData['Eisschleimgrünling'] = [0, 0];
	npcData['Eisvogel'] = [0, 60];
	npcData['Eiswelt-Echse'] = [0, 10000];
	npcData['Eiswurm'] = [0, 40];
	npcData['Ektofron'] = [0, 5000];
	npcData['Energetischer Falter'] = [0, 25];
	npcData['Energiewurm'] = [0, 40];
	npcData['Enorme Stachelschildkröte'] = [0, 350000];
	npcData['Enormer Graustein-Bär'] = [0, 0];
	npcData['Entflohener Mörder'] = [0, 9000];
	npcData['Entlaufene Geisterschabe'] = [0, 17];
	npcData['Entspannte Flachassel'] = [0, 25];
	npcData['Erd-Skelkos'] = [0, 300];
	npcData['Erdfisch'] = [0, 25];
	npcData['Erdkäfer'] = [0, 2];
	npcData['Erdschlurch'] = [0, 13];
	npcData['Erdvogel'] = [0, 50];
	npcData['Erfahrener Frostwolf'] = [1540, 840000];
	npcData['Erfrorenes Schaf'] = [0, 5];
	npcData['Erschöpfte Klauenratte'] = [0, 7];
	npcData['Ertrinkender Energiewurm'] = [0, 40];
	npcData['Exil-Nomade'] = [0, 50];
	npcData['Exotischer Fisch'] = [0, 5];
	npcData['Experimental-Phasenwesen'] = [0, 1234567890];
	npcData['Explosionsfalle '] = [0, 100];
	npcData['Explosiver Tempelschleim'] = [0, 19];
	npcData['Fahrender Händler'] = [0, 1000];
	npcData['Fallensteller'] = [0, 90];
	npcData['Feldhase'] = [0, 2];
	npcData['Felsenechse'] = [0, 60];
	npcData['Felsenkrabbler'] = [0, 76450];
	npcData['Felsenkriecher'] = [332, 648000];
	npcData['Felsenschreier'] = [0, 1];
	npcData['Felsenwurm'] = [0, 20];
	npcData['Feuergeist'] = [0, 3000];
	npcData['Feuerlaub-Echse'] = [0, 70];
	npcData['Feuerlurch'] = [0, 150];
	npcData['Feuervogel'] = [0, 3000];
	npcData['Feuerwachtel'] = [0, 4000];
	npcData['Feuerwolf'] = [0, 9];
	npcData['Feueröl-Händler'] = [0, 1000];
	npcData['Finstereis-Bewacher'] = [0, 100];
	npcData['Flachassel'] = [0, 25];
	npcData['Flammendes Glühwürmchen'] = [0, 2];
	npcData['Flammenwurm'] = [0, 15];
	npcData['Flecken-Wolf'] = [0, 18];
	npcData['Fleckfarbenfisch'] = [0, 800];
	npcData['Fleischfressende Sao-Pflanze'] = [0, 20];
	npcData['Fleißiges Lichtwesen'] = [0, 155];
	npcData['Fliegende Kuh'] = [0, 3];
	npcData['Fliegende Nebelkugel'] = [0, 200];
	npcData['Fliegender Todesfarn'] = [0, 28000];
	npcData['Flimmernde Farbanomalie'] = [0, 1000];
	npcData['Flinker Bernstein-Falke'] = [0, 54];
	npcData['Flossenflinger'] = [0, 37];
	npcData['Fluktuatives Zauberlabor'] = [0, 1000];
	npcData['Flüstergeist'] = [0, 30];
	npcData['Frierender Schneefisch'] = [0, 7];
	npcData['Frierender Schneekäfer'] = [0, 8];
	npcData['Frierender Schneewurm'] = [0, 35];
	npcData['Frierendes Schneewiesel'] = [0, 2];
	npcData['Frost-Wiesel'] = [0, 150];
	npcData['Frostaugen-Bestie'] = [0, 70];
	npcData['Frostdämon'] = [0, 12000];
	npcData['Frostgeist'] = [0, 250];
	npcData['Frostwolf'] = [781, 280000];
	npcData['Frostwolf-Anführer'] = [2760, 3700000];
	npcData['Frostwolf-Welpe'] = [0, 70];
	npcData['Gardu-Strauchkäfer'] = [0, 8];
	npcData['Gartenschildkröte'] = [0, 3126948];
	npcData['Gefallener Spindelschreiter'] = [0, 15];
	npcData['Gefallenes Lichtwesen'] = [0, 2000];
	npcData['Gefleckte Riesenlibelle'] = [0, 35];
	npcData['Gefrässiger Schattensalamander'] = [0, 3200];
	npcData['Gefräßige Schotterraupe'] = [0, 40];
	npcData['Gefährliches Tier'] = [0, 100000000];
	npcData['Geist der Depressionen'] = [0, 30000];
	npcData['Geist der Finsternis'] = [0, 15];
	npcData['Geist der Welt'] = [0, 40];
	npcData['Geist von Pur Pur'] = [0, 130];
	npcData['Geister-Undaron'] = [0, 5];
	npcData['Geisterschabe'] = [0, 17];
	npcData['Geknickter lebender Ast'] = [0, 15];
	npcData['Gelangweilter Fallensteller'] = [0, 90];
	npcData['Gelbbart-Yeti'] = [0, 2200];
	npcData['Gelbkatze'] = [0, 3];
	npcData['Gemeiner Unterwelt-Dämon'] = [0, 3000];
	npcData['Gepanzertes Undaron'] = [0, 80];
	npcData['Gepforn'] = [0, 20];
	npcData['Geröllschlange'] = [23, 2200];
	npcData['Geröllwiesenschlange'] = [0, 17];
	npcData['Geschwächter Abgesandter'] = [0, 300];
	npcData['Geschwächtes Kaklatron'] = [0, 7];
	npcData['Geysir-Schlucker'] = [0, 200000];
	npcData['Giftbeißer'] = [0, 45];
	npcData['Giftfalle '] = [0, 100];
	npcData['Giftgeist von Narubia'] = [0, 17000];
	npcData['Giftgrabl'] = [0, 100];
	npcData['Giftiger Saugfisch'] = [0, 18];
	npcData['Giftschleimer'] = [0, 70];
	npcData['Giftsporenpilz'] = [0, 24];
	npcData['Gigantische Glasglocke'] = [0, 25];
	npcData['Gigantischer Spindelschreiter'] = [0, 225000];
	npcData['Gigantischer Staubgeist'] = [0, 1080000];
	npcData['Gigantischer Todesläufer'] = [0, 180000];
	npcData['Gipfellöwe'] = [0, 1538000];
	npcData['Glaswasserfisch'] = [0, 150];
	npcData['Gletscherente'] = [0, 10];
	npcData['Glibbriger Eiswurm'] = [0, 40];
	npcData['Glitschige Dunkelsee-Qualle'] = [0, 194];
	npcData['Glutlichtfalter'] = [0, 15951];
	npcData['Glutschleim '] = [0, 147000];
	npcData['Glutschleimtropfen'] = [0, 50];
	npcData['Glypra'] = [0, 350];
	npcData['Glypra-Spion'] = [0, 15];
	npcData['Glypra-Späher'] = [0, 350];
	npcData['Glühende Staubechse'] = [0, 30000];
	npcData['Glühwürmchen'] = [0, 2];
	npcData['Goldballenwurm'] = [0, 40];
	npcData['Goldener Flutentaucher'] = [0, 777777];
	npcData['Goldener Undaronwächter'] = [0, 11428];
	npcData['Goldenes Tor'] = [0, 30];
	npcData['Goldfadenwurm'] = [0, 18];
	npcData['Goldflossenfisch'] = [0, 17];
	npcData['Goldhornziege'] = [0, 1];
	npcData['Goldkiste'] = [0, 1000];
	npcData['Goldkrake'] = [0, 8000];
	npcData['Goldkrebs'] = [0, 12];
	npcData['Goldkuh'] = [0, 30];
	npcData['Goldwurm'] = [0, 40];
	npcData['Goldwächter'] = [0, 300];
	npcData['Grabfliege'] = [0, 7];
	npcData['Grabgeist der vermissten Toten'] = [0, 140];
	npcData['Grabräuber'] = [0, 120];
	npcData['Grabschlecker'] = [0, 50];
	npcData['Grabwurm'] = [0, 18];
	npcData['Grafrather Stechmückenschwarm'] = [0, 1];
	npcData['Grasblatt-Schlange'] = [0, 55];
	npcData['Graswiesenschlange'] = [0, 17];
	npcData['Gratrat-Alien'] = [0, 800];
	npcData['Graubartechse'] = [0, 6];
	npcData['Graugoldfalter'] = [0, 18];
	npcData['Graustein-Bär'] = [0, 4800];
	npcData['Grottenschlange'] = [0, 32000];
	npcData['Großer Blattalisk'] = [0, 10000];
	npcData['Großer Bohnenschnapper'] = [0, 18];
	npcData['Großer Erdkäfer'] = [0, 20];
	npcData['Großer Laubbär'] = [0, 2600];
	npcData['Großer Lava-Käfer'] = [0, 120];
	npcData['Großer Nebelkreischer'] = [0, 400000];
	npcData['Großer Phasenvogel'] = [0, 380000];
	npcData['Großer Prärieskorpion'] = [0, 1000];
	npcData['Großer Schatten der Dunkelheit'] = [0, 85000];
	npcData['Großer Wurzelwurm'] = [0, 150];
	npcData['Großes Eistentakel'] = [0, 20000];
	npcData['Grunulum'] = [0, 40];
	npcData['Grünbaum-Affe'] = [0, 4000];
	npcData['Grüne Rotorlibelle'] = [0, 50000];
	npcData['Grünes Stachel-Kowu'] = [0, 5000];
	npcData['Grünschimmer-Ameise'] = [0, 260];
	npcData['Gurdz-Beerenstrauch'] = [0, 28];
	npcData['Hangstelzer'] = [0, 6500];
	npcData['Harmloser Giftsporenpilz'] = [0, 24];
	npcData['Hase'] = [0, 2];
	npcData['Heilender Baum '] = [0, 90];
	npcData['Herrscher der eisigen Dämonen'] = [0, 25000];
	npcData['Herz des Blutwaldes'] = [0, 400000];
	npcData['Hinterlistiger Stororaptor'] = [710, 551000];
	npcData['Holz-Maus'] = [0, 7];
	npcData['Holzplatten-Schildkröte'] = [0, 45];
	npcData['Hornrücken'] = [0, 10];
	npcData['Hulnodar-Heiler'] = [0, 80];
	npcData['Hulnodar-Kiste'] = [0, 1000];
	npcData['Hulnodar-Wächter'] = [0, 250];
	npcData['Hundertfüßiger Dilinug'] = [0, 2];
	npcData['Hyperaktiver Waldhüpfer'] = [0, 480000];
	npcData['Hyäne'] = [0, 13];
	npcData['Höhlenbär'] = [0, 170];
	npcData['Höhlenmensch'] = [0, 35];
	npcData['Insel-Schnapper'] = [0, 40];
	npcData['Itolos-Schrecke'] = [0, 30];
	npcData['Jerodar-Anführer'] = [0, 150000];
	npcData['Jerodar-Dieb'] = [0, 15];
	npcData['Jerodar-Erdwühler'] = [0, 15];
	npcData['Jerodar-Kiste'] = [0, 1000];
	npcData['Jerodar-Lehrling'] = [0, 15];
	npcData['Junger Abgesandter'] = [0, 40];
	npcData['Junger Giftgrabl'] = [0, 100];
	npcData['Junger Graustein-Bär'] = [0, 100];
	npcData['Junger Schatten der Dunkelheit'] = [0, 25];
	npcData['Junger Stororaptor'] = [0, 330];
	npcData['Junger Strativar'] = [0, 150];
	npcData['Kaklatron'] = [0, 7];
	npcData['Kanal-Krake'] = [0, 10];
	npcData['Kanalqualle'] = [0, 10000];
	npcData['Kastanienträne'] = [0, 0];
	npcData['Kellerkiste'] = [0, 1000];
	npcData['Kiste der Festung'] = [0, 1000];
	npcData['Kiste des Auftragshauses'] = [0, 100];
	npcData['Kiste des Seemanns'] = [0, 1000];
	npcData['Klapperschlange'] = [0, 8];
	npcData['Klauenbartrein'] = [0, 2000];
	npcData['Klauenratte'] = [0, 7];
	npcData['Kleine Blutratte'] = [0, 4];
	npcData['Kleine Blutweide'] = [0, 65536];
	npcData['Kleine Farbanomalie'] = [0, 25];
	npcData['Kleine Grottenschlange'] = [0, 120];
	npcData['Kleine Luftschnecke'] = [0, 6];
	npcData['Kleine Spinne'] = [0, 25];
	npcData['Kleine Stachelmade'] = [0, 1];
	npcData['Kleiner Hüpfstein'] = [0, 8];
	npcData['Kleiner Laubbär'] = [0, 20];
	npcData['Kleiner Nebelkreischer'] = [0, 60];
	npcData['Kleiner Phasenbär'] = [0, 25];
	npcData['Kleiner Spindelschreiter'] = [0, 12];
	npcData['Kleiner Steingolem'] = [0, 160];
	npcData['Kleiner Waldschlurch'] = [0, 15];
	npcData['Kleines Haus-Schaf'] = [0, 5];
	npcData['Kleines Reen'] = [0, 10];
	npcData['Kleines Schaf'] = [0, 5];
	npcData['Kleines Schlangentier'] = [0, 8];
	npcData['Knochenpilz'] = [0, 5];
	npcData['Knochensammler'] = [0, 55];
	npcData['Knorpel-Monster aus Draht '] = [0, 3000];
	npcData['Knorrige Wurzel'] = [0, 1681];
	npcData['Knunglo'] = [0, 120];
	npcData['Knurrender Goldballenwurm'] = [0, 15000];
	npcData['Kollektiver Salzhügel'] = [0, 5000];
	npcData['Koloa-Käfer'] = [0, 2];
	npcData['Kopolaspinne'] = [0, 1000];
	npcData['Kraftvoller Sporenträger'] = [0, 98000];
	npcData['Kranke Grottenschlange'] = [0, 2000];
	npcData['Kranke Milchkuh'] = [0, 3];
	npcData['Kranker Todesläufer'] = [0, 30];
	npcData['Kranker Wüstensalamander'] = [0, 12];
	npcData['Kreisende Wippschwanzmöwe'] = [0, 3650];
	npcData['Kriechlapf'] = [0, 12];
	npcData['Kristall-Orwane'] = [0, 80];
	npcData['Kristallfisch'] = [0, 6];
	npcData['Kristallwasserpflanze'] = [0, 2000];
	npcData['Krumme Grünschimmer-Ameise'] = [0, 100];
	npcData['Krustenkäfer'] = [0, 12];
	npcData['Kräftiger Graustein-Bär'] = [0, 12800];
	npcData['Kurnotan - der dunkle Magier'] = [0, 500];
	npcData['Lablabkaktus'] = [0, 25];
	npcData['Langfaden-Spinne'] = [0, 25];
	npcData['Langzahnaffe'] = [0, 12];
	npcData['Larafstrauch'] = [0, 10];
	npcData['Larpan'] = [0, 80000];
	npcData['Larvennest'] = [0, 8];
	npcData['Laubwiesenschlange'] = [0, 17];
	npcData['Lava-Echse'] = [0, 20];
	npcData['Lava-Käfer'] = [0, 20];
	npcData['Lava-Wurm'] = [3, 20];
	npcData['Lawinengeist'] = [0, 250];
	npcData['Lebende Bergspitze'] = [0, 2500];
	npcData['Lebende Mauer'] = [0, 535];
	npcData['Lebende Ruine'] = [0, 300];
	npcData['Lebende Salzstatue'] = [0, 5300];
	npcData['Lebende Statue'] = [0, 240];
	npcData['Lebende Straße'] = [0, 546360000];
	npcData['Lebende Waldwurzel'] = [0, 4000];
	npcData['Lebender Ast'] = [0, 30];
	npcData['Lebender Salzhügel'] = [0, 15];
	npcData['Lebender Steingipfel'] = [0, 875346];
	npcData['Lebender Tropfstein'] = [0, 17000];
	npcData['Lebendes Haus'] = [0, 800000];
	npcData['Lehrlingskiste'] = [0, 1000];
	npcData['Lernfähiger Spindelschreiter'] = [0, 12138];
	npcData['Leuchtende Dunkelsee-Qualle'] = [0, 160000];
	npcData['Lianenechse'] = [0, 10];
	npcData['Lichtpflanze'] = [0, 90];
	npcData['Lichtwurm'] = [0, 30];
	npcData['Lola - Die Hauskawutze'] = [0, 10];
	npcData['Loroktom, der große Steingolem'] = [0, 3000];
	npcData['Magier der dunklen Macht'] = [0, 8000];
	npcData['Der Magier des Schutzes'] = [0, 13];
	npcData['Magische Farbanomalie'] = [0, 7000];
	npcData['Manticore'] = [0, 30];
	npcData['Massive Landqualle'] = [0, 8000];
	npcData['Metallischer Morschgreifer'] = [0, 99];
	npcData['Milchkuh'] = [0, 3];
	npcData['Moorgeist'] = [0, 70];
	npcData['Moosgeflecht'] = [0, 25];
	npcData['Moosschildkröte'] = [0, 33817];
	npcData['Moosspinne'] = [0, 25];
	npcData['Mopfchen'] = [0, 1];
	npcData['Mormdat'] = [0, 10];
	npcData['Morschgreifer'] = [0, 80];
	npcData['Morschwaldaffe'] = [0, 30];
	npcData['Murmelndes Mormdat'] = [0, 10];
	npcData['Mutierte Wolkenblume'] = [0, 6];
	npcData['Mutierter Koloa-Käfer'] = [0, 1000];
	npcData['Mutierter Morschgreifer'] = [0, 800];
	npcData['Mutiges Mormdat'] = [0, 10];
	npcData['Mutter der Geysir-Schlucker'] = [0, 5000];
	npcData['Mächtige Phasenbarriere'] = [0, 90];
	npcData['Mächtiger Propellerstein'] = [0, 500000];
	npcData['Nachtfledermaus'] = [0, 120];
	npcData['Nachtgonk'] = [0, 80];
	npcData['Nachtgonk '] = [0, 80];
	npcData['Nachtgonk im dunklen Haus'] = [0, 40];
	npcData['Nachtschattenraupe'] = [0, 10];
	npcData['Narbiger Schneewurm'] = [0, 35];
	npcData['Naurofbusch'] = [0, 3];
	npcData['Nebelbesen'] = [0, 15];
	npcData['Nebelblume'] = [0, 1];
	npcData['Nebelgeist Argarie'] = [0, 20000];
	npcData['Nebelgeist Bargu'] = [0, 400];
	npcData['Nebelgeist Frorie'] = [0, 5000];
	npcData['Nebelgeist Girie'] = [0, 300];
	npcData['Nebelgeist Murahn'] = [0, 30];
	npcData['Nebelgeist Napirie'] = [0, 500];
	npcData['Nebelgeist Nukarie'] = [0, 500000];
	npcData['Nebelgeist Sorlie'] = [0, 600];
	npcData['Nebelgeist Viginur'] = [0, 6000];
	npcData['Nebelgeist Wrozie'] = [0, 800];
	npcData['Nebelhüpfer'] = [0, 15];
	npcData['Nebelkrebs'] = [0, 150];
	npcData['Nebelkreischer'] = [0, 250];
	npcData['Nebelkrähe'] = [0, 20];
	npcData['Nebelkröte'] = [0, 2];
	npcData['Nebelschleimer'] = [0, 500];
	npcData['Nebelschnecke'] = [0, 15];
	npcData['Nebelwesen'] = [0, 100];
	npcData['Nebelwiesel'] = [0, 2];
	npcData['Nebelwolf'] = [0, 5000];
	npcData['Nomade'] = [0, 50];
	npcData['Norpi'] = [0, 60];
	npcData['Onlo-Skelett'] = [0, 300];
	npcData['Ontolon'] = [0, 540];
	npcData['Onuk Kulo'] = [0, 10101];
	npcData['Panzerrochen'] = [0, 18000];
	npcData['Parfugurn'] = [0, 15000];
	npcData['Peitschende Blutliane'] = [0, 14000];
	npcData['Pfeilschnecke'] = [0, 150];
	npcData['Phasenassel'] = [0, 45];
	npcData['Phasenbarriere'] = [0, 30];
	npcData['Phasenenergiefalle '] = [0, 100];
	npcData['Phasenfalter'] = [0, 45000];
	npcData['Phasenfuchs'] = [0, 61];
	npcData['Phasengeier'] = [0, 90];
	npcData['Phasengreifer'] = [0, 3500];
	npcData['Phasenhummer'] = [0, 260000];
	npcData['Phasenkiste'] = [0, 1000];
	npcData['Phasenkrake'] = [0, 39000];
	npcData['Phasenkrebs'] = [0, 25];
	npcData['Phasenkrokodil'] = [0, 160];
	npcData['Phasenkuh'] = [0, 15];
	npcData['Phasenlibelle'] = [0, 41];
	npcData['Phasenlurch'] = [0, 27];
	npcData['Phasenmade'] = [0, 35];
	npcData['Phasenmücke'] = [0, 18];
	npcData['Phasenportal'] = [0, 1000];
	npcData['Phasenqualle'] = [0, 950000];
	npcData['Phasenratte'] = [0, 10];
	npcData['Phasenraupe'] = [0, 350];
	npcData['Phasensalamander'] = [0, 26];
	npcData['Phasenschabe'] = [0, 18];
	npcData['Phasenschaf'] = [0, 12];
	npcData['Phasenschildkröte'] = [0, 540000];
	npcData['Phasenschlamm'] = [0, 20];
	npcData['Phasenschlange'] = [0, 80];
	npcData['Phasenschleim'] = [0, 36];
	npcData['Phasenschnecke'] = [0, 55];
	npcData['Phasenseestern'] = [0, 85000];
	npcData['Phasenskelkos'] = [0, 10000];
	npcData['Phasenskorpion'] = [0, 23000];
	npcData['Phasenspinne'] = [0, 320];
	npcData['Phasentiger'] = [0, 5300];
	npcData['Phasenverbrenner'] = [0, 15000];
	npcData['Phasenvogel'] = [0, 13];
	npcData['Phasenwiesel'] = [0, 8];
	npcData['Phasenwolf'] = [0, 630];
	npcData['Phasenwurm'] = [0, 30];
	npcData['Pilzwachtel'] = [0, 3];
	npcData['Pironer'] = [0, 10000];
	npcData['Plätscherfluss-Krokodil'] = [0, 112000];
	npcData['Polarisations-Otter'] = [0, 300];
	npcData['Portal '] = [0, 100];
	npcData['Portal des Feuers'] = [0, 10];
	npcData['Portal des Wassers'] = [0, 10];
	npcData['Portal in die Unterwelt'] = [0, 100];
	npcData['Portalstab '] = [0, 100];
	npcData['Portalstab-Anbeter'] = [0, 250];
	npcData['Propellerstein'] = [0, 90];
	npcData['Quellschleim'] = [0, 25];
	npcData['Randalierer'] = [0, 80];
	npcData['Reen'] = [0, 50];
	npcData['Reicher Wüstensalamander'] = [0, 12];
	npcData['Reisender Fallensteller'] = [0, 90];
	npcData['Resistenter Schatten'] = [0, 244];
	npcData['Resistenter Stachelschuss-Igel'] = [0, 269];
	npcData['Riesenfalter-Kokon'] = [0, 5];
	npcData['Riesenhornisse'] = [0, 100];
	npcData['Riesenlibelle'] = [0, 10];
	npcData['Riesige Gift-Dschungelschlange'] = [0, 100];
	npcData['Riesige Landmuschel'] = [0, 9000];
	npcData['Riesige Schattenfledermaus'] = [0, 400];
	npcData['Rindenhagel'] = [0, 25600];
	npcData['Rindenwalze'] = [0, 0];
	npcData['Ringraupe'] = [0, 10];
	npcData['Robuster Morschgreifer'] = [0, 104];
	npcData['Robuster Spindelschreiter'] = [0, 0];
	npcData['Rotbandwurm'] = [0, 2000];
	npcData['Rote Landkoralle'] = [0, 100];
	npcData['Rote Riesenlibelle'] = [0, 15];
	npcData['Rote Steinspinne'] = [0, 10];
	npcData['Roteiskoralle'] = [0, 12000];
	npcData['Roter Baumkuschler'] = [0, 70];
	npcData['Roter Felswurm'] = [0, 30];
	npcData['Roter Sandhund'] = [0, 160];
	npcData['Rotfell-Reh'] = [0, 32000];
	npcData['Rotfell-Rehkitz'] = [0, 35];
	npcData['Rotpunkt-Tiger'] = [0, 200];
	npcData['Rotschimmer-Ameise'] = [4200, 890000];
	npcData['Rotzahnhai'] = [0, 70];
	npcData['Rubinroter Waldgeist'] = [0, 1895760];
	npcData['Ruinen-Wurm'] = [0, 6];
	npcData['Ruinenschleicher'] = [0, 30];
	npcData['Röhrenkrebs'] = [0, 90];
	npcData['Saftende Itolos-Schrecke'] = [0, 111];
	npcData['Salz-Maus'] = [0, 7];
	npcData['Salzfleckensalamander'] = [0, 3700];
	npcData['Salzpicker-Vogel'] = [0, 20];
	npcData['Salzsüchtiger Staubschleifer'] = [0, 35];
	npcData['Salzwasservogel'] = [0, 20];
	npcData['Sandalin'] = [0, 40];
	npcData['Sandechse'] = [0, 7];
	npcData['Sandfresserwurm'] = [0, 70];
	npcData['Sandgeist'] = [0, 20];
	npcData['Sandgolem'] = [0, 26];
	npcData['Sandiger Wirbelwind'] = [0, 7000];
	npcData['Sandvogel'] = [0, 80];
	npcData['Saugfisch'] = [0, 16];
	npcData['Savannen-Vogel'] = [0, 12];
	npcData['Schachtelmesserfarn'] = [0, 700];
	npcData['Schaf'] = [0, 10];
	npcData['Schatten der Dunkelheit'] = [0, 180];
	npcData['Schatten des Weltenwandlers'] = [0, 121];
	npcData['Schatten-Ei'] = [0, 8000];
	npcData['Schattenkreatur Gortari'] = [0, 30000];
	npcData['Schattenkreatur Jalakori'] = [0, 30000];
	npcData['Schattenkreatur Mantori'] = [0, 20000];
	npcData['Schattenkreatur Turwakori'] = [0, 30000];
	npcData['Schattenkreatur XY '] = [0, 1];
	npcData['Schattenkrokodil'] = [0, 3000];
	npcData['Schattenmoos'] = [0, 60];
	npcData['Schattensalamander'] = [0, 3200];
	npcData['Schattenwesen'] = [0, 10];
	npcData['Schattenwiesel'] = [0, 2];
	npcData['Schattenwolf'] = [0, 20];
	npcData['Schatzsucher '] = [0, 2000];
	npcData['Schaufelmaulwurf'] = [0, 150];
	npcData['Schillernder Küstling'] = [0, 62];
	npcData['Schimmerstein'] = [0, 57];
	npcData['Schlammkaktus'] = [0, 800];
	npcData['Schleimgreifer'] = [0, 0];
	npcData['Schleimraupe'] = [0, 180];
	npcData['Schleuderfalle '] = [0, 100];
	npcData['Schlingende Lianenpeitsche'] = [0, 5000];
	npcData['Schlurum'] = [0, 250];
	npcData['Schmatzende Blattspinne'] = [0, 25];
	npcData['Schmerzfalle '] = [0, 100];
	npcData['Schmerzstein'] = [0, 19];
	npcData['Schmieriger Geschäftemacher'] = [0, 350];
	npcData['Schneefisch'] = [0, 7];
	npcData['Schneehase'] = [0, 8];
	npcData['Schneehuhn'] = [0, 2];
	npcData['Schneekäfer'] = [0, 8];
	npcData['Schneekäfer-Kokon'] = [0, 8];
	npcData['Schneekäfer-Raupe'] = [0, 8];
	npcData['Schneesturmgeist'] = [0, 16000];
	npcData['Schneewiesel'] = [0, 2];
	npcData['Schneeworan'] = [0, 200];
	npcData['Schneewurm'] = [0, 35];
	npcData['Schnelle Bernstein-Raupe'] = [0, 49];
	npcData['Schneller Stachelsprungkrebs'] = [0, 3132800];
	npcData['Schneller Steinmolch'] = [0, 120];
	npcData['Schneller Stororaptor'] = [0, 124];
	npcData['Schneller Tempelkrabbler'] = [0, 50];
	npcData['Schnelles Tonar-Reptil'] = [0, 84];
	npcData['Schnellflatter-Schmetterling'] = [0, 0];
	npcData['Schotterraupe'] = [0, 40];
	npcData['Schotterwurm'] = [0, 10];
	npcData['Schwacher Sporenträger'] = [0, 10];
	npcData['Schwacher Unterwelt-Dämon'] = [14, 280];
	npcData['Schwaches Stachelkrokodil'] = [0, 121];
	npcData['Schwangeres Schneehuhn'] = [0, 2];
	npcData['Schwarze Keitel-Spinne'] = [0, 18];
	npcData['Schwarzeisenbarrikade'] = [0, 20];
	npcData['Schwarzwespen'] = [0, 40];
	npcData['Schwebende Goldkutsche'] = [0, 5000];
	npcData['Schwimmendes Tentakel'] = [0, 40];
	npcData['Schwächefalle '] = [0, 100];
	npcData['Seeschlamm'] = [0, 100];
	npcData['Seichtwasserpilz'] = [0, 70];
	npcData['Seltsames Tier'] = [0, 2];
	npcData['Serbanthi'] = [0, 90];
	npcData['Seuchenflügler'] = [0, 4];
	npcData['Siedestein-Dampfgeist'] = [0, 8000];
	npcData['Siedestein-Morschgreifer'] = [0, 30000];
	npcData['Siedesteinkäfer'] = [0, 40];
	npcData['Silberfluss-Bär'] = [0, 300];
	npcData['Silberfuchs'] = [0, 8];
	npcData['Silbergras-Spinne'] = [0, 10];
	npcData['Silberstein-Salamander'] = [0, 12];
	npcData['Silberwurmhaufen'] = [0, 25];
	npcData['Silfin'] = [0, 320];
	npcData['Siramücken-Schwarm'] = [0, 12000];
	npcData['Sohn des Wiesengeistes'] = [0, 800];
	npcData['Solarda-Fisch'] = [0, 20];
	npcData['Spezialist für Erze'] = [0, 100];
	npcData['Spindelschreiter'] = [0, 1500];
	npcData['Spindelschreiter-Überwacher'] = [0, 10000];
	npcData['Spinne der Staubnetze'] = [0, 5000];
	npcData['Sporenträger'] = [0, 40];
	npcData['Sporling'] = [0, 5];
	npcData['Sprungechse'] = [0, 7];
	npcData['Spröder Ast'] = [0, 9];
	npcData['Sprühregenwurm'] = [0, 25];
	npcData['Stabfisch'] = [0, 7];
	npcData['Stabkrebs'] = [0, 18];
	npcData['Stabschrecke'] = [0, 70];
	npcData['Stachelblutdickicht'] = [0, 42025];
	npcData['Stachelfisch'] = [0, 20];
	npcData['Stachelkrokodil'] = [0, 71000];
	npcData['Stachelkäfer'] = [0, 25];
	npcData['Stachelschildkröte'] = [0, 79000];
	npcData['Stachelschreck'] = [0, 80];
	npcData['Stachelsprungkrebs'] = [0, 3000];
	npcData['Starrfalle '] = [0, 100];
	npcData['Staub-Maus'] = [0, 7];
	npcData['Staub-Skelett'] = [0, 50];
	npcData['Staubassel'] = [0, 25];
	npcData['Staubflatterer'] = [0, 10];
	npcData['Staubgeist'] = [0, 800];
	npcData['Staubige Pilzwachtel'] = [0, 3];
	npcData['Staubkrieger'] = [0, 200000];
	npcData['Staubschleifer'] = [0, 35];
	npcData['Staubschleifer-Königin'] = [0, 12000];
	npcData['Stechmücken'] = [0, 15];
	npcData['Stegovar'] = [0, 17];
	npcData['Stein-Koloss'] = [0, 50000];
	npcData['Stein-Skelkos'] = [0, 120];
	npcData['Stein-Tentakel'] = [0, 40];
	npcData['Steingolem'] = [0, 320];
	npcData['Steinhuhn'] = [0, 30];
	npcData['Steinkatze'] = [0, 3];
	npcData['Steinkraller'] = [0, 18400];
	npcData['Steinkratzkäfer'] = [0, 25];
	npcData['Steinkäfer'] = [0, 20];
	npcData['Steinmolch'] = [0, 40];
	npcData['Steinpicker-Vogel'] = [0, 20];
	npcData['Steinschalenkäfer'] = [0, 1200];
	npcData['Steinschutt'] = [0, 20];
	npcData['Steinspinne'] = [0, 10];
	npcData['Steppenwolf'] = [0, 10];
	npcData['Stepto-Waran'] = [0, 152];
	npcData['Sterbliche Waldratte'] = [0, 7];
	npcData['Sternenzerstörer'] = [0, 60000];
	npcData['Stolperfalle '] = [0, 100];
	npcData['Stororaptor'] = [0, 68000];
	npcData['Strandlokil'] = [0, 90];
	npcData['Strauchkäfer'] = [0, 8];
	npcData['Störrischer Stororaptor'] = [0, 25000];
	npcData['Sula-Echse'] = [0, 30000];
	npcData['Sumpflandkröte'] = [0, 15];
	npcData['Sumpfschrecke'] = [0, 170];
	npcData['Sumpfspinne'] = [0, 20];
	npcData['Südmeer-Tucan'] = [0, 2];
	npcData['Teidam'] = [0, 50];
	npcData['Tempelhüpfer'] = [0, 25];
	npcData['Tempelhüter'] = [0, 4000];
	npcData['Tempelkrabbler'] = [0, 18];
	npcData['Tempelschatz'] = [0, 1000];
	npcData['Tempelwächter'] = [0, 12000];
	npcData['Temporaler Falter'] = [0, 35];
	npcData['Tentakel'] = [0, 40];
	npcData['Tentakel aus Gold'] = [0, 40];
	npcData['Tentakel-Skelkos'] = [0, 400];
	npcData['Thorom Logrid'] = [0, 50];
	npcData['Tiefsee-Aal'] = [0, 90];
	npcData['Tilua-Pflanze'] = [0, 200000];
	npcData['Todesflossen-Fisch'] = [0, 500000];
	npcData['Todesmoor-Krokodil'] = [0, 90];
	npcData['Tolloschein-Fresser'] = [0, 25];
	npcData['Tollwütiger Graustein-Bär'] = [0, 25000];
	npcData['Tonar-Reptil'] = [0, 130000];
	npcData['Tote Bergspitze'] = [0, 10200];
	npcData['Tote Kuh'] = [0, 1];
	npcData['Totes Wawruz'] = [0, 10];
	npcData['Transparenter Schatten'] = [0, 239];
	npcData['Triefender Wandschleim'] = [0, 40];
	npcData['Trockenwurm'] = [0, 10];
	npcData['Tropfsteinwandler'] = [0, 150];
	npcData['Tropfsteinwurm'] = [0, 20];
	npcData['Turmgeist'] = [0, 5000];
	npcData['Tänzerin von Beispieluser'] = [0, 40];
	npcData['Umnebeltes Schlangentier'] = [0, 8];
	npcData['Unbekannter Affe'] = [0, 80];
	npcData['Undaron'] = [0, 1];
	npcData['Unsterbliche Waldratte'] = [0, 7];
	npcData['Unterwelt-Dämon'] = [240, 55000];
	npcData['Untoter Bürger'] = [0, 200];
	npcData['Untoter Bürgermeister'] = [0, 21000];
	npcData['Untoter Winterbürger'] = [0, 200];
	npcData['Unverwüstliches Undaron'] = [0, 0];
	npcData['Uralte Bluteiche'] = [0, 2238016];
	npcData['Uralter Unterwelt-Dämon'] = [2300, 650000];
	npcData['Urwaldkuh'] = [0, 3];
	npcData['Urwaldschnecke'] = [0, 40];
	npcData['Vater aller Stachelschuss-Igel'] = [0, 18000];
	npcData['Verirrter Aasgeier'] = [0, 10];
	npcData['Verirrter Tempelschleim'] = [0, 19];
	npcData['Verrosteter Wächtergolem'] = [0, 20];
	npcData['Verrückter Frostdämon'] = [0, 12000];
	npcData['Verschneites Geröllwiesel'] = [0, 2];
	npcData['Verstümmelter Morschgreifer'] = [0, 35];
	npcData['Verstümmeltes Holzmonster'] = [0, 72000];
	npcData['Vertin'] = [0, 10080];
	npcData['Vertrockneter Seichtwasserpilz'] = [0, 70];
	npcData['Verwehter Sandgeist'] = [0, 20];
	npcData['Verwirrtes Schaf'] = [0, 5];
	npcData['Verwirrtes Sägezahnblatt'] = [0, 3000000];
	npcData['Verwundete Nebelmaus'] = [0, 7];
	npcData['Verzauberte Nachtfledermaus'] = [0, 56213];
	npcData['Verzauberter Energiewurm'] = [0, 40];
	npcData['Vorhof-Koordinator'] = [0, 160];
	npcData['Vulkandämon'] = [0, 5000];
	npcData['Wachsamer Frostwolf'] = [0, 199];
	npcData['Wachsende Efeuranke'] = [0, 9305];
	npcData['Wahnsinniger Waldschlurch'] = [0, 120];
	npcData['Waldhüpfer'] = [0, 200];
	npcData['Waldmonster'] = [0, 500];
	npcData['Waldratte'] = [0, 7];
	npcData['Waldschlurch'] = [0, 15];
	npcData['Waldschlurch-Skelett'] = [0, 21];
	npcData['Waldspinne'] = [0, 25];
	npcData['Waldvogel'] = [0, 10];
	npcData['Wandelnde Blutesche'] = [0, 603729];
	npcData['Wandelnder Laubbaum'] = [0, 6000];
	npcData['Wandschleim'] = [0, 40];
	npcData['Wasser-Schemen'] = [0, 300000];
	npcData['Wasserbär'] = [0, 35];
	npcData['Wasserkatze'] = [0, 3];
	npcData['Wasserschlange'] = [0, 8];
	npcData['Wassertentakel'] = [0, 60];
	npcData['Wawruz'] = [0, 10];
	npcData['Wegelagerer'] = [0, 280];
	npcData['Weinende Kastanie'] = [0, 144];
	npcData['Weiser Ontolon'] = [0, 1800000];
	npcData['Weltenwandler'] = [0, 100000];
	npcData['Weltraum-Krake'] = [0, 200];
	npcData['Wendige Glypra'] = [0, 35];
	npcData['Wetterkontroll-Magier'] = [0, 10000];
	npcData['Wiesenpfeifer'] = [0, 8];
	npcData['Wiesenschrecke'] = [0, 12];
	npcData['Wildwasserkrebs'] = [0, 38500];
	npcData['Windgeist'] = [0, 40];
	npcData['Windgeist '] = [0, 40];
	npcData['Wippschwanzmöwe'] = [0, 3650];
	npcData['Wirbelnder Rindenspeer'] = [0, 8281];
	npcData['Wogenreiter'] = [0, 12248];
	npcData['Wolf der Finsternis'] = [0, 30];
	npcData['Wolkenflatterer'] = [0, 6000];
	npcData['Wolkenkiste'] = [0, 1000];
	npcData['Wolkenschaf'] = [0, 8];
	npcData['Wolliges Goldschaf'] = [0, 5];
	npcData['Wuchernde Efeuranke'] = [0, 80];
	npcData['Wucherwurzelbaum '] = [0, 10000];
	npcData['Wurzelkralle'] = [0, 25281];
	npcData['Wurzelnde Blutpeitsche'] = [0, 7056];
	npcData['Wurzelwurm'] = [0, 25];
	npcData['Wächter der Zelle'] = [0, 120];
	npcData['Wächter des Vulkans'] = [0, 200];
	npcData['Wächtergolem'] = [0, 1300];
	npcData['Wühlratte'] = [0, 20];
	npcData['Wüsten-Ektofron'] = [0, 5521];
	npcData['Wüstenkrake'] = [0, 7000];
	npcData['Wüstenmaus'] = [0, 2];
	npcData['Wüstenplankton'] = [0, 7];
	npcData['Wüstensalamander'] = [0, 12];
	npcData['Wüstenschreck'] = [0, 10];
	npcData['Wüstenspinne'] = [0, 7];
	npcData['Wütende Mooswurzel'] = [0, 530];
	npcData['Wütender Stachelkäfer'] = [0, 25];
	npcData['Zauberer der Bergwiesen'] = [0, 300];
	npcData['Zielscheibe '] = [0, 40];
	npcData['Zitternde Mooswurzel'] = [0, 20];
	npcData['Zottelfell-Hirsch'] = [0, 0];
	npcData['Zukuvogel'] = [0, 15];
	npcData['Zweibeinige Waldspinne'] = [0, 25];
	npcData['Zäher Ontolon'] = [0, 265];
	npcData['Zäher Spindelschreiter'] = [0, 0];
	npcData['Zähnefletschender Wachhund'] = [0, 2000];
	npcData['Äonenjäger'] = [0, 132435];
	// NPC Data End
}

// Create NPC data structure objects
var npcData = new Object();
var critSpecialNpc = new Object();
var nonCritSpecialNpc = new Object();

// Start the routine function
routine();