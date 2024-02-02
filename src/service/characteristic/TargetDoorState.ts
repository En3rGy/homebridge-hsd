import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addTargetDoorStateCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  setEndpoint: string,
  getEndpoint: string): void => {

  const targetDoorState = service.getCharacteristic(api.hap.Characteristic.TargetDoorState);

  // Add subscription
  hsd.addListener(reading => {
    targetDoorState.updateValue(Number(reading));
  }, getEndpoint);

  targetDoorState.onGet(async () => {
    const ret = hsd.getCo(getEndpoint);
    if (typeof(ret) === 'object') {
      return 99;
    }
    return Number(ret);
  });

  targetDoorState.onSet(async state => {
    hsd.setCo(setEndpoint, Number(state));
  });
};

