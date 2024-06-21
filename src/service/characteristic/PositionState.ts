import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addPositionStateCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  getEndpoint: string): void => {

  const positionState = service.getCharacteristic(api.hap.Characteristic.PositionState);

  // Add subscription
  hsd.addListener(reading => {
    positionState.updateValue(Number(reading));
  }, getEndpoint);

  positionState.onGet(async () => {
    const ret = Number(hsd.getCo(getEndpoint));
    let state = -1;
    if (ret === api.hap.Characteristic.PositionState.STOPPED) {
      state = api.hap.Characteristic.PositionState.STOPPED;
    } else if (ret === api.hap.Characteristic.PositionState.DECREASING) {
      state = api.hap.Characteristic.PositionState.DECREASING;
    } else if (ret === api.hap.Characteristic.PositionState.INCREASING) {
      state = api.hap.Characteristic.PositionState.INCREASING;
    } else {
      return Promise.reject(0);
    }
    return state;
  });
};

