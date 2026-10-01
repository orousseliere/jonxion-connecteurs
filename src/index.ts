/**
 * Jonxion Phase 5 - Protocoles Émergents
 * Main index file exporting all connectors
 */

export { default as MatterConnector } from './dem-0300-matter-connector';
export type { MatterConnectorConfig, MatterDeviceInfo } from './dem-0300-matter-connector';

export { default as MQTT5Connector } from './dem-0320-mqtt5-connector';
export type { MQTT5ClientOptions, MQTT5Message, MQTT5SubscriptionOptions } from './dem-0320-mqtt5-connector';

// Version and metadata
export const PHASE5_VERSION = '1.0.0';
export const PROTOCOLS = {
  MATTER: 'DEM-0300',
  MQTT5: 'DEM-0320',
  // Additional protocols to be added
};
