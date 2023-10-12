import { EventEmitter } from "events";
import { EventProducer } from "./eventProducer.js";
import { Player, Team } from "./types/data-structures.js";
import { GameGraph } from "./types/game-graph.js";

export class Search extends EventProducer{
    
    private readonly _gameGraph: GameGraph;

    constructor(eventEmitter: EventEmitter, gameGraph: GameGraph) {
        super(eventEmitter);
        this._gameGraph = gameGraph;
    }

    public async findPath(fromPlayer: Player, targetPlayer: Player): Promise<PlayerPath> {
        this.emit('step', `Starting search for ${fromPlayer.name}`);
        let queue = new Array<SearchNode>();
        queue.push(new SearchNode(targetPlayer));

        let visitedEntities = new Set();

        let foundNode: SearchNode = null;
        while (queue.length > 0) {
            let currentNode = queue.shift();
            let entity = currentNode.value;
            if (!visitedEntities.has(entity.identifier)) {
                visitedEntities.add(entity.identifier);
                if (entity instanceof Player) {
                    if (entity.equals(fromPlayer)) {
                        foundNode = currentNode;
                        break;
                    } else {
                        this.emit('step', `Looking at player: ${entity.name}`);
                        this.expandTeams(entity, queue, currentNode);
                    }
                } else if (entity instanceof Team) {
                    visitedEntities.add(entity.identifier);
                    this.emit('step', `Looking at team: ${entity.identifier}`);
                    this.expandPlayers(entity, queue, currentNode);
                }
            }
        }
        if (foundNode === null) {
            return new PlayerPath();
        }
        return foundNode.asPlayerPath();
    }

    private expandTeams(player: Player, queue: Array<SearchNode>, fromNode: SearchNode) {
        let teams = this._gameGraph.findTeams(player);
        for (let t of teams) {
            queue.push(new SearchNode(t, fromNode));
        }
    }

    private expandPlayers(team: Team, queue: Array<SearchNode>, fromNode: SearchNode) {
        let players = this._gameGraph.findPlayers(team);
        for (let p of players) {
            queue.push(new SearchNode(p, fromNode));
        }
    }
}

class SearchNode {

    private readonly _value : Player | Team;
    private readonly _parent?: SearchNode;

    constructor(value: Player | Team, parent?: SearchNode) {
        this._value = value;
        this._parent = parent;
    }

    public get value() : Player | Team {
        return this._value;
    }

    public get parent() : SearchNode {
        return this._parent;
    }    
    
    public asPlayerPath(): PlayerPath {
        let path = new PlayerPath();
        let currentNode: SearchNode = this;
        while (currentNode !== undefined) {
            path.addEntity(currentNode.value);
            currentNode = currentNode.parent;
        }
        return path;
    }
}

export class PlayerPath {
    private readonly _pathEntities: Array<Team|Player>;

    constructor() {
        this._pathEntities = new Array();
    }

    public get size() : number {
        return this._pathEntities.length;
    }
    
    public addEntity(e: Team|Player) {
        this._pathEntities.push(e);
    }
    
    public toString() {
        return this._pathEntities
                .map(e => e.toString())
                .join(" -> ");
    }
}