// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from 'preact';
import { histUpdate } from "../app";
import StatusLeftItem from "./item";

interface S {
  remaining_material?: string;
  temp_cpu?: string;
  temp_led?: string;
  temp_amb?: string;
  uv_led_fan?: string;
  blower_fan?: string;
  rear_fan?: string;
  cover_state?: string;
  nozzle?: string;
  heatbed?: string;
  speed?: string;
  flow?: string;
  height?: string;
  material?: string;
}

function numberFormat(value) {
  let precision = value.toString().indexOf(".") + 1;
  if (value.toString().length - precision > 3) {
    return Number.parseFloat(value.toPrecision(precision));
  } else {
    return value;
  }
};

function pad2(value) {
  if (value < 10) {
    return "0" + value
  } else {
    return "" + value
  }
};

function formatTime(date) {
  let hours = date.getUTCHours()
  let minutes = date.getUTCMinutes()
  if (hours > 0) {
    return hours + " h " + pad2(minutes) + " mim"
  }
  return minutes + " mim"
};

class StatusLeftBoard extends Component<histUpdate, S> {

  ws = null;

  constructor() {
    super();
    this.state = {
      remaining_material: "0 ml",
      temp_cpu: "0°C",
      temp_led: "0°C",
      temp_amb: "0°C",
      uv_led_fan: "0 RPM",
      blower_fan: "0 RPM",
      rear_fan: "0 RPM",
      cover_state: "",
    };
  }

  componentDidMount() {
    this.connect();

  }
  connect = () => {

    if (process.env.DEVELOPMENT) {
      this.ws = new WebSocket("ws://localhost:8080/ws");
    } else {
      this.ws = new WebSocket("ws://" + window.location.host + "/ws");
    }

    this.ws.onclose = () => {
      this.setState({});
    };

    let that = this;
    this.ws.onerror = () => {
      this.ws.close();
      setTimeout(function () { that.connect(); }, 3000);
    };

    this.ws.onmessage = (e) => {
      var data = JSON.parse(e.data);
      if (data.type == "items") {
        let content = data.content;

        let newState: { [propName: string]: string; } = {};
        let newTemps = {};
        let newProgress_status = {};
        let newProgress_bar = {};
        let value = null;

        // common properties
        for (let item of ["temp_cpu", "temp_led", "temp_amb"]) {
          value = content[item];
          if (value) {
            newTemps[item] = value;
            newState[item] = `${numberFormat(value)}°C`;
          }
        }

        value = content["resin_remaining_ml"];
        if (value) {
          value = `${numberFormat(value)} ml`;
          newState["remaining_material"] = value;
          newProgress_status["remaining_material"] = value;
        }

        // progress properties
        value = content["time_remain_min"];
        if (value) {
          let remaining = new Date(value * 1000 * 60);
          newProgress_status["remaining_time"] = formatTime(remaining);

          let now = new Date();
          let end = new Date(now.getTime() + value * 1000 * 60);
          newProgress_status["estimated_end"] = pad2(end.getHours()) + ":" + pad2(end.getMinutes());
        }

        value = content["time_elapsed_min"];
        if (value) {
          let elapsed = new Date(value * 1000 * 60);
          newProgress_status["printing_time"] = formatTime(elapsed);
        }

        value = content["resin_used_ml"];
        if (value) {
          newProgress_status["consumed_material"] = numberFormat(value);
        }

        for (let item of ["current_layer", "total_layers"]) {
          value = content[item];
          if (value) {
            newProgress_status[item] = value;
          }
        }

        for (let item of ["project_name", "progress"]) {
          value = content[item];
          if (value) {
            newProgress_bar[item] = value;
          }
        }

        // left board properties
        for (let item of ["uv_led_fan", "blower_fan", "rear_fan"]) {
          value = content[item];
          if (value) {
            newState[item] = `${value} RPM`;
          }
        }

        value = content["cover_closed"];
        if (value) {
          newState["cover_state"] = value ? "Closed" : "Opened";
        }

        if (Object.keys(newState).length > 0) {
          this.setState(newState);
          this.props.updateData({
            progress_bar: newProgress_bar,
            progress_status: newProgress_status,
            temperatures: newTemps
          });
        }
      }
    }

  }

  componentWillUnmount() {
    this.ws.close();
  }

  render() {

    const listItems = Object.keys(this.state).map(propType =>
      <StatusLeftItem type={propType} value={this.state[propType]} />
    );

    return (
      <div class="columns is-multiline is-mobile">
        {listItems.length < 1 ? "Loading..." : listItems}
      </div>
    );

  }

}



export default StatusLeftBoard;