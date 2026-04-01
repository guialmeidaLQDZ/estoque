import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  // Layout is applied per-page via the Layout component
  return <Component {...pageProps} />
}
