import { HomeServerConnector } from '../hs';
import { API, Service, WithUUID } from 'homebridge';

import { HsdServiceConfig } from '../config';
import { HsdPlatformAccessory } from '../hsdPlatformAccessory';

export abstract class AbstractHsdService {

  public name = '';
  public serviceId = '';
  public uuid = '';

  protected getService (service: WithUUID<typeof Service>): Service {

    let retService = this.accessory.getService(this.name);
    if(!retService) {
      retService = this.accessory.addService(service, this.name, this.serviceId);
    }
    this.uuid = retService.UUID;

    return retService;
  }

  public getName(): string {
    return this.name;
  }

  public getUuid(): string {
    return this.uuid;
  }

  public constructor (
        protected api: API,
        protected hsd: HomeServerConnector,
        protected accessory: HsdPlatformAccessory,
        protected config: HsdServiceConfig,
  ) {
    this.name = this.config.serviceName;
    this.serviceId = this.accessory.context.accessoryName + ' '
    + this.config.serviceName + ' '
    + this.config.characteristics[0].endpoints[0];
  }
}
