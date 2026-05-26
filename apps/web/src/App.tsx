import Sidebar from "./components/Sidebar"
import Cockpit from "./components/Cockpit"
import "./App.css"

function App() {
  return (
    <div className="app-container">
      <main className="cockpit">
        <Cockpit />
      </main>
      <aside className="sidebar">
        <Sidebar />
      </aside>
    </div>
  )
}

export default App
