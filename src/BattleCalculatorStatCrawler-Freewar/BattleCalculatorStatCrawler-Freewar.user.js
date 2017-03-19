// ==UserScript==
// @name        BattleCalculatorStatCrawler-Freewar
// @namespace   Zabuza
// @description Tool for the 'BattleCalculator - Freewar' which extracts and saves player stats like lifepoints, attack and defense power.
// @include     *.freewar.de/freewar/internal/item.php*
// @version     1
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @grant       none
// ==/UserScript==

/*
 * Creates a cookie with the given data. If the cookie already exists, it is overriden.
 * @param name The name of the cookie to create
 * @param value The value of the cookie to create
 * @param days The amount of days the cookie should exist until it expires
 */
function createCookie(name, value, days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		var expires = '; expires=' + date.toGMTString();
	} else {
		var expires = '';
	}
	document.cookie = name + '=' + value + expires + '; path=/';
}

/*
 * Checks whether the browser does support webstorage or not.
 * @returns True if it is supported, false if not
 */
function isSupportingWebStorage() {
	return typeof(Storage) !== "undefined";
}

/*
 * Sets the value of the given player stat. The value is saved via webstorage or as cookie.
 * The value must be greater equals 0 else the function will do nothing.
 * @param statName The name of the player stat to set
 * @param value The value of the player stat to set, greater equals 0
 */
function setStatValue(statName, value) {
	var valueAsNumber = parseInt(value);
	
	// Abort if the value is invalid
	if (value == null || value == '' || valueAsNumber < 0) {
		return;
	}
	
	if (isSupportingWebStorage()) {
		// Use webstorage
		localStorage.setItem('freewarBattleCalculatorStat' + statName, valueAsNumber);
	} else {
		// Fall back to cookies
		createCookie('freewarBattleCalculatorStat' + statName, valueAsNumber + '', 365);
	}
}

/*
 * Routine function of the script.
 */
function routine() {
	// Extract player stats from menu and store them
	
	// Extract lifepoints
	var lifepoints = $('p#listrow_lifep span').text();
	setStatValue('Lifepoints', lifepoints);
	
	// Extract attack power
	var attackpower = $('p#listrow_attackp').text().match(/\d+/)[0];
	setStatValue('Attackpower', attackpower);
	
	// Extract defense power
	var defensepower = $('p#listrow_defensep').text().match(/\d+/)[0];
	setStatValue('Defensepower', defensepower);
}

// Start the routine function
routine();