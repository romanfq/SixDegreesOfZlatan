const puppeteer = require('puppeteer');
const readline = require('readline-sync');
const baseUrl = 'http://www.footballsquads.co.uk'


function getLeagueName(country, year) {
   if (country === "eng") {
   			// there's a change of name in footballsquads.co.uk :-(
   		if (year < 2018) { 
   			return "faprem";
   		} else {
   			return "engprem";
   		}
   }
   
   // by default, the league names are fixed by the following table
   const countryToLeagueName = {
	'spain': 'spalali',
	'eng': 'engprem'
   };
   return countryToLeagueName[country];
}

function seasonName(year) {
	return year + "-" + (year + 1);
}

function leagueUrl(country, season, leagueName) {
	return baseUrl + "/" + country + "/" + season + "/" + leagueName + ".htm";
}

function teamUrl(country, season, teamHref) {
	return baseUrl + "/" + country + "/" + season + "/" + teamHref;
}

/**
 * Calculate a 32 bit FNV-1a hash
 * Found here: https://gist.github.com/vaiorabbit/5657561
 * Ref.: http://isthe.com/chongo/tech/comp/fnv/
 *
 * @param {string} str the input value
 * @param {boolean} [asString=false] set to true to return the hash value as 
 *     8-digit hex string instead of an integer
 * @param {integer} [seed] optionally pass the hash of the previous chunk
 * @returns {integer | string}
 */
function hashFnv32a(str, asString, seed) {
    /*jshint bitwise:false */
    var i, l,
        hval = (seed === undefined) ? 0x811c9dc5 : seed;

    for (i = 0, l = str.length; i < l; i++) {
        hval ^= str.charCodeAt(i);
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    if( asString ){
        // Convert to 8 digit hex string
        return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
    }
    return hval >>> 0;
}

async function loadSeason(country, year) {
 // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
  	headless: 'false',
  	slowMo: 100
  });
  const page = await browser.newPage();

  const leagueName = getLeagueName(country, year);
  const season = seasonName(year);
  
  // Navigate the page to a URL
  await page.goto(leagueUrl(country, season, leagueName));
  
  return [browser, page];
}

async function findTeams(leaguePage) {
	// Set screen size
  await leaguePage.setViewport({width: 1080, height: 1024});

  const elements = await leaguePage.$$eval('div#main h5 a', elements => {
    return elements.map(
    			element => { return {
    				 'href': element.getAttribute('href'), 
    				 'name': element.textContent
    				};
    			}
    	  );
  });

  return elements;
}

async function openTeamPage(browser, teamPageUrl) {
	const childPage = await browser.newPage();
  	await childPage.goto(teamPageUrl);
  	return childPage;
}

async function extractPlayers(teamPage) {
	const players = await teamPage.evaluate(() => {
		// The players table has 9 columns, and the 1st column is the number, the second the name
		// If we put each cell one after the other, the player name is always
		// at index 9k + 1
		// However, the table is divided in two sections. The last section
		// has a single row with the text "Players no longer at this club"
		// and those rows can be ignored
		const tds = document.querySelectorAll('div#main table tbody td');
		const secondSectionIndex = Array.from(tds).findLastIndex(function(e) { 
			return e.innerText === 'Players no longer at this club';
		});
		console.log(secondSectionIndex);
		return Array.from(tds)
				.filter((td, index) => index > 1 && index % 9 === 1 && index < secondSectionIndex)
				.filter(td => td.innerText.trim() !== '')
				.map((td,index) => {
						return td.innerText;
					});	
	});
	return players;
}

(async () => {

  var country = readline.question(`What country? `);
  var year = parseInt(readline.question(`What year? `));
  const season = seasonName(year);

  const [browser, leaguePage] = await loadSeason(country, year);
  const teams = await findTeams(leaguePage);
  
  for (var team of teams) {
  	 console.log('===== %s ========', team.name);
  	 const teamPage = await openTeamPage(browser, teamUrl(country, season, team.href));
  	 const players = await extractPlayers(teamPage);
  	 for (var player of players) {
  	 	console.log(player + ":" + hashFnv32a(player, true));
  	 }
  }

  await browser.close();
})(); 