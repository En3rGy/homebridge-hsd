import { HomeServerConnector } from '../hs';
import { API, Service, WithUUID } from 'homebridge';

import { HsdServiceConfig } from '../config';
import { HsdPlatformAccessory } from '../hsdPlatformAccessory';

export abstract class AbstractHsdService {

  protected getService (service: WithUUID<typeof Service>): Service {
    return this.accessory.getService(service) ??
            this.accessory.addService(service, `${this.accessory.context.name} ${this.config.name}`, this.config.name);
  }

  public constructor (
        protected api: API,
        protected hsd: HomeServerConnector,
        protected accessory: HsdPlatformAccessory,
        protected config: HsdServiceConfig,
  ) {
    //
  }
}
