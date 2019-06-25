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
    const res = await getOferring();
    this.setState({data: res });
  }

  render() {
    if (!this.state.data) {
      return <div>Loading...</div>
    }

    return <div>{this.props.title} {this.state.data}</div>;
  }
}


export default App;