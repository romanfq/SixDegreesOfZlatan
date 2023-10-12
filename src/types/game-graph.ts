import { PlayerSet, Team, Player } from "./data-structures.js";

import FlexSearch from 'flexsearch';

const accentMatcher = {
    'à': 'a','á': 'a','â': 'a','ä': 'a','æ': 'a','ã': 'a','å': 'a','ā': 'a',
    'è': 'e','é': 'e','ê': 'e','ë': 'e','ē': 'e','ė': 'e','ę': 'e',
    'ç': 'c','ć': 'c','č': 'c',
    'î': 'i','ï': 'i','í': 'i','ī': 'i','į': 'i','ì': 'i',
    'ô': 'o','ó': 'o','œ': 'o','ø': 'o','ō': 'o','õ': 'o',
    'û': 'u','ü': 'u','ù': 'u','ú': 'u','ū': 'u',
};

export class GameGraph {
    
    private readonly _playerSets: Array<PlayerSet>;
    private readonly _playerNameIndex: FlexSearch.Document<Player> ;
    private readonly _playersById: Map<string, Player>;

    constructor() {
        this._playerSets = new Array();
        this._playerNameIndex = new FlexSearch.Document<Player>({
            document: {
                id: "identifier",
                index: [
                    {
                        field: "name",
                        tokenize: "forward",
                        optimize: true,
                        matcher: accentMatcher
                    }, 
                    {
                        field: "dob",
                        tokenize: "full",
                        optimize: true
                    }
                ]
            }
        });
        this._playersById = new Map();
    }

    public async add(playerSet: PlayerSet): Promise<boolean> {
        this._playerSets.push(playerSet);

        for (const player of playerSet.values()) {
            if (! this._playersById.has(player.identifier)) {
                await this._playerNameIndex.addAsync(player.identifier, player);
                this._playersById.set(player.identifier, player);
            }
        }

        return true;
    }

    public findPlayerByName(name: string): Promise<Player> {
        return this._playerNameIndex
                        .searchAsync(name)
                        .then(searchResults => {
                            const players = searchResults
                                .flatMap(searchResult => searchResult.result)
                                .map(id => this._playersById.get(id as string))
                            return players.length == 0 ? undefined : players[0];
                        })
    }

    public findTeams(p: Player): Array<Team> {
        let results = new Array();
        for (const ps of this._playerSets) {
            const existingPlayer = ps.findPlayer(p.identifier);
            if (existingPlayer !== undefined) {
                results = results.concat(existingPlayer.teams);
            }
        }
        return results;
    }

    public findPlayers(t: Team): Array<Player> {
        let results = new Array();
        for (const ps of this._playerSets) {
            const existingPlayers = ps.findPlayersInTeam(t);
            results = results.concat(existingPlayers);
        }
        return results;
    }
}