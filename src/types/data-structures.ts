export class Season {
    private readonly _startYear: number;
    private readonly _isSingleYearSeason: boolean;

    constructor(startYear: number, isSingleYearSeason: boolean = false) {
        this._startYear = startYear;
        this._isSingleYearSeason = isSingleYearSeason;
    }

    public get startYear() : number {
        return this._startYear;
    }

    public toString(): string {
        if (this._isSingleYearSeason) {
            return `${this._startYear}`;
        }
        return `${this._startYear}-${this._startYear + 1}`;
    }

    public next(): Season {
        return new Season(this._startYear + 1);
    }

    public equals(other: Season) {
        return this.startYear === other.startYear;
    }

    public asSingleYearSeason(): Season {
        return new Season(this.startYear, true);
    }
}

export class League {
    private readonly _country: Countries;
    private readonly _leagueName: string;
    private readonly _season: Season;

    constructor(country: Countries, leagueName: string, season: Season) {
        this._country = country;
        this._leagueName = leagueName;
        this._season = season;
    }

    public get country() : Countries {
        return this._country;
    }

    public get season() : Season {
        return this._season;
    }
    
    public get name() : string {
        return this._leagueName;
    }
    
    public url(baseUrl: string) : string {
        return baseUrl + "/" + this._country + "/" + this._season.toString() + "/" + this._leagueName + ".htm";
    }
}

export class Team {
    private readonly _league: League;
    private readonly _season: Season;
    private readonly _teamName: string;
    private readonly _teamHref: string;
    private readonly _players: Array<Player>;

    constructor(league: League, season: Season, teamName: string, teamHref: string) {
        this._league = league;
        this._season = season;
        this._teamName = teamName;
        this._teamHref = teamHref;
        this._players = new Array();
    }

    public url(baseUrl: string): string {
        return baseUrl + "/" + this._league.country + "/" + this._season.toString() + "/" + this._teamHref;
    }

    public toString() {
        return this._teamName + "(" + this.season.toString() + ")";
    }

    public get league() : League {
        return this._league;
    }

    public get season() : Season {
        return this._season;
    }

    public get name() : string {
        return this._teamName;
    }    
    
    public add(player: Player) {
        this._players.push(player);
    }
}

export enum Countries {
    ENGLAND="eng",
    SPAIN="spain",
    ITALY="italy",
    FRANCE="france",
    PORTUGAL="portugal",
    NETHERLANDS="netherl",
    USA="usa",
    SWEDEN="sweden"
}

export const enumFromValue = <T extends Record<string, string>>(val: string, _enum: T) => {
    const enumName = (Object.keys(_enum) as Array<keyof T>).find(k => _enum[k] === val)
    if (!enumName) throw Error() // here fail fast as an example
    return _enum[enumName]
}

/**
 * These are the leagues as known in http://www.footballsquads.co.uk/
 * Note that the Premier League was known as the FA Premier prior to 2018
 * as per that website, so some name change applies
 */
export enum LeagueNames {
    // England
    PREMIER_LEAGUE="engprem",

    // Spain
    LA_LIGA="spalali",

    // Italy
    SERIE_A="seriea",

    // Germany
    BUNDESLIGA="gerbun",

    // France
    LEAGUE_ONE="fralig1",

    // Netherlands
    EREDIVISIE="nethere",

    // Scotland
    SCOTTISH_PREMIERSHIP="scotsp",

    // Portugal
    PRIMEIRA_LIGA="porprim",

    // Belgium 
    EERSTE_KLASSE_A="beleers",

    // Turkey
    TURKEY_SUPER_LIG="tursuper",

    // Greece
    GREECE_SUPER_LEAGUE="gresuper",

    // Brazil
    BRAZIL_SERIE_A="bracamp",

    // USA
    MLS="usamls",

    // Mexico
    MEXICO_APERTURA="mexaper",
    MEXICO_CLAUSURA="mexclaus",

    // Sweden
    SWEDEN_SWEDALLS="swedalls"
}

