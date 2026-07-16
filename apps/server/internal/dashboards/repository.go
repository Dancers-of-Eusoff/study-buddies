package dashboards

import "database/sql"

type Repository interface {
	GetMemesByUser(userId string) (*[]MemeDTO, error)
	AddMeme(meme *SubmittedMemeDTO) (*MemeDTO, error)
}

type DashboardRepo struct {
	db *sql.DB
}

func NewDashboardRepo(db *sql.DB) *DashboardRepo {
	return &DashboardRepo{db: db}
}

func (r *DashboardRepo) GetMemesByUser(userId string) (*[]MemeDTO, error) {
	var memes []MemeDTO
	query := `SELECT id, title, video_url, thumbnail_url, created_at FROM memes
			WHERE uploader_id = $1 OR is_public`

	rows, err := r.db.Query(query, userId)
	if err != nil {
		return &[]MemeDTO{}, err
	}
	for rows.Next() {
		var meme MemeDTO
		if err := rows.Scan(
			&meme.ID,
			&meme.Title,
			&meme.VideoURL,
			&meme.ThumbnailURL,
			&meme.CreatedAt,
		); err != nil {
			return &[]MemeDTO{}, err
		}
		memes = append(memes, meme)
	}
	return &memes, nil
}

func (r *DashboardRepo) AddMeme(meme *SubmittedMemeDTO) (*MemeDTO, error) {
	var createdMeme MemeDTO
	query := `INSERT INTO memes (title, uploader_id, video_url, thumbnail_url)
			VALUES ($1, $2, $3, $4)
			RETURNING id, title, video_url, thumbnail_url, created_at`

	err := r.db.QueryRow(query, meme.Title, meme.UploaderID, meme.VideoURL, meme.ThumbnailURL).Scan(
		&createdMeme.ID,
		&createdMeme.Title,
		&createdMeme.VideoURL,
		&createdMeme.ThumbnailURL,
		&createdMeme.CreatedAt,
	)
	if err != nil {
		return &MemeDTO{}, err
	}

	return &createdMeme, nil
}
