import type { MemesResponse, Meme, MemeDTO } from "../types/dashboard";
import apiFetch from "./apiFetch";

const PATH: string = '/dashboard';
const includeCred: RequestInit = { credentials: 'include' }

export async function getMemesResponse(): Promise<MemesResponse> {
    const [selectedMemeId, memes] = await Promise.all([
    getSelectedMemes().catch((err) => {
      console.error("No selected meme:", err);
      return undefined;
    }),
    getAllMemes().catch((err) => {
      console.warn("Could not load memes:", err);
      return [];
    }),
  ]);

  return {
    memes,
    selectedMemeId,
  };
}

export async function addMemeToCloud(uploadedMeme: File) {
    const formData = new FormData()
    formData.append("file", uploadedMeme)
    formData.append("upload_preset", "study_buddies")
    const res = await fetch(
        "https://api.cloudinary.com/v1_1/jlixjhrm/upload",
        {
          method: "post",
          body: formData
        }
      );
    if (!res.ok)
        throw new Error('Failed to upload meme to cloud')
    const meme = await res.json();
    return meme.url;
}

export async function addMemeToPG(meme: MemeDTO): Promise<Meme> {
    const res = await apiFetch(`${PATH}/submit-meme`, 'POST', {...includeCred, body: JSON.stringify(meme)})
    if (!res.ok)
        throw new Error('Failed to add new meme')
    const createdMeme = res.json()
    return createdMeme
}

export async function selectMemePG(payload: { userId: string; memeId: string }) {
  const res = await apiFetch(`${PATH}/select-meme`, 'POST',
    {headers: { 'Content-Type': 'application/json'},
    body: JSON.stringify(payload)});

  if (!res.ok) {
    throw new Error('Failed to update selected meme');
  }
  return res;
}

export async function getAllMemes() {
  const res = await apiFetch(`${PATH}/memes`, 'GET', includeCred);
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function getSelectedMemes() {
  const res = await apiFetch(`${PATH}/selected-memes`, 'GET', includeCred);
  if (!res.ok) {
    return [];
  }
  return res.json();
}