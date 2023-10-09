
import * as puppeteer from 'puppeteer';
import * as readline from 'readline-sync';

import { Countries, Season, Team, enumFromValue, Player } from "./types/data-structures.js"
import { bfsWalk } from './traversal.js';
import { PlayerCache } from './cache/fs-cache.js';

const baseUrl = 'http://www.footballsquads.co.uk'


async function launchBrowser() {
 // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
  	headless: 'new',
  	slowMo: 100
  });
  return browser;
}

async function scrapeTeams(leaguePage: puppeteer.Page): Promise<{href: string, name: string}[]> {
	// Set screen size
  await leaguePage.setViewport({width: 1080, height: 1024});

  const elements = await leaguePage.$$eval('div#main h5 a', e => {
    return e.map(
    			element => { return {
    				 href: element.getAttribute('href'), 
    				 name: element.textContent
    				};
    			}
    	  );
  });

  return elements;
}

async function scrapePlayers(teamPage: puppeteer.Page): Promise<Array<Player>> {
	const players = await teamPage.evaluate(() => {
		// The players table has 9 columns, and the 1st column is the number, the second the name
		// If we put each cell one after the other, the player name is always
		// at index 9k + 1
		// However, the table is divided in two sections. The last section
		// has a single row with the text "Players no longer at this club"
		// and those rows can be ignored
		const tds = document.querySelectorAll('div#main table tbody td');
		const secondSectionIndex = Array.from(tds).findIndex(function(e) { 
			return (e as HTMLElement).innerText === 'Players no longer at this club';
		});
		console.log(secondSectionIndex);
		return Array.from(tds)
				.map((td) => td as HTMLElement)
				.filter((_, index) => index > 1 && index % 9 === 1 && index < secondSectionIndex)
				.filter(td => td.innerText.trim() !== '')
				.map((td,_) => {
						return td.innerText;
					});	
	});
	
	return players.map(name => new Player(name));
}

async function launchTeamPage(browser: puppeteer.Browser, team: Team, baseUrl: string) {
    const teamPageUrl = team.url(baseUrl);
	const childPage = await browser.newPage();
  	await childPage.goto(teamPageUrl);
  	return childPage;
}

(async () => {
 
  var playerCache = new PlayerCache();
  await playerCache.init();

  var countryName = readline.question(`What country? `);
  var startYear = parseInt(readline.question(`Start at what season? `));
  var endYear = parseInt(readline.question(`End at what season? `));

  const startSeason = new Season(startYear);
  const endSeason = new Season(endYear);
  const country: Countries = enumFromValue(countryName, Countries);

  var playerSet = await bfsWalk(
			baseUrl, 
			startSeason, 
			endSeason,
			[country],
			playerCache,
			launchBrowser,
			scrapeTeams,
			launchTeamPage,
			scrapePlayers);
	for (var player of playerSet.values()) {
		console.log(player);
	}
})(); 