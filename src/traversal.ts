import { Browser, Page } from "puppeteer";
import { PlayerCache } from "./cache/fs-cache.js";
import { 
    Countries, 
    League, 
    Season, 
    Team, 
    Player,
    PlayerSet,
    getLeagues 
} from "./types/data-structures.js"

/**
 * This file implements the traversal through www.footballsquads.co.uk, going all the way
 * from Country (e.g. eng) to a team in a season (e.g. Alaves/2018)
 * 
 * The way this traversal will work is via a plain bfs walk. We'll start with a list of countries
 * in the walk queue, then replace each of them with a league and a season, and in the last step
 * we'll add the team.
 * 
 * Once we are processing "team" nodes, we'll find players in each team and build a list of players
 * with all the teams they have been throughout the years.
 */

export enum ScrappingNodeType {
    LEAGUE,
    END_OF_LEAGUE_MARKER,
    LEAGUE_AND_TEAM
}

export class ScrappingNode {
    private readonly _league: League;
    private readonly _team: Team;
    private readonly _nodeType: ScrappingNodeType;

    constructor(league: League, endOfLeagueMarker: boolean = false, team: Team = undefined) {
        this._league = league;
        this._team = team;
        if (team === undefined) {
            if (endOfLeagueMarker) {
                this._nodeType = ScrappingNodeType.END_OF_LEAGUE_MARKER;
            } 
            else {
                this._nodeType = ScrappingNodeType.LEAGUE;
            }
        } else {
            this._nodeType = ScrappingNodeType.LEAGUE_AND_TEAM;
        }
    }

    public get nodeType(): ScrappingNodeType {
        return this._nodeType;
    }
    
    public get league() : League {
        return this._league;
    }
    
    public get team() : Team {
        return this._team;
    }
}

export async function bfsWalk(
    baseUrl: string,
    startSeason: Season,
    endSeason: Season,
    countries: Array<Countries>,
    playerCache: PlayerCache,
    launchBrowser: () => Promise<Browser>,
    scrapeTeams: (p: Page) => Promise<{href: string, name: string}[]>,
    launchTeamPage: (browser: Browser, team: Team, baseUrl: string) => Promise<Page>,
    scrapePlayers: (p: Page) => Promise<Array<Player>>
    ): Promise<PlayerSet> {
    
    var queue: Array<ScrappingNode> = new Array<ScrappingNode>();
    var result: PlayerSet = new PlayerSet();

    // Preamble: launch browser
    const browser = await launchBrowser();

    // Preamble: add a node to the queue for each League and each season in [startSeason, endSeason]
    var currentSeason = startSeason;
    do {
        pushSeasonScrapingNode(currentSeason, countries, queue);
        // Walk current season
        while (queue.length > 0) {
            var currentNode = queue.pop();
            switch(currentNode.nodeType) {
                case ScrappingNodeType.LEAGUE:
                    await playerCache.initLeagueDir(currentNode.league);
                    await addScrappingJobForLeagueTeams(currentNode.league, browser, baseUrl, scrapeTeams, playerCache, queue);
                    break;
                
                case ScrappingNodeType.END_OF_LEAGUE_MARKER:
                    await playerCache.markLeagueDir(currentNode.league);
                    break;
                    
                case ScrappingNodeType.LEAGUE_AND_TEAM:
                    await playerCache.initTeamDir(currentNode.team);
                    await findPlayersInTeamPage(currentNode.team, launchTeamPage, browser, baseUrl, scrapePlayers, playerCache, result);
                    break;
            }
        }
        currentSeason = currentSeason.next();
    } while (!currentSeason.equals(endSeason))

    await browser.close();
    return result;
}

async function findPlayersInTeamPage(
    team: Team, 
    launchTeamPage: (browser: Browser, team: Team, baseUrl: string) => Promise<Page>, 
    browser: Browser, baseUrl: string, 
    scrapePlayers: (p: Page) => Promise<Array<Player>>,
    playerCache: PlayerCache,
    result: PlayerSet) {
    if (!await playerCache.hasTeamData(team)) {
        console.log("=== %s ====", team);
        const teamPage: Page = await launchTeamPage(browser, team, baseUrl);
        const players: Array<Player> = await scrapePlayers(teamPage);
        for (var player of players) {
            var playerWithTeam = result.add(player);
            playerWithTeam.addTeam(team);
        }
        await playerCache.store(team, players);
    } else {
        console.info("Data for %s already cached...", team.toString());
    }
}

async function addScrappingJobForLeagueTeams(
                        league: League, 
                        browser: Browser, 
                        baseUrl: string, 
                        scrapeTeams: (p: Page) => Promise<{ href: string; name: string; }[]>,
                        playerCache: PlayerCache, 
                        queue: ScrappingNode[]) {
    if (await playerCache.hasLeagueData(league)) {
        console.info("Data for %s is already cached", league.name + "(" + league.season.toString() + ")");
        return;
    }

    const season = league.season;

    // find all the teams for that league on the
    // league's page
    const page = await browser.newPage();
    await page.goto(league.url(baseUrl));

    const teams = await scrapeTeams(page);

    // add a scraping job for each team
    for (var teamData of teams) {
        const team = new Team(league, season, teamData.name, teamData.href);
        queue.push(new ScrappingNode(league, false, team));
    }

    // a scrapping job to "mark" the whole league as scrapped
    queue.push(new ScrappingNode(league, true));
}

function pushSeasonScrapingNode(season: Season, countries: Array<Countries>, queue: Array<ScrappingNode>) {
    console.log("Adding scrapping job for [%s] for season: %s", countries.toString(), season.toString());
    countries.forEach(country => {
        var leagues = getLeagues(country, season);
        if (leagues.length === 0) {
            console.warn("There was no league on season %s in %s", season.toString(), country);
            return;
        }
        leagues.forEach(league => {
            queue.push(new ScrappingNode(league));
        });
    });
}

