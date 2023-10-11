import {
    readdir,
    stat
} from 'fs/promises';

import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { finished } from 'stream/promises';

import * as path from 'path/posix';

import { EventEmitter } from 'events';
import { Countries, PlayerSet, Season, League, Player, Team } from './types/data-structures.js';
import { enumNameFromValue, getLeagues } from './types/data-structures.js';
import { GameGraph } from './types/game-graph.js';

class EventProducer {
    private readonly _eventBus: EventEmitter;
    constructor (eventBus: EventEmitter) {
        this._eventBus = eventBus;
    }
    public emit(eventName: string, payload: any) {
        this._eventBus.emit(eventName, payload);
    }
}

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

        var loadedDirs = 0;
        let playerSets = new Array();
        for (const dir of countryDirs) {
            var countryDirPath = path.join(this.CACHE_BASE_DIR, dir)
            const stats = await stat(countryDirPath);
            if (stats.isDirectory()) {

                var countryName = enumNameFromValue(dir, Countries);
                var countryPlayerSets: Array<PlayerSet> = await this._countryDirLoader.loadDir(countryName, countryDirPath);
                playerSets = playerSets.concat(countryPlayerSets);

                loadedDirs += 1;
                this.emit('loader:dir-progress', loadedDirs);
            }
        }
        this.emit('loader:dir-progress', countryDirs.length);
        return new GameGraph(playerSets);
    }
}

class CountryDirectoryLoader extends EventProducer {

    private readonly _leagueDirectoryLoader: LeagueDirectoryLoader;

    constructor(eventEmitter: EventEmitter) {
        super(eventEmitter);
        this._leagueDirectoryLoader = new LeagueDirectoryLoader(eventEmitter);
    }

    public async loadDir(countryName: string, countryDir: string): Promise<PlayerSet[]> {
        let loadResult = new Array<PlayerSet>();
        
        var country = Countries[countryName];
        var seasons = await readdir(countryDir);
        for (var s of seasons) {
            this.emit('loader:message', `Loading ${countryName} player data: ${s}`);
            
            var season = Season.parse(s);
            var leagues: Array<League> = getLeagues(country, season);
            var leaguePlayers = await this._leagueDirectoryLoader.loadLeagues(countryDir, leagues);
            loadResult = loadResult.concat(leaguePlayers);
            
        }
        return loadResult;
    }
}

class LeagueDirectoryLoader extends EventProducer {

    private readonly _playerSetLoader: PlayerSetLoader;

    constructor(eventEmitter: EventEmitter) {
        super(eventEmitter);
        this._playerSetLoader = new PlayerSetLoader(eventEmitter);
    }

    public async loadLeagues(countryDir: string, leagues: Array<League>): Promise<PlayerSet[]> {
        
        var teamLoaderPromises = new Array<Promise<PlayerSet>>();

        for (var league of leagues) {
            var leagueDir = path.join(countryDir, league.season.toString(), league.name);
            var teams = await readdir(leagueDir);

            for (var teamName of teams) {
                var teamDir = path.join(leagueDir, teamName);
                const stats = await stat(teamDir);
                if (stats.isDirectory()) {
                    var teamObj = new Team(league, teamName);
                    teamLoaderPromises.push(this._playerSetLoader.loadPlayerSet(teamDir, teamObj));
                }
            }
        }

        const allLeaguePlayers: PlayerSet[] = await Promise.all(teamLoaderPromises);
        let mergedResult = new Array<PlayerSet>();
        return mergedResult.concat(allLeaguePlayers);
    }
}

class PlayerSetLoader extends EventProducer {

    constructor(eventEmitter: EventEmitter) {
        super(eventEmitter);
    }

    public async loadPlayerSet(teamDir: string, team: Team): Promise<PlayerSet> {
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

        const result = await processFile();
        for (var player of result.values()) {
            player.addTeam(team);
        }
        
        return result;
    }
}
