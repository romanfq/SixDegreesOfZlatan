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

    public async countDataSize(): Promise<number> {
        const countryDirs = await readdir(this.CACHE_BASE_DIR);
        let count = 0;
        for (const dir of countryDirs) {
            var countryDirPath = path.join(this.CACHE_BASE_DIR, dir);
            const stats = await stat(countryDirPath);
            if (stats.isDirectory()) {
                var countryName = enumNameFromValue(dir, Countries);
                count += await this._countryDirLoader.countDataSize(countryName,  countryDirPath);
            }
        }
        return count;
    }

    public async loadGameData(): Promise<GameGraph> {
        const countryDirs = await readdir(this.CACHE_BASE_DIR);
        let gameGraph = new GameGraph();

        for (const dir of countryDirs) {
            var countryDirPath = path.join(this.CACHE_BASE_DIR, dir);
            const stats = await stat(countryDirPath);
            if (stats.isDirectory()) {
                var countryName = enumNameFromValue(dir, Countries);
                await this._countryDirLoader.loadDir(countryName, countryDirPath, gameGraph);
            }
        }

        this.emit('loader:dir-progress', countryDirs.length);
        return gameGraph;
    }
}

class CountryDirectoryLoader extends EventProducer {

    private readonly _leagueDirectoryLoader: LeagueDirectoryLoader;

    constructor(eventEmitter: EventEmitter) {
        super(eventEmitter);
        this._leagueDirectoryLoader = new LeagueDirectoryLoader(eventEmitter);
    }

    public async countDataSize(countryName: string, countryDir): Promise<number> {
        let country = Countries[countryName];
        let seasons = await readdir(countryDir);
        let count = 0;
        for (var s of seasons) {
            var season = Season.parse(s);
            var leagues: Array<League> = getLeagues(country, season);
            count += await this._leagueDirectoryLoader.countDataSize(countryDir, leagues);
        }
        return count;
    }

    public async loadDir(countryName: string, countryDir: string, gameGraph: GameGraph): Promise<void> {
        var country = Countries[countryName];
        var seasons = await readdir(countryDir);
        for (var s of seasons) {
            let task = `Loading ${countryName} player data: ${s}`;
            this.emit('loader:start', task);
            
            var season = Season.parse(s);
            var leagues: Array<League> = getLeagues(country, season);
            await this._leagueDirectoryLoader.loadLeagues(countryDir, leagues, gameGraph);

            this.emit('loader:end', task);
        }
    }
}

class LeagueDirectoryLoader extends EventProducer {

    private readonly _playerSetLoader: PlayerSetLoader;

    constructor(eventEmitter: EventEmitter) {
        super(eventEmitter);
        this._playerSetLoader = new PlayerSetLoader(eventEmitter);
    }

    public async countDataSize(
                    countryDir: string, 
                    leagues: Array<League>): Promise<number> {
        let count = 0;
        for (let league of leagues) {
            let leagueDir = path.join(countryDir, league.season.toString(), league.name);
            let teams = await readdir(leagueDir);

            for (var teamName of teams) {
                var teamDir = path.join(leagueDir, teamName);
                const stats = await stat(teamDir);
                if (stats.isDirectory()) {
                    count += 1;
                }
            }
        }
        return count;
    }

    public async loadLeagues(
                    countryDir: string, 
                    leagues: Array<League>, 
                    gameGraph: GameGraph): Promise<void> {
        for (let league of leagues) {
            let leagueDir = path.join(countryDir, league.season.toString(), league.name);
            let teams = await readdir(leagueDir);

            for (let teamName of teams) {
                let teamDir = path.join(leagueDir, teamName);
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
        this.emit('loader:progress', 1);
        return true;
    }
}
