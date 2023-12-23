import { API, APIEvent, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, UnknownContext } from 'homebridge';
import { HomeServerConnector } from './hs';

import { HsdPlatformAccessory, isHsdPlatformConfig } from './hsdPlatformAccessory';
import { HsdAccessory } from './hsdAccessory';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HsdPlatformConfig } from './config';

export class HsdPlatform implements DynamicPlatformPlugin {
  private cachedAccessories: Map<string, HsdPlatformAccessory> = new Map();
  private hsdAccessories: Map<string, HsdAccessory> = new Map();
  private config: HsdPlatformConfig;

  private async connect (): Promise<HomeServerConnector> {
    this.logger.info('hsdPlatform.ts | Entering connect()');
    const link = new HomeServerConnector(this.logger);
    link.connect(this.config.hsIp, this.config.hsPort, this.config.hsUserName, this.config.hsUserPw);
    this.logger.info(`HSD IP gateway ${this.config.hsIp} connection established.`);

    this.api.on(APIEvent.SHUTDOWN, async () => {
      await link.disconnect();
      this.logger.debug(`KNX IP gateway ${this.config.hsdIpGatewayIp} connection closed.`);
    });

    return link;
  }

  public constructor (private logger: Logging, config: PlatformConfig, private api: API) {
    this.logger.info('hsdPlatform.ts | constructor');
    if (!isHsdPlatformConfig(config)) {
      throw new Error('hsdPlatform.ts | Invalid configuration');
    } else {
      this.config = config;
    }

    api.on(APIEvent.DID_FINISH_LAUNCHING, async () => {
      this.configureAccessories(await this.connect());
    });
  }

  public configureAccessory (accessory: PlatformAccessory<UnknownContext>): void {
    this.cachedAccessories.set(accessory.UUID, accessory as HsdPlatformAccessory);
  }

  private configureAccessories (hsd: HomeServerConnector): void {
    for (const config of this.config.accessories) {
      const hsdAccessory = new HsdAccessory(config, this.logger, hsd, this.api);
      this.hsdAccessories.set(hsdAccessory.uuid, hsdAccessory);
      this.logger.info('Loaded hsd accessory', hsdAccessory.displayName);
    }

    for (const accessory of this.cachedAccessories.values()) {
      if (!this.hsdAccessories.has(accessory.UUID)) {
        this.logger.debug('Unregistering unconfigured hsd accessory', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    for (const knxAccessory of this.hsdAccessories.values()) {
      const accessory = this.cachedAccessories.get(knxAccessory.uuid) ?? knxAccessory.register();

      try {
        knxAccessory.setupServices(accessory);

      } catch (e) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.logger.debug('Unregistered hsd accessory', accessory.displayName);
        throw e;
      }
    }
  }
}
