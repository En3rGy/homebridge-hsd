import { PlatformAccessory, PlatformConfig } from 'homebridge';
import { HsdAccessoryConfig, HsdPlatformConfig } from './config';

export type HsdPlatformAccessory = PlatformAccessory<HsdAccessoryConfig>;

export const isHsdPlatformConfig = (config: PlatformConfig): config is HsdPlatformConfig => {
  let isConfig = true;
  isConfig = isConfig && 'hsIp' in config;
  isConfig = isConfig && 'hsUserName' in config;
  isConfig = isConfig && 'hsUserPw' in config;
  isConfig = isConfig && 'hsPort' in config;

  return isConfig;
};
