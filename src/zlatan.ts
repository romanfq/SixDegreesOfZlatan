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
let zlatan: Player;

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
        .on('loader:done', () => {
            askForInput();
        });

    gameGraph = await dataLoader.loadGameData();
    zlatan = await gameGraph.findPlayerByName("Zlatan Ibrahimovic");
})();

function askForInput() {
    terminal('\n');

    terminal.bold.cyan( 'Enter a player name to find his path to The Zlatan: ' ) ;

    terminal.inputField ((err, input) =>{
        terminal.green( "\nSearching for '%s'...\n" , input ) ;
        startSearch(input);
    });
}

function startSearch(playerName: string) {
   gameGraph.findPlayerByName(playerName).then(player => {
       if (player === undefined) {
         terminal(`Could not find player by name '${playerName}' \n`);
       } else {
        terminal(`Player found: ${player.name}: ([${player.identifier}] -> ${player.dob}) \n`);
         
         // local events for search
         var searchEvents = new EventEmitter();
         searchEvents.on('step', (msg) => {
            terminal.saveCursor();
            terminal.moveTo.bgWhite.black(1, 1).eraseLine();
            terminal(`${msg}\n`);
            terminal.white.bgBlack();
            terminal.restoreCursor();
         });

         let search = new Search(searchEvents, gameGraph);
         search.findPath(player, zlatan).then(playerPath => {
            if (playerPath !== undefined && playerPath.size > 0) {
                let str = playerPath.toString();
                terminal(str);
             } else {
                terminal("No path found! \n");
             }       
         });
       }
   }).then(() => {
      askForInput();   
   });
}


