import { API, Logging } from 'homebridge';
import { HomeServerConnector } from './hs';

import { AbstractHsdService } from './service/AbstractHsdService';
import { HsdPlatformAccessory } from './hsdPlatformAccessory';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HsdAccessoryConfig } from './config';

import { Lightbulb } from './service/Lightbulb';

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
    const addresses = config.services.map(service => service.endpoints.join(',')).join(',');
    return this.api.hap.uuid.generate(`${PLATFORM_NAME}.${this.config.name}.${addresses}`);
  }

  private getAccessoryDisplayName (config: HsdAccessoryConfig): string {
    return `${config.name} ${config.services[0].name}`;
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
    // eslint-disable-next-line new-cap
    const accessory = new this.api.platformAccessory(displayName, this.uuid) as HsdPlatformAccessory;
    accessory.context = this.config;

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    return accessory;
  }

  public setupServices (accessory: HsdPlatformAccessory): void {
    for (const service of accessory.context.services) {
      switch (service.id) {

        case 'Lightbulb':
          this.services.push(new Lightbulb(this.api, this.hsd, accessory, service));
          break;

        default:
          throw new Error(`<${service.id}> service not supported`);
      }

    }
  }
}

export { HsdAccessory };