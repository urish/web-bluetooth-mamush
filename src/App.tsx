/// <reference types="web-bluetooth" />

import React, { Component, createRef } from 'react';
import { MuseClient, channelNames } from 'muse-js';
import { filter, map, switchMap, distinctUntilChanged } from 'rxjs/operators';
import './App.css';
import { of, timer, merge } from 'rxjs';

class App extends Component {
  state = {
    connected: false,
    brainConnected: false,
    blink: false
  };
  characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  muse = new MuseClient();
  frame = createRef<HTMLIFrameElement>();

  connectBulb = async () => {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [0xffe5] }]
    });
    console.log(`Found device, ${device.name}`);
    await device.gatt!.connect();
    const service = await device.gatt!.getPrimaryService(0xffe5);
    this.characteristic = await service.getCharacteristic(0xffe9);
    this.setState({ connected: true });
  };

  connectBrain = async () => {
    await this.muse.connect();
    await this.muse.start();
    this.setState({ brainConnected: true });
    const leftEar = channelNames.indexOf('TP9');
    this.muse.eegReadings
      .pipe(
        filter(reading => reading.electrode === leftEar),
        map(reading => Math.max(...reading.samples.map(Math.abs))),
        filter(value => value > 80),
        switchMap(() => merge(of(true), timer(300).pipe(map(() => false)))),
        distinctUntilChanged()
      )
      .subscribe(value => {
        this.setState({ blink: value });
        if (value) {
          this.setColor(0, 0, 0);
          const event = new Event('keydown');
          (event as any).keyCode = 32; 
          this.frame.current!.contentDocument!.dispatchEvent(event);
        } else {
          this.setColor(255, 0, 255);
        }
        console.log(value);
      });
  };

  async setColor(r: number, g: number, b: number) {
    await this.characteristic!.writeValue(
      new Uint8Array([0x56, r, g, b, 0x00, 0xf0, 0xaa])
    );
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Mamush 😏</h1>
          {!this.state.connected && (
            <button onClick={this.connectBulb}>Connect! 💡</button>
          )}
          {!this.state.brainConnected && (
            <button onClick={this.connectBrain}>Connect! 🧠</button>
          )}
          {this.state.connected && (
            <div>
              <button onClick={() => this.setColor(6, 6, 6)}>Satan 👿</button>
              <button onClick={() => this.setColor(255, 200, 255)}>
                Chikko
              </button>
              <button onClick={() => this.setColor(255, 0, 0)}>
                Gimini 📡
              </button>
            </div>
          )}
          <div className={'eye ' + (this.state.blink ? 'blink' : '')}>👁</div>
          <iframe
            src="trex/"
            style={{ background: 'white' }}
            width="100%"
            height="400"
            ref={this.frame}
          />
        </header>
      </div>
    );
  }
}

export default App;
