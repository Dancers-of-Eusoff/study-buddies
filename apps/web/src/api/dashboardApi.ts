import type { DashboardResponse, Meme, MemeDTO } from "../types/dashboard";

const BASE = `${import.meta.env.VITE_BASE_URL}/api/dashboard`

export async function getMyDashboard(userId: string | undefined): Promise<DashboardResponse> {
    const res = await fetch(`${BASE}/me`, {
        method: 'QUERY',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ userId: userId })
    })
    if (!res.ok)
        throw new Error('Failed to fetch memes')
    console.log("Dashboard response:", res)
    const memes = await res.json()
    console.log("Dashboard memes:", memes)
    return { memes: memes } as unknown as DashboardResponse
}

export async function addMemeToCloud(meme: MemeDTO) {

}

export async function addMemeToPG(meme: MemeDTO) {
    
}