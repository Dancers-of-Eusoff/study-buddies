import type { DashboardResponse, Meme, MemeDTO } from "../types/dashboard";
import apiFetch from "./apiFetch";

const PATH: string = '/dashboard';
const includeCred: RequestInit = { credentials: 'include' }

export async function getMyDashboard(): Promise<DashboardResponse> {
    const res = await apiFetch(`${PATH}/me`, 'GET', includeCred)
    if (!res.ok)
        throw new Error('Failed to fetch memes')
    const memes = await res.json()
    return { memes: memes } as unknown as DashboardResponse
}

export async function addMemeToCloud(uploadedMeme: File) {
    const formData = new FormData()
    formData.append("file", uploadedMeme)
    formData.append("upload_preset", "study_buddies")
    const response = await fetch(
        "https://api.cloudinary.com/v1_1/jlixjhrm/upload",
        {
          method: "post",
          body: formData
        }
      );
    const meme = await response.json();
    return meme.url;
}

export async function addMemeToPG(meme: MemeDTO): Promise<Meme> {
    const res = await apiFetch(`${PATH}/submit-meme`, 'POST', {...includeCred, body: JSON.stringify(meme)})
    if (!res.ok)
        throw new Error('Failed to add new meme')
    const createdMeme = res.json()
    return createdMeme
}