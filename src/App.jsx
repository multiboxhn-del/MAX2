import Player from "./components/Player";

export default function App() {
  return (
    // Usa un "fragment" (<>...</>) para devolver múltiples elementos
    <>
      <h1>MAX Radio</h1> {/* Es mejor usar una etiqueta <h1> para el título */}
      <Player /> {/* ¡Aquí usamos el componente Player! */}
    </>
  );
}
