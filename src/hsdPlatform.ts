import { API, APIEvent, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, UnknownContext } from 'homebridge';
import { HomeServerConnector } from './hs';

import { HsdPlatformAccessory, isHsdPlatformConfig } from './hsdPlatformAccessory';
import { HsdAccessory } from './hsdAccessory';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HsdPlatformConfig } from './config';

export class HsdPlatform implements DynamicPlatformPlugin {
  private cachedAccessories: Map<string, HsdPlatformAccessory> = new Map();
  private hsdAccessories: Map<string, HsdAccessory> = new Map();
  private config: HsdPlatformConfig = {
    hsIp: '',
    hsUserName: '',
    hsUserPw: '',
    hsPort: 0,
    accessories: [], // Assuming you have an array of HsdAccessoryConfig objects
    platform: '',
  };

  private async connect (): Promise<HomeServerConnector> {
    const link = HomeServerConnector.getInstance(this.logger, this.hsdAccessories);
    link.connect(this.config.hsIp, this.config.hsPort, this.config.hsUserName, this.config.hsUserPw);
    this.logger.info(`hsdPlatform.ts | HsdPlatform | HSD IP gateway ${this.config.hsIp} connection established.`);

    this.api.on(APIEvent.SHUTDOWN, async () => {
      link.disconnect();
      this.logger.warn(`hsdPlatform.ts | HsdPlatform | hsd IP gateway ${this.config.hsdIp} connection closed.`);
    });

    return link;
  }

  public constructor (private logger: Logging, config: PlatformConfig, private api: API) {
    this.logger.debug('hsdPlatform.ts | HsdPlatform | Constructor');
    if (isHsdPlatformConfig(config)) {

      this.config = config;
    } else {
      this.logger.error('hsdPlatform.ts | HsdPlatform | Invalid configuration');
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
      try {
        const hsdAccessory = new HsdAccessory(config, this.logger, hsd, this.api);
        this.hsdAccessories.set(hsdAccessory.uuid, hsdAccessory);
        this.logger.info('hsdPlatform.ts | HsdPlatform | Loaded hsd accessory', hsdAccessory.displayName);
      } catch (error) {
        this.logger.error('hsdPlatform.ts | HsdPlatform | Error loading accessory', error);
      }
    }

    for (const accessory of this.cachedAccessories.values()) {
      if (!this.hsdAccessories.has(accessory.UUID)) {
        this.logger.warn('hsdPlatform.ts | HsdPlatform | Unregistering unconfigured hsd accessory', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    for (const hsdAccessory of this.hsdAccessories.values()) {
      const accessory = this.cachedAccessories.get(hsdAccessory.uuid) ?? hsdAccessory.register();

      try {
        hsdAccessory.setupServices(accessory);
      } catch (e) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.logger.debug('hsdPlatform.ts | HsdPlatform | Unregistered hsd accessory', accessory.displayName);
        throw e;
      }
    }
  }
}
