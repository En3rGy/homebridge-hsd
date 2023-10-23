import { PlatformAccessory, PlatformConfig } from 'homebridge';
import { HsdAccessoryConfig, HsdPlatformConfig } from './config';

export type HsdPlatformAccessory = PlatformAccessory<HsdAccessoryConfig>;

export const isHsdPlatformConfig = (config: PlatformConfig): config is HsdPlatformConfig => {
  return 'hsdIpGatewayIp' in config;
};
