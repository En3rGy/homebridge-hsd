import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addCurrentDoorStateCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  getEndpoint: string): void => {

  const currentDoorStat = service.getCharacteristic(api.hap.Characteristic.CurrentDoorState);

  // Add subscription
  hsd.addListener(reading => {
    currentDoorStat.updateValue(Number(reading));
  }, getEndpoint);

  currentDoorStat.onGet(async () => {
    const ret = Number(hsd.getCo(getEndpoint));

    let state = -1;
    if (ret === api.hap.Characteristic.CurrentDoorState.OPEN) {
      state = api.hap.Characteristic.CurrentDoorState.OPEN;
    } else if (ret === api.hap.Characteristic.CurrentDoorState.CLOSED) {
      state = api.hap.Characteristic.CurrentDoorState.CLOSED;
    } else if (ret === api.hap.Characteristic.CurrentDoorState.OPENING) {
      state = api.hap.Characteristic.CurrentDoorState.OPEN;
    } else if (ret === api.hap.Characteristic.CurrentDoorState.CLOSING) {
      state = api.hap.Characteristic.CurrentDoorState.CLOSING;
    } else if (ret === api.hap.Characteristic.CurrentDoorState.STOPPED) {
      state = api.hap.Characteristic.CurrentDoorState.STOPPED;
    } else {
      return Promise.reject(0);
    }

    return state;
  });
};

