import { useAuth } from '../context/AuthContext';
import { RoomProvider, useRoom } from '../context/RoomContext'
import styles from './SexierStudyRoomPage.module.css'

function Navbar() {
    const { user } = useAuth();
    const roomDetails = useRoom();

    if (!roomDetails)
        return <div>Loading...</div>
    
    const { room } = roomDetails;

    const {
        name: roomName,
        moduleCode: roomModuleCode,
        type: roomType,
        inviteCode
    } = room;

    return (
        <>
            {/* Blobs */}
            <div className={styles.blobTopRight} />
            <div className={styles.blobBottomLeft} />

            {/* Nav */}
            <nav className={styles.navbar}>
                <div className={styles.navLeft}>
                    <button onClick={() => console.log("Aww pls dun leave")} className={styles.leaveBtn}>← Leave</button>
                    <div className={styles.roomInfo}>
                        <span className={styles.roomName}>{ roomName }</span>
                        {roomModuleCode && <span className={styles.roomModuleTag}>{ roomModuleCode }</span>}
                        <span className={styles.roomTypeTag}>{ roomType }</span>
                    </div>
                </div>
                <div className={styles.navRight}>
                    {roomType === "PRIVATE" && <button className={styles.inviteBtn}>{ inviteCode}</button>}
                    <div className={styles.userBadge}>
                        <span>🐼 { user?.username }</span><span></span>
                    </div>
                </div>
            </nav>
        </>
    )
}

export default function SexierStudyRoomPage() {
    return (
        <div className={styles.container}>
            <RoomProvider>
                    <Navbar />
            </RoomProvider>
        </div>
    )
}