export interface DashboardResponse {
	memes: Meme[]
}

export interface Meme {
    id: string
	title: string
	videoURL: string
	thumbnailURL: string
	createdAt: string
}

export interface MemeDTO {
    id: string
	title: string
	videoURL: string
	thumbnailURL: string
	uploaderID: string
	createdAt: string
}