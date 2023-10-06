export enum ScrappingNodeType {
    LEAGUE,
    LEAGUE_AND_SEASON,
    LEAGUE_SEASON_AND_TEAM
}

export class Season {
    private readonly _startYear: number;

    constructor(startYear: number) {
        this._startYear = startYear;
    }

    public get startYear() : number {
        return this._startYear;
    }

    public toString(): string {
        return `${this._startYear}-${this._startYear + 1}`;
    }

    public next(): Season {
        return new Season(this._startYear + 1);
    }
}

export class ScrappingNode {
    private readonly _leagueName: string;
    private readonly _season: Season;
    private readonly _teamName: string;
    private readonly _nodeType : ScrappingNodeType;

    constructor(leagueName: string, 
                season: Season = undefined,
                teamName: string = undefined) {
        this._leagueName = leagueName;
        this._season = season;
        this._teamName = teamName;

        if (season === undefined) {
            this._nodeType = ScrappingNodeType.LEAGUE;
            return;
        } 

        if (teamName === undefined) {
            this._nodeType = ScrappingNodeType.LEAGUE_AND_SEASON;
            return;
        }
        
        this._nodeType = ScrappingNodeType.LEAGUE_SEASON_AND_TEAM;

    }
    
    public get leagueName() : string {
        return this._leagueName;
    }

    public get season(): Season {
        return this._season;
    }

    public get teamName() : string {
        return this._teamName;
    }

    public get nodeType(): ScrappingNodeType {
        return this._nodeType;
    }
}

export enum Countries {
    ENGLAND="eng",
    SPAIN="spain",
    ITALY="italy",
    GERMANY="ger",
    FRANCE="france",
    NETHERLANDS="netherl",
    SCOTLAND="scots",
    PORTUGAL="portugal",
    BELGIUM="belgium",
    TURKEY="turkey",
    GREECE="greece",
    BRAZIL="brazil",
    ARGENTINA="arg",
    USA="usa",
    MEXICO="mexico"
}

/**
 * These are the leagues as known in http://www.footballsquads.co.uk/
 * Note that the Premier League was known as the FA Premier prior to 2018
 * as per that website, so some name change applies
 */
export enum Leagues {
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

    // Argentina
    ARGENTINA_PRIMERA_DIVISION="argprim",

    // USA
    MLS="usamls",

    // Mexico
    MEXICO_APERTURA="mexaper",
    MEXICO_CLAUSURA="mexclaus"
}

export function getLeagueNames(country: Countries, season: Season): Array<string> {
    // there's a change of name in footballsquads.co.uk :-(
    if (country == Countries.ENGLAND && season.startYear < 2018) {
        return ["faprem"];
    }

    const countryToLeagueName: Record<Countries, Leagues[]> = {
        [Countries.ENGLAND]: [Leagues.PREMIER_LEAGUE],
        [Countries.SPAIN]: [Leagues.LA_LIGA],
        [Countries.ITALY]: [Leagues.SERIE_A],
        [Countries.GERMANY]: [Leagues.BUNDESLIGA],
        [Countries.FRANCE]: [Leagues.LEAGUE_ONE],
        [Countries.NETHERLANDS]: [Leagues.EREDIVISIE],
        [Countries.SCOTLAND]: [Leagues.SCOTTISH_PREMIERSHIP],
        [Countries.PORTUGAL]: [Leagues.PRIMEIRA_LIGA],
        [Countries.BELGIUM]: [Leagues.EERSTE_KLASSE_A],
        [Countries.TURKEY]: [Leagues.TURKEY_SUPER_LIG],
        [Countries.GREECE]: [Leagues.GREECE_SUPER_LEAGUE],
        [Countries.BRAZIL]: [Leagues.BRAZIL_SERIE_A],
        [Countries.ARGENTINA]: [Leagues.ARGENTINA_PRIMERA_DIVISION],
        [Countries.USA]: [Leagues.MLS],
        [Countries.MEXICO]: [Leagues.MEXICO_APERTURA, Leagues.MEXICO_CLAUSURA],
    }

    return countryToLeagueName[country].map(l => l.toString());
}

/* 

function getLeagueName(country, year) {
   if (country === "eng") {
   			
   		if (year < 2018) { 
   			return "faprem";
   		} else {
   			return "engprem";
   		}
   }
   
   // by default, the league names are fixed by the following table
   const countryToLeagueName = {
	'spain': 'spalali',
	'eng': 'engprem'
   };
   return countryToLeagueName[country];
}

*/