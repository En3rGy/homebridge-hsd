/* eslint-disable no-console */
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
  private _listeners = {};
  private _msgQueu = {};
  private _waitForMsg = true;

  private requestPromiseResolver: Map<string, (value: string) => void> = new Map();
  private requestPromiseRejecter: Map<string, (reason?: any) => void> = new Map();

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

    this.logger.info('hs.ts | HomeserverConnector | Received from HS: ' +
                     message + ' with code ' + String(code) + ' and type ' + String(type));

    if (code !== 0) {
      this.logger.info('Received code ' + code);
      return false;
    }

    let data: string;
    let endpoint: string;
    let value: string|number;
    // let callback: () => object;

    if (type === 'select' || type === 'subscribe') {
      data = jsonMsg.data.items;
      this.logger.info(JSON.stringify(data, null, '  '));
      /// @todo iterate over results
    } else if( type === 'call') {
      const method = jsonMsg['request'].method;
      endpoint = jsonMsg['request'].key;

      if (method === 'get') {
        value = jsonMsg.data.value;
        this.logger.info('hs.ts | HomeserverConnector | ' + endpoint + ': ' + value);

        // returns the get value if getCo was called before
        if (this.requestPromiseResolver.has(endpoint)) {
          this.requestPromiseResolver[endpoint](String(value));
        }

        if (method in this._msgQueu) {
          if (endpoint in this._msgQueu[method]) {
            this.logger.debug('Found recived method and endpoint in msgQue'); // @todo do something
            this._msgQueu[method][endpoint] = value;
          }
        }

        this._waitForMsg = false;


      } else {
        value = 0;
      }

      if ( endpoint in this._listeners) {
        this._listeners[endpoint](value);
      }
    } else {
      this.logger.info(type);
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
      if (msg['type'] === 'call') {
        const params: object = msg['param'];
        const method = params['method'];
        const key: string = params['key'];

        if (method in this._msgQueu) {
          //
        } else {
          this._msgQueu[method] = {};
        }

        const smsg = JSON.stringify(msg);
        this.logger.info('hs.ts | Send message: ' + smsg);
        this._waitForMsg = true;
        this._ws.send(smsg);

        if (msg['type'] === 'call') {
          //while (this._waitForMsg) {
          // @todo do something here ###
          //}
          if (key in this._msgQueu[method]) {
            return this._msgQueu[method][key];
          }
        }
      }
    }
    return '';
  }

  /**
   *
   * @param listener
   * @param endpoint
   */
  addListener(listener: object, endpoint: string) {
    this._listeners[endpoint] = listener;
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
  setCo(key: string, value: string|number): boolean {

    // const param = {'context': this._getNewTransactionId(), 'key': key, 'method': 'set', 'value': value};
    const param = {'key': key, 'method': 'set', 'value': value};
    if (typeof value === 'string') {
      param.value = btoa(value);
    }

    const msg = {'type': 'call', 'param': param};

    if (this.sendJson(msg)) {
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