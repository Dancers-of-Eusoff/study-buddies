import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { RoomDetails } from "../types";
import { getRoomDetails } from "../api/roomsApi";
import { useParams } from "react-router";
import { useAuth } from "./AuthContext";

const RoomContext = createContext<RoomDetails | null | undefined>(undefined);

export function RoomProvider({ children } : { children : ReactNode }) {
    const [ roomDetails, setRoomDetails ] = useState<RoomDetails | null>(null);
    const { roomId } = useParams<{ roomId: string }>();
    const { token } = useAuth();

    useEffect(() => {
        if (!token || !roomId)
            return ;
        const getData = async () => {
            const data = await getRoomDetails(token, roomId);
            setRoomDetails(data);
            // setIsLoading(false);
        }
        
        getData();
    }, [token, roomId]);

    return (
        <RoomContext value={roomDetails}>{ children }</RoomContext>
    )
}

export const useRoom = () => {
    const roomDetails = useContext(RoomContext);
    if (roomDetails === undefined)
        throw new Error("useRoom must be used in a RoomProvider");
    return roomDetails;
}