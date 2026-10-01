/**
 * DEM-0300: Matter Connector Tests
 * Test coverage for Matter protocol connector
 */

import MatterConnector, { MatterConnectorConfig } from '../src/dem-0300-matter-connector';

describe('MatterConnector', () => {
  let connector: MatterConnector;
  const mockConfig: MatterConnectorConfig = {
    fabricId: 'test-fabric-123',
    deviceId: 'device-001',
    discoveryTimeout: 2000,
    autoConnect: false,
  };

  beforeEach(() => {
    connector = new MatterConnector(mockConfig);
  });

  describe('Initialization', () => {
    test('should create connector with config', () => {
      expect(connector).toBeDefined();
    });

    test('should initialize with autoConnect false', async () => {
      const status = connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.deviceCount).toBe(0);
    });

    test('should initialize with default timeout', () => {
      const defaultConnector = new MatterConnector({
        ...mockConfig,
        discoveryTimeout: undefined as any,
      });
      const status = defaultConnector.getStatus();
      expect(status.connected).toBe(false);
    });
  });

  describe('Connection Management', () => {
    test('should connect successfully', async () => {
      const connectedHandler = jest.fn();
      connector.on('connected', connectedHandler);
      
      await connector.connect();
      const status = connector.getStatus();
      
      expect(status.connected).toBe(true);
      expect(connectedHandler).toHaveBeenCalled();
    });

    test('should not reconnect if already connected', async () => {
      await connector.connect();
      const initConnectedHandler = jest.fn();
      connector.on('connected', initConnectedHandler);
      
      await connector.connect();
      
      expect(initConnectedHandler).not.toHaveBeenCalled();
    });

    test('should disconnect successfully', async () => {
      await connector.connect();
      const disconnectedHandler = jest.fn();
      connector.on('disconnected', disconnectedHandler);
      
      await connector.disconnect();
      const status = connector.getStatus();
      
      expect(status.connected).toBe(false);
      expect(disconnectedHandler).toHaveBeenCalled();
    });

    test('should not error on disconnect when not connected', async () => {
      await expect(connector.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('Event Handling', () => {
    test('should emit connecting event', (done) => {
      connector.on('initializing', () => {
        expect(true).toBe(true);
        done();
      });
      connector.connect().catch(() => {});
    });

    test('should emit error event on failure', (done) => {
      connector.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });
      connector.discoverDevices().catch(() => {});
    });

    test('should allow multiple event listeners', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      connector.on('connected', handler1);
      connector.on('connected', handler2);
      
      await connector.connect();
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Device Operations', () => {
    beforeEach(async () => {
      await connector.connect();
    });

    test('should throw error when reading attribute without connection', async () => {
      const disconnectedConnector = new MatterConnector(mockConfig);
      await expect(
        disconnectedConnector.readAttribute('device-001', 1, 'temperature')
      ).rejects.toThrow('not connected');
    });

    test('should throw error when writing attribute without connection', async () => {
      const disconnectedConnector = new MatterConnector(mockConfig);
      await expect(
        disconnectedConnector.writeAttribute('device-001', 1, 'temperature', 25)
      ).rejects.toThrow('not connected');
    });

    test('should throw error when executing command without connection', async () => {
      const disconnectedConnector = new MatterConnector(mockConfig);
      await expect(
        disconnectedConnector.executeCommand('device-001', 1, 'turn-on')
      ).rejects.toThrow('not connected');
    });

    test('should return null for unimplemented read attribute', async () => {
      const result = await connector.readAttribute('device-001', 1, 'temperature');
      expect(result).toBeNull();
    });

    test('should return null for unimplemented execute command', async () => {
      const result = await connector.executeCommand('device-001', 1, 'turn-on');
      expect(result).toBeNull();
    });
  });

  describe('Device Discovery', () => {
    test('should throw error when discovering without connection', async () => {
      await expect(connector.discoverDevices()).rejects.toThrow('not connected');
    });

    test('should emit discovery events', async () => {
      await connector.connect();
      const discoveringHandler = jest.fn();
      const completionHandler = jest.fn();
      
      connector.on('discovering', discoveringHandler);
      connector.on('discovery-complete', completionHandler);
      
      await connector.discoverDevices();
      
      expect(discoveringHandler).toHaveBeenCalled();
      expect(completionHandler).toHaveBeenCalled();
    });

    test('should return empty array on discovery', async () => {
      await connector.connect();
      const devices = await connector.discoverDevices();
      
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBe(0);
    });
  });
});
