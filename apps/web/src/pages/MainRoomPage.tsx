import Sidebar from '../components/Sidebar'
import Cockpit from '../components/Cockpit'
import './MainRoomPage.css'

export default function MainRoom() {
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