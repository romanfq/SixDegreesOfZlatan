import figlet from 'figlet';
import blessed from 'blessed';

// Main screen object
var screen = blessed.screen({
    smartCSR: true
});

(async () => {
    var widget = await displayIntroScreen();

    var interval = setInterval(() => {
        widget.progressBar.progress(20);
        screen.render();
    }, 500);

    widget.progressBar.on('complete', (e) => {
        clearInterval(interval);
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
        });

        screen.render();
    });

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