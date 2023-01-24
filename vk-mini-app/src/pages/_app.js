import '@/styles/globals.css'
import bridge from "@vkontakte/vk-bridge";

bridge.send("VKWebAppInit");

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
