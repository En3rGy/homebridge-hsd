import { Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
import { HsdAccessoryConfig, HsdPlatformConfig } from './config';

export type HsdPlatformAccessory = PlatformAccessory<HsdAccessoryConfig>;

export const isHsdPlatformConfig = (config: PlatformConfig, logger: Logger): config is HsdPlatformConfig => {
  if ('hsIp' in config) {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}$/;
    if (!ipv4Regex.test(config['hsIp'])) {
      logger.error(`isHsdPlatformConfig | ${config['hsIp']} is not a valid IP`);
      return false;
    }
  } else {
    logger.error('isHsdPlatformConfig | IP definition missing.');
    return false;
  }

  if ('hsPort' in config) {
    const isPort = (config['hsPort'] >= 1 && config['hsPort'] <= 65535 && Number.isInteger(config['hsPort']));
    if (!isPort) {
      logger.error(`isHsdPlatformConfig | Port ${config['hsPort']} of tpye ${typeof config['hsPort']} is not a valid port.`);
      return false;
    }
  } else {
    logger.error('isHsdPlatformConfig | Port is missing.');
    return false;
  }

  if ('accessories' in config) {
    if (config['accessories'].lenght === 0) {
      logger.error('isHsdPlatformConfig | Acessories missing.');
      return false;
    }
  } else {
    logger.error('isHsdPlatformConfig | Acessories missing.');
    return false;
  }

  if ('hsUserName' in config) {
    if (config['hsUserName'] === '') {
      logger.error('isHsdPlatformConfig | User Name is empty.');
      return false;
    }
  } else {
    logger.error('isHsdPlatformConfig | User Name definiton missing.');
    return false;
  }

  if ('hsUserPw' in config) {
    if (config['hsUserPw'] === '') {
      logger.error('isHsdPlatformConfig | Password is empty.');
      return false;
    }
  } else {
    logger.error('isHsdPlatformConfig | Password definiton missing.');
    return false;
  }

  return true;
};
