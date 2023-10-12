import figlet from 'figlet';
import blessed from 'blessed';
import { Element } from 'blessed/lib/widgets/Element';

import { EventEmitter } from 'events';
import  { DataLoader } from './zlatan-data-loader.js';

import { GameGraph } from './types/game-graph.js'
// import { League, Player, Team, Countries, Season } from './types/data-structures.js';

// Main screen object
var screen = blessed.screen({
    smartCSR: true
});

let gameGraph: GameGraph;

(async () => {
    
    var eventBus = new EventEmitter();
    var dataLoader = new DataLoader(eventBus);

    var widget = await displayIntroScreen();

    var dirCountLoader = 0;
    eventBus
        .on('loader:dir-count', (dirCount) => {
            dirCountLoader = dirCount;
        })
        .on('loader:message', (msg) => {
            widget.loadingText.setContent(msg);
            screen.render();
        })
        .on('loader:dir-progress', (newDirCount) => {
            var percentage = Math.floor(100 * newDirCount / dirCountLoader);
            widget.progressBar.setProgress(percentage);
            screen.render();
        })
        .on('game:indexing', () => {
            widget.loadingText.setContent("Indexing players...please wait");
            screen.render();
        })
        .on('loader:done', () => {
            widget.loadingText.setContent("Loaded, press [Space] to continue");
            
            widget.box.onceKey(['space'], function(ch, key) {
                widget.box.width = '100%';
                widget.box.height = '100%';
                widget.box.align = 'left',
                widget.box.valign = 'top',
                widget.loadingText.left = 0;
                widget.loadingText.width = '100%';
                widget.loadingText.style.fg = 'green';
                widget.loadingText.setContent(''.padStart(widget.box.width - 1, '-'));
                widget.loadingText.top = widget.box.top + 6;
    
                widget.box.remove(widget.progressBar);
            
                createGameTextBox(widget);
                screen.render();
            });
    
            screen.render();
        });

    gameGraph = await dataLoader.loadGameData();
})();

async function displayIntroScreen() {
    // Create a box perfectly centered horizontally and vertically.
    var box = blessed.box({
        parent: screen,
        top: 'center',
        left: 'center',
        width: '50%',
        height: '50%',
        tags: true,
        align: 'center',
        valign: 'middle',
        border: {
            type: 'line'
        },
        style: {
            fg: 'green',
            bg: 'black',
            border: {
                fg: 'green'
            }
        },
        padding: 1
    });

    var progressBar = blessed.progressbar({
        parent: box,
        style: {
            fg: 'blue',
            bar: {
                bg: 'default',
                fg: 'yellow'
            }
        },
        ch: '▌',
        width: box.width - 10,
        height: 3,
        top: box.height - 6,
        left: 'center',
        filled: 0,
        orientation: 'horizontal',
        border: 'line'
    });

    var loadingText = blessed.text({
        parent: box,
        content: 'Loading, please wait...',
        width: box.width - 10,
        top: progressBar.top - 3,
        left: 'center',
        orientation: 'horizontal',
        style: {
            fg: 'white',
            bg: 'black'
        }
    });

    box.focus();

    // Render the screen.
    screen.render();

    // Quit on Escape, q, or Control-C.
    screen.key(['escape', 'q', 'C-c'], function(ch, key) {
        return process.exit(0);
    });

    bigText("6 degrees of Zlatan!", box);

    var widget = {
        box: box,
        loadingText: loadingText,
        progressBar: progressBar 
    };

   return widget;
}

function createGameTextBox(widget) {
    let inputBox = blessed.box({
        parent: widget.box,
        top: widget.box.top + 10,
        left: 0,
        padding: 5,
        height: 10,
        valign: 'middle',
        align: 'center',
        border: {
            type: 'line'
        },
        style: {
            fg: 'green',
            bg: 'black',
            border: {
                fg: 'green'
            }
        }
    });
    let textInput = blessed.textbox({
        parent: inputBox,
        content: '',
        left: 75,
        top: -5,
        width: '60%',
        height: 7,
        border: 'line',
        style: {
            fg: 'yellow',
            bg: 'default',
            bar: {
              bg: 'default',
              fg: 'yellow'
            },
            border: {
              fg: 'default',
              bg: 'default'
            }
        }
    });
    textInput.on('focus', function() {
        textInput.readInput();
    });
    textInput.on('submit', (ch, key) => {
        let playerName = textInput.value;
        textInput.setValue('');
        startSearch(playerName, widget, textInput);
    });
    textInput.focus();

    let label = blessed.text({
        parent: inputBox,
        top: -3,
        style: {
            fg: 'yellow',
            bg: 'black'
        }
    });
    bigText("What player?",  label);
    return inputBox;
}

function bigText(str: string, widget: Element) {
    figlet(str, (err, data) => {
        if (err) {
            console.log("Could not run figlet!");
            console.dir(err);
            return;
        }
        
        widget.setContent(data);
        screen.render();
    });
}

function startSearch(playerName: string, widget, textInput) {
   
   widget.box.setLabel(`Finding ${playerName}`);
   screen.render();

   gameGraph.findPlayerByName(playerName).then(player => {
       if (player === undefined) {
         widget.box.setLabel(`Could not find player by name '${playerName}'`);
       } else {
        widget.box.setLabel(`Player found: ${player.identifier}: ${player.name}: (${player.dob})`);   
       }
       textInput.focus();
       screen.render();
   });
  
}