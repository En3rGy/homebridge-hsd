import { API, Logging } from 'homebridge';
import { HomeServerConnector } from './hs';

import { AbstractHsdService } from './service/AbstractHsdService';
import { HsdPlatformAccessory } from './hsdPlatformAccessory';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HsdAccessoryConfig } from './config';

import { Lightbulb } from './service/Lightbulb';
import { GarageDoorOpener } from './service/GarageDoorOpener';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
class HsdAccessory {
  public readonly displayName: string;
  public readonly uuid: string;

  private services: AbstractHsdService[] = [];

  private getAccessoryUUID (config: HsdAccessoryConfig): string {

    let addresses = '';
    for (const service of config.services) {
      addresses = addresses + service.characteristics.map(endpoints => endpoints.endpoints.join(',')).join(',');
    }

    // const addresses = config.services.map(service => service.characteristics.join(',')).join(',');

    return this.api.hap.uuid.generate(`${PLATFORM_NAME}.${this.config.accessoryName}.${addresses}`);
  }

  private getAccessoryDisplayName (config: HsdAccessoryConfig): string {
    return `${config.accessoryName} ${config.services.map(services => services.serviceName).join(' ')}`;
  }

  public constructor (
    private config: HsdAccessoryConfig,
    private logger: Logging,
    private hsd: HomeServerConnector,
    private api: API,
  ) {
    this.displayName = this.getAccessoryDisplayName(config);
    this.uuid = this.getAccessoryUUID(config);
  }

  public register (): HsdPlatformAccessory {
    const displayName = this.getAccessoryDisplayName(this.config);
    this.logger.info('Registering hsd accessory', displayName);
    const accessory = new this.api.platformAccessory(displayName, this.uuid) as HsdPlatformAccessory;
    accessory.context = this.config;

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    return accessory;
  }

  public setupServices (accessory: HsdPlatformAccessory): void {
    for (const service of accessory.context.services) {
      this.logger.info('Set up service', accessory.context.accessoryName, service.serviceName);

      switch (service.serviceType) {

        case 'Lightbulb':
          this.services.push(new Lightbulb(this.api, this.hsd, accessory, service));
          break;

        case 'GarageDoorOpener':
          this.services.push(new GarageDoorOpener(this.api, this.hsd, accessory, service));
          break;

        default:
          throw new Error(`<${service.serviceType}> service not supported`);
      }
    }
  }
}

export { HsdAccessory };
