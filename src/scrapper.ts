
import * as puppeteer from 'puppeteer';

import { Countries, Season, Team, Player } from "./types/data-structures.js"
import { bfsWalk } from './traversal.js';
import { PlayerCache } from './cache/fs-cache.js';
import MersenneTwister from 'mersennetwister';

const baseUrl = 'https://www.footballsquads.co.uk'

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

  await delay(1000, 3000);

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
	
	await delay(1000, 3000);

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

const generator = new MersenneTwister();

const rand = (min: number, max: number): number => {
	if (min > max) {
	  throw new Error("Min > max");
	}
	return Math.floor(generator.random() * (max - min + 1) + min)
}

const delay = async (min: number, max: number): Promise<boolean> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(true);
		}, 
		rand(min, max));
	});
}

(async () => {
	var playerCache = new PlayerCache();
	await playerCache.init();

	var startYear = 1999;
	var endYear = 2023;

	const startSeason = new Season(startYear);
	const endSeason = new Season(endYear);
	const countries: Array<Countries> = Object.values(Countries);
	// const countries: Array<Countries> = [Countries.PORTUGAL]
	console.info("Scrapping data for seasons %s -> %s", startSeason.toString(), endSeason.toString());
	console.info("Countries =====");
	for (var c of countries) {
		console.info(c);
	}
	console.info("===============");

	await bfsWalk(
			baseUrl, 
			startSeason, 
			endSeason,
			countries,
			playerCache,
			launchBrowser,
			scrapeTeams,
			launchTeamPage,
			scrapePlayers);
			
	console.info("===============");		
	console.info("Done!");
})(); 