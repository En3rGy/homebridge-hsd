/* eslint-disable no-console */
// import { API, Characteristic } from 'homebridge';
import { API } from 'homebridge';
import * as WebSocket from 'ws';
import { Logging } from 'homebridge';
import { HsdAccessory } from './hsdAccessory';

export enum CONNECTION_STATE {
  INIT = 0,
  CONNECTING = 1,
  OPEN = 2,
  CLOSING = 3,
  CLOSED = 4,
  DESTROYED = 5
}

export class HomeServerConnector {

  private _ws: WebSocket.WebSocket | null = null;
  private _connState = CONNECTION_STATE.INIT;
  private _transactionIdCnt = 0;
  private _listeners: Map<string, (reading: string) => void> = new Map();
  private _msgQueu = {};

  private requestPromiseResolver: Map<string, (value: string | PromiseLike<string>) => void> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private requestPromiseRejecter: Map<string, (reason?: any) => void> = new Map();
  private lastSet: Map<string, string> = new Map();

  /**
   *
   */
  constructor(private api: API, private logger: Logging, private accessory: Map<string, HsdAccessory>) {
    //
  }

  /**
   *
   * @returns
   */
  getConnState() {
    return this._connState;
  }

  /**
   *
   * @param hsIp
   * @param hsPort
   * @param user
   * @param pw
   */
  connect(hsIp: string, hsPort: number, user: string, pw: string) {
    const hostname = hsIp;
    const port = hsPort;
    const prot = 'wss';
    const url = prot + '://' + hostname + ':' + port + '/endpoints/ws?authorization=' + encodeURIComponent(btoa(user + ':' + pw));
    this._ws = new WebSocket.WebSocket(url, { rejectUnauthorized: false });
    this._connState = CONNECTION_STATE.CONNECTING;

    this._ws.on('open', () => {
      this._connState = CONNECTION_STATE.OPEN;
      this.logger.info('Conncted to HS');
    });

    this._ws.on('message', (message: string) => {
      this.receivedMessage(message);
    });

    this._ws.on('close', (code:number, reason:string) => {
      this._connState = CONNECTION_STATE.CLOSED;
      this.logger.info('Connection with HS closed ' + code + reason);
    });

    this._ws.on('error', (errorMsg: string) => {
      this._connState = CONNECTION_STATE.CLOSED;
      this.logger.info('Error ' + 'code: ' + errorMsg);
    });
  }

  /**
   *
   */
  receivedMessage(message: string): boolean {
    const jsonMsg = JSON.parse(message);
    const code = jsonMsg.code;
    const type = jsonMsg.type;

    if (code !== 0) {
      this.logger.info('hs.ts | HomeserverConnector | Received message', JSON.stringify(jsonMsg));
      return false;
    }

    // let data: string;
    let endpoint: string;
    let value: string;

    if (type === 'select' || type === 'subscribe') {
      this.logger.info('hs.ts | HomeserverConnector | Received select/subscribe message');
      for (const item of jsonMsg.data.items) {
        endpoint = item.key;
        value = String(item.data.value);

        /// return value via callback
        const callback = this._listeners.get(endpoint);
        if (callback) {
          callback(value);
        } else {
          this.logger.warn('hs.ts | HomeserverConnector | No callback for %s registered', endpoint);
        }
      }

    } else if (type === 'push') {
      endpoint = jsonMsg.subscription.key;
      value = jsonMsg.data.value;
      this.logger.info('hs.ts | HomeserverConnector | Received push message with %s: "%s"', endpoint, value);

      /// return value via callback
      const callback = this._listeners.get(endpoint);
      if (callback) {
        callback(value);
      } else {
        this.logger.warn('hs.ts | HomeserverConnector | No callback for %s registered', endpoint);
      }

    } else if( type === 'call') {
      const method = jsonMsg['request'].method;
      endpoint = jsonMsg['request'].key;

      // ### reply on previous get call ###
      if (method === 'get') {
        value = jsonMsg.data.value;
        this.logger.info('hs.ts | HomeserverConnector | Received as get-reply for %s: "%s"', endpoint, value);

        // returns the get value if getCo was called before
        const resolver = this.requestPromiseResolver.get(endpoint);

        if (resolver) {
          resolver(String(value));
          this.requestPromiseResolver.delete(endpoint);
          this.requestPromiseRejecter.delete(endpoint);
        }

        if (method in this._msgQueu) {  // @todo Check if required.
          if (endpoint in this._msgQueu[method]) {
            this.logger.debug('Found received method and endpoint in msgQue');
            this._msgQueu[method][endpoint] = value;
          }
        }

      // ### reply on previous set call ###
      } else if (method === 'set') {
        // returns the get value if getCo was called before
        const resolver = this.requestPromiseResolver.get(endpoint);
        this.logger.info('hs.ts | HomeserverConnector | Received set confirmation for %s' + endpoint);

        if (resolver) {
          resolver(String(this.lastSet.get(endpoint)));
          this.requestPromiseResolver.delete(endpoint);
          this.requestPromiseRejecter.delete(endpoint);
          this.lastSet.delete(endpoint);
        }
      } else {
        this.logger.warn('hs.ts | HomeserverConnector | Received unknown method: %s', method);
        value = '';
      }

      /*if ( endpoint in this._listeners) {
        this._listeners[endpoint](value);
      }*/
    } else {
      this.logger.warn('hs.ts | HomeserverConnector | Received unknown msg type: %s', type);
    }

    return true;
  }

