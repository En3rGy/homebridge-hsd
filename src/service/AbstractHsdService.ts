import { KnxLink } from 'js-knx';
import { API, Service, WithUUID } from 'homebridge';

import { HsdServiceConfig } from '../config';
import { HsdPlatformAccessory } from '../hsdPlatformAccessory';

abstract class AbstractHsdService {

  protected getService (service: WithUUID<typeof Service>): Service {
    return this.accessory.getService(service) ??
            this.accessory.addService(service, `${this.accessory.context.name} ${this.config.name}`, this.config.name);
  }

  public constructor (
        protected api: API,
        protected knx: KnxLink,
        protected accessory: HsdPlatformAccessory,
        protected config: HsdServiceConfig,
  ) {
    //
  }
}

export { AbstractHsdService };
