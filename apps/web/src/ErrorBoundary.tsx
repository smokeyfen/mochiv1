import React from 'react';

interface State { hasError: boolean; }
export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = {hasError:false};
  static getDerivedStateFromError(): State { return {hasError:true}; }
  render() {
    if (this.state.hasError) return <main><h1>MochiV1</h1><p role="alert">Unexpected UI error.</p></main>;
    return this.props.children;
  }
}
