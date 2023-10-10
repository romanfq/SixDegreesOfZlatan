import figlet from 'figlet';

(async () => {
   await intro("6 degrees of Zlatan!");
})();

async function intro(text: string) {
    figlet(text, (err, data) => {
        if (err) {
            console.log("Could not run figlet!");
            console.dir(err);
            return;
        }
        console.log(data);
   });
}