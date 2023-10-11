import figlet from 'figlet';
import blessed from 'blessed';

import  { DataLoader } from './zlatan-data-loader.js';
import { GameGraph } from './types/game-graph.js'
import { EventEmitter } from 'events';
import { League, Player, Team, Countries, Season } from './types/data-structures.js';

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
        });

    widget.progressBar.on('complete', (e) => {
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
            screen.render();

            const teams = gameGraph.findTeams(new Player("Zlatan Ibrahimovic", "03-10-81"));
            for (const t of teams) {
                console.info(t.identifier);
            }

            const league = new League(Countries.ENGLAND, "engprem", new Season(2008));
            const players = gameGraph.findPlayers(new Team(league, "Manchester-United"));
            for (const p of players) {
                console.info(p.identifier);
            }
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
        }
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

    figlet("6 degrees of Zlatan!", (err, data) => {
        if (err) {
            console.log("Could not run figlet!");
            console.dir(err);
            return;
        }
        
        box.setContent(data);
        screen.render();
   });

   var widget = {
        box: box,
        loadingText: loadingText,
        progressBar: progressBar 
    };

   return widget;
}