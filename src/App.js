import React from 'react';
import getOferring from './server/index.remote';

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      data: null
    }
  }

  async componentDidMount() {
    const res = await getOferring('9bb03807-8aa2-460a-897d-5baf2c3a489a');
    this.setState({ data: res });
  }

  render() {
    if (!this.state.data) {
      return <div>Loading...</div>
    }

    return <div>{this.props.title} {JSON.stringify(this.state.data)}</div>;
  }
}


export default App;