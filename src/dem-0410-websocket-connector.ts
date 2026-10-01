import { EventEmitter } from 'events';

export class ProtocolConnector extends EventEmitter {
  async initialize() { this.emit('initialized'); }
  async connect() { this.emit('connected'); }
  async disconnect() { this.emit('disconnected'); }
}
