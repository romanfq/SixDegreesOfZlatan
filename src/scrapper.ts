
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

	const result = await teamPage.evaluate(() => {
		// The players table has N columns, and the 1st column is the number, the second the name
		// The 5th is the DOB
		// The value of N depends on the league. N=9 usually, but then you get other countries
		// where N=8 (e.g. Portugal)
		// If we put each cell one after the other, the player name is always
		// at index Nk + 1
		// However, the table is divided in two sections. The last section
		// has a single row with the text "Players no longer at this club"
		// and those rows can be ignored
		const trs = document.querySelectorAll('div#main table tbody tr');
		var secondSectionIndex = 1000;

		var tableArray = [];
		var nameColIndex = 1;
		var dobColIndex = 5;
		
		trs.forEach((tr, rowIndex) => {
			const tds = tr.querySelectorAll('td');
			if (rowIndex == 0) {
				tds.forEach((td, index) => {
					if (td.innerText.toLowerCase() === 'name') {
						nameColIndex = index;
						return;
					}
					if (td.innerText.toLowerCase() === 'date of birth') {
						dobColIndex = index;
						return;
					}	
				});
			} else if (rowIndex < secondSectionIndex) {
				var thisRow = [];
				if (tds.length == 1 && tds[0].innerText === 'Players no longer at this club') {
					secondSectionIndex = rowIndex;
					return;
				}
				tds.forEach((td) => {
					thisRow.push(td.innerText);
				});
				tableArray.push(thisRow);
			}
		});
		
		return {
			table: tableArray, 
			nameColIndex: nameColIndex, 
			dobColIndex: dobColIndex
		};
	});

	return result.table
			.filter(row => row[result.nameColIndex] !== '')
			.map(row => new Player(row[result.nameColIndex], row[result.dobColIndex]));
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
	// const countries: Array<Countries> = [Countries.NETHERLANDS];
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