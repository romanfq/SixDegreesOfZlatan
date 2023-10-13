// import figlet from 'figlet';
import term from 'terminal-kit';

import { EventEmitter } from 'events';
import  { DataLoader } from './zlatan-data-loader.js';

import { GameGraph } from './types/game-graph.js'
import { Player } from './types/data-structures.js';
import { Search } from './search.js';


let terminal = term.terminal;

let progressBar: term.Terminal.ProgressBarController;
let gameGraph: GameGraph;
let targetPlayer: Player;

(async () => {

    terminal.fullscreen({
        noAlternate: false
    });

    terminal.on( 'key' , (name , matches , data ) => {
        if ( name === 'CTRL_C' ) { process.exit(0) ; }
    });

    let eventBus = new EventEmitter();
    let dataLoader = new DataLoader(eventBus);

    let itemsLoaded = 0;
    let itemsToLoad = await dataLoader.countDataSize();

    progressBar = terminal.progressBar({
        width: 200,
        eta: true,
        percent: true,
        items: itemsToLoad,
        syncMode: true,
        itemStyle: terminal.bold,
    });

    eventBus
        .on('loader:start', (msg) => {
            // loading text
            progressBar.startItem(msg);
        })
        .on('loader:end', (msg) => {
            // loaded text
            progressBar.itemDone(msg);
        })
        .on('loader:progress', (progress) => {
            // progress bar
            itemsLoaded += progress;
            var percentage = 1.0 * itemsLoaded / itemsToLoad;
            progressBar.update(percentage);
        })
        .on('loader:done', async () => {
            askForInput();
        });

    gameGraph = await dataLoader.loadGameData();
    targetPlayer = (await gameGraph.findPlayersByName("Zlatan Ibrahimovic"))[0]
    eventBus.emit('loader:done'); 
})();

function askForInput() {
    terminal('\n');
    terminal('\n');

    terminal.bold.cyan( `Enter a player name to find his path to ${targetPlayer.name}: ` ) ;

    terminal.inputField ((err, input) =>{
        terminal.green( "\nSearching for '%s'...\n" , input ) ;
        searchPlayer(input, targetPlayer);
    });
}

async function searchPlayer(playerName: string, targetPlayer: Player): Promise<void> {
   let players = await gameGraph.findPlayersByName(playerName);
   
    if (players.length == 0) {
        terminal(`Could not find any player by name '${playerName}' \n`);
        askForInput();
        return;
    }

    let fromPlayer: Player;
    if (players.length > 1) {
        terminal(`Players found: `);
        let response = await terminal.singleLineMenu(players.map(p => p.name),
            {
                cancelable: true,
                exitOnUnexpectedKey: true,
                selectedStyle: terminal.red.bgWhite,
                style: terminal.cyan
            }
        ).promise;
        fromPlayer = players[response.selectedIndex];
    } else {
        fromPlayer = players[0];
    }

    terminal('\n');

    // local events for search
    var searchEvents = new EventEmitter();
    searchEvents.on('step', (msg) => {
        terminal.saveCursor();
        terminal.moveTo.bgWhite.red(1, 1).eraseLine();
        terminal.blink(`${msg}\n`);
        terminal.red.bgWhite();
        terminal.restoreCursor();
    });

    let search = new Search(searchEvents, gameGraph);

    let playerPath = await search.findPath(fromPlayer, targetPlayer);    
    if (playerPath !== undefined && playerPath.size > 0) {
        let str = playerPath.toString();
        let degree = (playerPath.size - 1)/2;
        terminal(`${fromPlayer.name} has a ${targetPlayer.name} degree of ${degree} and here's the path:\n`)
        await terminal.slowTyping(str, {
            delay: 10
        });   
    } else {
        terminal("No path found! \n");
    }
    askForInput(); 
}


