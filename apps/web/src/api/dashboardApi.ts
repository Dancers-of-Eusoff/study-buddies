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
    const res = await fetch(`${BASE}/submit-meme`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(meme)
    })
    if (!res.ok)
        throw new Error('Failed to add new meme')
    const createdMeme = res.json()
    return createdMeme
}

export async function selectMemePG(payload: { userId: string; memeId: string }) {
  const res = await fetch('/api/dashboard/select-meme', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    throw new Error('Failed to update selected meme');
  }
  return res;
}

export async function getAllMemes() {
  const response = await fetch(`http://${BASE}/api/memes`);
  if (!response.ok) throw new Error('Failed to fetch all memes');
  return response.json();
}