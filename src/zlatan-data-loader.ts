import {
    // readFile,
    readdir,
    stat
} from 'fs/promises';

import * as path from 'path/posix';

import { EventEmitter } from 'events';
import { Countries, enumNameFromValue } from './types/data-structures.js';

// import * as path from 'path/posix';
export class DataLoader {
    
    private readonly CACHE_BASE_DIR: string = "./cache/data-files"
    private readonly _eventBus: EventEmitter;

    constructor (eventBus: EventEmitter) {
        this._eventBus = eventBus;
    }

    public async loadGameData() {
        const countryDirs = await readdir(this.CACHE_BASE_DIR);
        this.emit('loader:dir-count', countryDirs.length);
        
        var loadedDirs = 0;
        for (const dir of countryDirs) {
            const stats = await stat(path.join(this.CACHE_BASE_DIR, dir));
            if (stats.isDirectory()) {
                var country = enumNameFromValue(dir, Countries);
                this.emit('loader:message', `Loading data for ${country}`);
                loadedDirs += 1;
                await this.delay(1000);
                this.emit('loader:dir-progress', loadedDirs);
            }
        }

        this.emit('loader:message', 'Done');
        this.emit('loader:dir-progress', countryDirs.length);
    }
}

    private emit(eventName: string, payload: any) {
        this._eventBus.emit(eventName, payload);
    }

    private delay(ms: number): Promise<boolean> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, 
            1000);
        });
    }
}

