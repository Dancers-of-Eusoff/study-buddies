export interface MemesResponse {
	memes: Meme[]
	selectedMemeId?: string;
}

export interface Meme {
    id: string
	title: string
	videoURL: string
	thumbnailURL: string
	createdAt: string
}

export interface MemeDTO {
	title: string
	videoURL: string
	thumbnailURL: string
	uploaderID: string
}