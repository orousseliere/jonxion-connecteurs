/**
 * DEM-0320: MQTT 5.0 Connector Tests
 * Test coverage for MQTT 5.0 protocol connector
 */

import MQTT5Connector, { MQTT5ClientOptions } from '../src/dem-0320-mqtt5-connector';

describe('MQTT5Connector', () => {
  let connector: MQTT5Connector;
  const mockOptions: MQTT5ClientOptions = {
    host: 'localhost',
    port: 1883,
    clientId: 'test-client',
    protocolVersion: 5,
    keepAlive: 60,
    clean: true,
    resubscribe: true,
  };

  beforeEach(() => {
    connector = new MQTT5Connector(mockOptions);
  });

  describe('Initialization', () => {
    test('should create connector with options', () => {
      expect(connector).toBeDefined();
    });

    test('should initialize with default values', () => {
      const status = connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.subscriptionCount).toBe(0);
      expect(status.bufferedMessages).toBe(0);
    });

    test('should set TLS option', () => {
      const tlsConnector = new MQTT5Connector({
        ...mockOptions,
        tls: true,
      });
      expect(tlsConnector).toBeDefined();
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

    test('should emit connecting event', async () => {
      const connectingHandler = jest.fn();
      connector.on('connecting', connectingHandler);
      
      await connector.connect();
      
      expect(connectingHandler).toHaveBeenCalled();
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

  describe('Message Publishing', () => {
    beforeEach(async () => {
      await connector.connect();
    });

    test('should throw error when publishing without connection', async () => {
      const disconnectedConnector = new MQTT5Connector(mockOptions);
      await expect(
        disconnectedConnector.publish({
          topic: 'test/topic',
          payload: 'test message',
          qos: 0,
        })
      ).rejects.toThrow('not connected');
    });

    test('should emit publishing and published events', async () => {
      const publishingHandler = jest.fn();
      const publishedHandler = jest.fn();
      
      connector.on('publishing', publishingHandler);
      connector.on('published', publishedHandler);
      
      await connector.publish({
        topic: 'test/topic',
        payload: 'test message',
        qos: 1,
      });
      
      expect(publishingHandler).toHaveBeenCalledWith({
        topic: 'test/topic',
        qos: 1,
      });
      expect(publishedHandler).toHaveBeenCalledWith({
        topic: 'test/topic',
      });
    });

    test('should support different QoS levels', async () => {
      for (const qos of [0, 1, 2]) {
        await connector.publish({
          topic: `test/qos/${qos}`,
          payload: `QoS ${qos}`,
          qos: qos as 0 | 1 | 2,
        });
      }
    });
  });

  describe('Subscriptions', () => {
    beforeEach(async () => {
      await connector.connect();
    });

    test('should throw error when subscribing without connection', async () => {
      const disconnectedConnector = new MQTT5Connector(mockOptions);
      await expect(
        disconnectedConnector.subscribe('test/topic', { qos: 0 })
      ).rejects.toThrow('not connected');
    });

    test('should subscribe to topic', async () => {
      const subscribedHandler = jest.fn();
      connector.on('subscribed', subscribedHandler);
      
      await connector.subscribe('test/topic', { qos: 1 });
      const subs = connector.getSubscriptions();
      
      expect(subs.length).toBe(1);
      expect(subs[0].topic).toBe('test/topic');
      expect(subscribedHandler).toHaveBeenCalled();
    });

    test('should support multiple subscriptions', async () => {
      await connector.subscribe('topic/1', { qos: 0 });
      await connector.subscribe('topic/2', { qos: 1 });
      await connector.subscribe('topic/3', { qos: 2 });
      
      const subs = connector.getSubscriptions();
      expect(subs.length).toBe(3);
    });

    test('should unsubscribe from topic', async () => {
      await connector.subscribe('test/topic', { qos: 0 });
      const unsubscribedHandler = jest.fn();
      connector.on('unsubscribed', unsubscribedHandler);
      
      await connector.unsubscribe('test/topic');
      const subs = connector.getSubscriptions();
      
      expect(subs.length).toBe(0);
      expect(unsubscribedHandler).toHaveBeenCalled();
    });

    test('should throw error on unsubscribe without connection', async () => {
      const disconnectedConnector = new MQTT5Connector(mockOptions);
      await expect(
        disconnectedConnector.unsubscribe('test/topic')
      ).rejects.toThrow('not connected');
    });
  });

  describe('Event Handling', () => {
    test('should handle multiple event listeners', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      connector.on('connected', handler1);
      connector.on('connected', handler2);
      
      await connector.connect();
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    test('should emit error events', (done) => {
      const errorHandler = jest.fn();
      connector.on('error', errorHandler);
      
      const disconnectedConnector = new MQTT5Connector(mockOptions);
      disconnectedConnector.publish({
        topic: 'test',
        payload: 'test',
        qos: 0,
      }).catch(() => {
        // Error expected
      });
      
      setTimeout(() => {
        expect(errorHandler).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('Status Management', () => {
    test('should return correct status when disconnected', () => {
      const status = connector.getStatus();
      expect(status).toEqual({
        connected: false,
        subscriptionCount: 0,
        bufferedMessages: 0,
      });
    });

    test('should update status on connection', async () => {
      await connector.connect();
      const status = connector.getStatus();
      expect(status.connected).toBe(true);
    });

    test('should track subscription count', async () => {
      await connector.connect();
      await connector.subscribe('topic/1', { qos: 0 });
      await connector.subscribe('topic/2', { qos: 1 });
      
      const status = connector.getStatus();
      expect(status.subscriptionCount).toBe(2);
    });
  });
});
