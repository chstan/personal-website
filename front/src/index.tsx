import React from 'react';
import ReactDOM from 'react-dom';
import ReactGA from 'react-ga';

import './css/index.css';
import App from './App';

import * as serviceWorker from './serviceWorker';

ReactGA.initialize('UA-55955707-3');

ReactDOM.render(<App />, document.getElementById('app'));
serviceWorker.unregister();
