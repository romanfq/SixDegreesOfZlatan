import { EventEmitter } from 'events';

export class EventProducer {
    private readonly _eventBus: EventEmitter;
    constructor (eventBus: EventEmitter) {
        this._eventBus = eventBus;
    }
    public emit(eventName: string, ...payload: any[]) {
        this._eventBus.emit(eventName, ...payload);
    }
}