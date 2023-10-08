import { Browser, Page } from "puppeteer";
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
    LEAGUE_AND_TEAM
}

export class ScrappingNode {
    private readonly _league: League;
    private readonly _team: Team;
    private readonly _nodeType: ScrappingNodeType;

    constructor(league: League, team: Team = undefined) {
        this._league = league;
        this._team = team;
        if (team === undefined) {
            this._nodeType = ScrappingNodeType.LEAGUE;
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
                    await addScrappingJobForLeagueTeams(currentNode.league, browser, baseUrl, scrapeTeams, queue);
                    break;
                    
                case ScrappingNodeType.LEAGUE_AND_TEAM:
                    await findPlayersInTeamPage(currentNode.team, launchTeamPage, browser, baseUrl, scrapePlayers, result);
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
    result: PlayerSet) {
    console.log("=== %s ====", team);
    const teamPage: Page = await launchTeamPage(browser, team, baseUrl);
    const players: Array<Player> = await scrapePlayers(teamPage);
    for (var player of players) {
        var playerWithTeam = result.add(player);
        playerWithTeam.addTeam(team);
    }
}

async function addScrappingJobForLeagueTeams(
                        league: League, 
                        browser: Browser, 
                        baseUrl: string, 
                        scrapeTeams: (p: Page) => Promise<{ href: string; name: string; }[]>, 
                        queue: ScrappingNode[]) {
    const country = league.country;
    const season = league.season;

    // find all the teams for that league on the
    // league's page
    const page = await browser.newPage();
    // navigate to the the league url
    await page.goto(league.url(baseUrl));

    // find teams
    const teams = await scrapeTeams(page);

    // add a scraping job for each team
    for (var teamData of teams) {
        const team = new Team(country, season, teamData.name, teamData.href);
        queue.push(new ScrappingNode(league, team));
    }
}

function pushSeasonScrapingNode(season: Season, countries: Array<Countries>, queue: Array<ScrappingNode>) {
    console.log("Adding scrapping job for [%s] for season: %s", countries.toString(), season.toString());
    countries.forEach(country => {
        getLeagues(country, season).forEach(league => {
            queue.push(new ScrappingNode(league));
        });
    });
}

