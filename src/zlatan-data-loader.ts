import {
    readdir,
    stat
} from 'fs/promises';

import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { finished } from 'stream/promises';

import * as path from 'path/posix';

import { Countries, PlayerSet, Season, League, Player, Team } from './types/data-structures.js';
import { enumNameFromValue, getLeagues } from './types/data-structures.js';
import { GameGraph } from './types/game-graph.js';
import { EventProducer } from './eventProducer.js';
import EventEmitter from "events";


// import * as path from 'path/posix';
export class DataLoader extends EventProducer {
    
    private readonly CACHE_BASE_DIR: string = "./cache/data-files"
    private readonly _countryDirLoader: CountryDirectoryLoader;

    constructor (eventBus: EventEmitter) {
        super(eventBus);
        this._countryDirLoader = new CountryDirectoryLoader(eventBus);
    }

    public async loadGameData(): Promise<GameGraph> {
        const countryDirs = await readdir(this.CACHE_BASE_DIR);
        this.emit('loader:dir-count', countryDirs.length);

        let loadedDirs = 0;
        let gameGraph = new GameGraph();

        for (const dir of countryDirs) {
            var countryDirPath = path.join(this.CACHE_BASE_DIR, dir)
            const stats = await stat(countryDirPath);
            if (stats.isDirectory()) {

                var countryName = enumNameFromValue(dir, Countries);
                await this._countryDirLoader.loadDir(countryName, countryDirPath, gameGraph);

                loadedDirs += 1;
                this.emit('loader:dir-progress', loadedDirs);
            }
        }

        this.emit('loader:dir-progress', countryDirs.length);
        this.emit('loader:done');
        return gameGraph;
    }
}

class CountryDirectoryLoader extends EventProducer {

    private readonly _leagueDirectoryLoader: LeagueDirectoryLoader;

    constructor(eventEmitter: EventEmitter) {
        super(eventEmitter);
        this._leagueDirectoryLoader = new LeagueDirectoryLoader(eventEmitter);
    }

    public async loadDir(countryName: string, countryDir: string, gameGraph: GameGraph): Promise<void> {
        var country = Countries[countryName];
        var seasons = await readdir(countryDir);
        for (var s of seasons) {
            this.emit('loader:message', `Loading ${countryName} player data: ${s}`);
            
            var season = Season.parse(s);
            var leagues: Array<League> = getLeagues(country, season);
            await this._leagueDirectoryLoader.loadLeagues(countryDir, leagues, gameGraph);
        }
    }
}

class LeagueDirectoryLoader extends EventProducer {

    private readonly _playerSetLoader: PlayerSetLoader;

    constructor(eventEmitter: EventEmitter) {
        super(eventEmitter);
        this._playerSetLoader = new PlayerSetLoader(eventEmitter);
    }

    public async loadLeagues(
                    countryDir: string, 
                    leagues: Array<League>, 
                    gameGraph: GameGraph): Promise<void> {
        for (var league of leagues) {
            var leagueDir = path.join(countryDir, league.season.toString(), league.name);
            var teams = await readdir(leagueDir);

            for (var teamName of teams) {
                var teamDir = path.join(leagueDir, teamName);
                const stats = await stat(teamDir);
                if (stats.isDirectory()) {
                    var teamObj = new Team(league, teamName);
                    await this._playerSetLoader.loadPlayerSet(teamDir, teamObj, gameGraph);
                }
            }
        }
    }
}

class PlayerSetLoader extends EventProducer {

    constructor(eventEmitter: EventEmitter) {
        super(eventEmitter);
    }

    public async loadPlayerSet(
                        teamDir: string, 
                        team: Team, 
                        gameGraph: GameGraph): Promise<boolean> {
        const processFile = async () => {
            var result = new PlayerSet(teamDir);
            const parser = parse({columns: true});

            var playerFile = path.join(teamDir, 'players');
            createReadStream(playerFile).pipe(parser);

            parser.on('readable', () => {
                let record;
                while ((record = parser.read()) !== null) {
                    var player = new Player(record["name"], record["dob"], record["id"]);
                    result.add(player);
                }  
            });

            await finished(parser);
            return result;
        };

        const playerSet = await processFile();
        for (var player of playerSet.values()) {
            player.addTeam(team);
        }
        
        await gameGraph.add(playerSet);
        return true;
    }
}
