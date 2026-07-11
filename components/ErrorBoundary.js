// components/ErrorBoundary.js
// 捕获子组件的渲染错误，避免整页白屏。用 class 组件因为只有它支持 componentDidCatch。
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // 记录到控制台，方便排查；不上报到任何第三方
    console.error("页面渲染出错:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "70vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌧️</div>
          <h2 style={{ fontSize: 19, margin: "0 0 8px", color: "var(--ink)" }}>出了点小问题</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.7, margin: "0 0 24px", maxWidth: 300 }}>
            这个页面遇到了一点小状况，刷新一下通常就好了。如果一直这样，可以稍后再来。
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "12px 28px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #9B8FF0, #7C6FE0)",
              color: "#fff", fontSize: 15, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(124,111,224,0.35)", fontFamily: "inherit",
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
