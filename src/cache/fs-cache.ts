import {
    mkdir,
    writeFile
} from 'fs/promises';
import { access, constants, PathLike, createWriteStream } from 'fs';
import { stringify } from 'csv-stringify';

import * as path from 'path/posix';
import { League, Player, Team } from '../types/data-structures';

export class PlayerCache {
    private readonly cacheBaseDir: string = "./cache/data-files";
    private readonly teamDataFileName: string = "players";
    private readonly leagueMarker: string = "league.done";

    public async init() {
        this.initDir(this.cacheBaseDir);
    }

    public async initLeagueDir(league: League) {
        await this.initDir(this.leaguePath(league));
    }

    public async markLeagueDir(league: League) {
        var markerPath = path.join(this.leaguePath(league), this.leagueMarker);
        await writeFile(markerPath, new Date().toUTCString());
    }

    public async hasLeagueData(league: League): Promise<boolean> {
        var markerPath = path.join(this.leaguePath(league), this.leagueMarker);
        return this.fileExists(markerPath);
    }

    public async initTeamDir(team: Team) {
        await this.initDir(this.teamPath(team));
    }

    public async hasTeamData(team: Team): Promise<boolean> {
        const teamDataFile = path.join(this.teamPath(team), this.teamDataFileName);
        return this.fileExists(teamDataFile);
    }

    public async store(team: Team, players: Array<Player>) {
        const teamDataFile = path.join(this.teamPath(team), this.teamDataFileName);
        const writableStream = createWriteStream(teamDataFile);
        const columns = ["id", "name", "dob"];
        const stringifier = stringify({ header: true, columns: columns });
        for (var player of players) {
            stringifier.write([player.identifier, player.name, player.dob]);
        }
        stringifier.pipe(writableStream);
    }

    private fileExists(path: PathLike): Promise<boolean> {
        return new Promise<boolean>(function(resolve, _) {
            access(path, constants.F_OK, (err) => {
                if (!err) {
                    resolve(true);
                    return;
                }
                resolve(false);
            });
        });
    }

    private async initDir(dirPath: string) {
        await mkdir(dirPath, {recursive: true});
    }

    private leaguePath(league: League): string {
        return path.join(this.cacheBaseDir, league.country, league.season.toString(), league.name);
    }

    private teamPath(team: Team): string {
        return path.join(
            this.leaguePath(team.league), 
            team.name.replace(/\s/g, '-').replace(/\//g,'-')
        );
    }
}