  /**
   *
   */
  disconnect() {
    if (this._connState === CONNECTION_STATE.OPEN) {
      this._ws.close();
    }
    this._connState === CONNECTION_STATE.CLOSED;
    this.logger.info('Gently disconnected from HS.');
  }

  /**
   *
   * @returns
   */
  _getNewTransactionId () {
    this._transactionIdCnt += 1;
    return 'T_' + this._transactionIdCnt;
  }

  /**
   *
   * @param obj
   * @returns
   */
  sendJson(msg: object, retries = 3): string|number {

    // Create a promise to wait for the response

    if (this.getConnState() !== CONNECTION_STATE.OPEN) {
      if (retries > 0) {
        setTimeout(() => {
          this.sendJson(msg, retries - 1);
        }, 1000);
      } else {
        this.logger.error('Max retries reached. Connction to HS failed.');
      }
    } else {

      const params: object = msg['param'];
      const method = params['method'];

      if (method in this._msgQueu) {
        //
      } else {
        this._msgQueu[method] = {};
      }

      if (msg['type'] === 'call') {
        const key: string = params['key'];

        if (key in this._msgQueu[method]) {
          return this._msgQueu[method][key];
        }

      } else if (msg['type'] === 'subscribe') {
        //

      } else {
        this.logger.warn('hs.ts | HomeServerConnector | Message type %s not implemented yet.', msg['type']);
        return '';
      }

      const smsg = JSON.stringify(msg);
      this.logger.info('hs.ts | Send message: ' + smsg);
      this._ws.send(smsg);

    }
    return '';
  }

  /**
   *
   * @param listener
   * @param endpoint
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addListener(listener: (reading: string | number) => void, endpoint: string) {
    this.logger.info('hs.ts | HomeServerConnector | Adding listener for', endpoint);
    this._listeners.set(endpoint, listener);
    this.subscribe([endpoint]);
  }

  /**
   * Subscribes to a list of given endpoints.
   * @param keys List of entpoints to subscribe
   * @returns True if subscription was successfull.
   */
  subscribe(keys: string[]): boolean {
    this.logger.info('Subscribing to', keys);
    const msg = {'type': 'subscribe', 'param': {'keys': keys, 'context': this._getNewTransactionId()}};
    if (this.sendJson(msg)) {
      return true;
    }
    return false;
  }

  /**
   * Writes the given value to the endpoint
   * @param key Name of endpoint, e.g. CO@1_2_3
   * @param value Value to set
   * @returns True if set was successfull.
   */
  setCo(key: string, value: string|number|boolean): boolean {

    // const param = {'context': this._getNewTransactionId(), 'key': key, 'method': 'set', 'value': value};
    const param = {'key': key, 'method': 'set', 'value': value};
    if (typeof value === 'string') {
      param.value = btoa(value);
    }

    const msg = {'type': 'call', 'param': param};

    if (this.sendJson(msg)) {
      this.lastSet.set(key, String(value));
      return true;
    }
    return false;
  }

  /**
   * Request the value of the given endpoint from Homeserver
   * @param key Name of endpoint, e.g. CO@1_2_3
   * @returns True the characteristic value received from Homeserver.
   */
  getCo(key: string): Promise<string> {
    const param = {'key': key, 'method': 'get'};
    const msg = {'type': 'call', 'param': param};

    return new Promise<string>((resolve, reject) => {
      this.requestPromiseResolver.set(key, resolve);
      this.requestPromiseRejecter.set(key, reject);

      this.sendJson(msg);
    });
  }

  /**
   *
   * @param key
   * @param tags
   * @param search
   * @param meta
   * @returns True if request was successfull.
   */
  select(key: string, tags: string[], search: string, meta: boolean): boolean {
    const msg = {'type': 'select', 'param': {}};
    msg['param']['context'] = this._getNewTransactionId();
    msg['param']['key'] = key;
    //msg['param']['tags'] = tags;
    //msg['param']['search'] = search;
    msg['param']['meta'] = meta || false;
    msg['param']['from'] = 0;
    msg['param']['count'] = 1000;
    if (this.sendJson(msg)) {
      return true;
    }
    return false;
  }
}