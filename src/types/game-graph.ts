import { PlayerSet, Team, Player } from "./data-structures.js";

export class GameGraph {
    
    private readonly _playerSets: Array<PlayerSet>;

    constructor(playerSets: Array<PlayerSet>) {
        this._playerSets = playerSets;
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