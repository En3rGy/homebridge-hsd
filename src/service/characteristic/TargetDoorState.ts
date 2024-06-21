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
    const ret = Number(hsd.getCo(getEndpoint));
    let state = api.hap.Characteristic.TargetDoorState.OPEN;

    if (ret === api.hap.Characteristic.TargetDoorState.OPEN) {
      state = api.hap.Characteristic.TargetDoorState.OPEN;
    } else if (ret === api.hap.Characteristic.TargetDoorState.CLOSED) {
      state = api.hap.Characteristic.TargetDoorState.CLOSED;
    } else {
      return Promise.reject(0);
    }
    return state;
  });

  targetDoorState.onSet(async state => {
    hsd.setCo(setEndpoint, Number(state));
  });
};

