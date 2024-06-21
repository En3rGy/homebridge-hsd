import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addOnCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  setEndpoint: string,
  getEndpoint: string): void => {

  const lockCurrentState = service.getCharacteristic(api.hap.Characteristic.LockCurrentState);

  // Add subscription
  hsd.addListener(reading => {
    lockCurrentState.updateValue(Number(reading));
  }, getEndpoint);

  lockCurrentState.onGet(async () => {

    /* todo:
    UNSECURED	Characteristic.LockCurrentState.UNSECURED	0
    SECURED	Characteristic.LockCurrentState.SECURED	1
    JAMMED	Characteristic.LockCurrentState.JAMMED	2
    UNKNOWN	Characteristic.LockCurrentState.UNKNOWN	3
    */

    return Number(hsd.getCo(getEndpoint));
  });

  lockCurrentState.onSet(async turnOn => {

    hsd.setCo(setEndpoint, Number(turnOn));
  });
};

