import { KnxLink } from 'js-knx';
import { API } from 'homebridge';

import { HsdPlatformAccessory } from '../hsdPlatformAccessory';
import { addOnCharacteristic } from './characteristic/On';
import { KnxServiceConfig } from '../config';
import { AbstractHsdService } from './AbstractHsdService';

class Lightbulb extends AbstractHsdService {

  public constructor (api: API, knx: KnxLink, accessory: HsdPlatformAccessory, config: KnxServiceConfig) {
    super(api, knx, accessory, config);

    const service = this.getService(this.api.hap.Service.Lightbulb);
    addOnCharacteristic(api, service, knx, this.config.addresses[0], this.config.addresses[1]);
  }
}

export { Lightbulb };
