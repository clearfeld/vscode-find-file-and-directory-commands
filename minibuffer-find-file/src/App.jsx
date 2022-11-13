import { useState } from 'react';
import reactLogo from './assets/react.svg';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <p>hello world</p>

      <div>
        Testing React in panel custom view
      </div>
    </div>
  );
}

export default App;