export function getLeagues(country: Countries, season: Season): Array<League> {
    // leagues started at different moments
    var leaguesStart = new Map<Countries, number>([
        [Countries.ENGLAND, 1993],
        [Countries.SPAIN, 1995],
        [Countries.ITALY, 1995],
        [Countries.FRANCE, 1998],
        [Countries.NETHERLANDS, 2001],
        [Countries.USA, 2001],
        [Countries.SWEDEN, 2005],
        [Countries.PORTUGAL,2001]
    ]);

    if (leaguesStart.get(country) > season.startYear) {
        return [];
    }

    // there's a change of name in footballsquads.co.uk :-(
    var nameChanges = new Map<[Countries, number], string>([
        [[Countries.ENGLAND, 2018], "faprem"],
        [[Countries.FRANCE, 2002], "fradiv1"],
        [[Countries.NETHERLANDS, 2011], "holere"],
        [[Countries.USA, 2017], "usamsl"],
        [[Countries.PORTUGAL, 2012], "porsuper"]
    ]);

    for (var [[changedCountry, thresholdYear], newName] of nameChanges.entries()) {
        if (country === changedCountry && season.startYear < thresholdYear) {
            return [new League(country, newName , season)]
        }
    }

    const countryToLeagueName: Record<Countries, LeagueNames[]> = {
        [Countries.ENGLAND]: [LeagueNames.PREMIER_LEAGUE],
        [Countries.SPAIN]: [LeagueNames.LA_LIGA],
        [Countries.ITALY]: [LeagueNames.SERIE_A],
        [Countries.FRANCE]: [LeagueNames.LEAGUE_ONE],
        [Countries.NETHERLANDS]: [LeagueNames.EREDIVISIE],
        [Countries.USA]: [LeagueNames.MLS],
        [Countries.SWEDEN]: [LeagueNames.SWEDEN_SWEDALLS],
        [Countries.PORTUGAL]: [LeagueNames.PRIMEIRA_LIGA]
    }

    // Some leagues use a single-year season nomenclature (e.g. MLS)
    switch(country) {
        case Countries.USA:
        case Countries.SWEDEN:
            season = season.asSingleYearSeason();
            break;
    }

    return countryToLeagueName[country].map(l => new League(country, l, season));
}

export class Player {
    private readonly _name: string;
    private readonly _dob: string;
    private readonly _id: string | number;
    private readonly _teams: Array<Team>;

    constructor(name: string, dob: string) {
        this._name = name;
        this._dob = dob;
        this._id = this.hashFnv32a(`${name}|${dob}`, true);
        this._teams = new Array();
    }
    
    public get name() : string {
        return this._name;
    }

    public get dob() : string {
        return this._dob;
    }

    public get identifier(): string | number {
        return this._id;
    }
    
    public addTeam(t: Team) {
        this._teams.push(t);
        t.add(this);
    }
    
    public get teams() : Array<Team> {
        return this._teams;
    }

    /**
     * Calculate a 32 bit FNV-1a hash
     * Found here: https://gist.github.com/vaiorabbit/5657561
     * Ref.: http://isthe.com/chongo/tech/comp/fnv/
     *
     * @param {string} str the input value
     * @param {boolean} [asString=false] set to true to return the hash value as 
     *     8-digit hex string instead of an integer
     * @param {integer} [seed] optionally pass the hash of the previous chunk
     * @returns {integer | string}
     */
    private hashFnv32a(str, asString, seed=0x811c9dc5) {
        /*jshint bitwise:false */
        var i, l,
            hval = seed;

        for (i = 0, l = str.length; i < l; i++) {
            hval ^= str.charCodeAt(i);
            hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
        }
        if( asString ){
            // Convert to 8 digit hex string
            return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
        }
        return hval >>> 0;
    }

    public toString() {
        return this.name + "(" + this.identifier + "). Teams: " + this.teams.toString();
    }
}

export class PlayerSet {

    private _items: Map<string | number, Player>;

    constructor() {
        this._items = new Map<string | number, Player>();
    }

    public add(player: Player): Player {
        const id = player.identifier;
        var existingPlayer = this._items.get(id);
        if (existingPlayer === undefined) {
            this._items.set(id, player);
            return player;
        }
        return existingPlayer;
    }

    public values(): IterableIterator<Player> {
        return this._items.values();
    }
}