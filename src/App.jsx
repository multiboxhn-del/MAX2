import OnlineRadioPlayer from "./components/Player";

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <OnlineRadioPlayer
        streamUrl="https://app.sonicpanelradio.com/8246/stream"
        stationName="MAX RADIO"
        coverFallback="https://eslamax.com/wp-content/uploads/2025/03/cropped-3.png"
        // statusUrl="https://TU_STATUS_JSON" // opcional si tienes Icecast/Shoutcast JSON
        themeColor="#8A3D9C"
      />
    </div>
  );
}