package dashboards 

import "database/sql"

type Repository interface {
	GetMemesByUser(userId string) (*[]MemesDTO, error)
}

type DashboardRepo struct {
	db *sql.DB
}

func NewDashboardRepo(db *sql.DB) *DashboardRepo {
	return &DashboardRepo{db: db}
}

func (r *DashboardRepo) GetMemesByUser(userId string) (*[]MemesDTO, error) {
	var memes []MemesDTO
	query := `SELECT id, title, video_url, thumbnail_url, created_at FROM memes
			WHERE uploader_id = $1 OR is_public`

	rows, err := r.db.Query(query, userId)
	if err != nil {
		return &[]MemesDTO{}, err
	}
	for rows.Next() {
		var meme MemesDTO
		if err := rows.Scan(
			&meme.ID,
			&meme.Title,
			&meme.VideoURL,
			&meme.ThumbnailURL,
			&meme.CreatedAt,
		); err != nil {
			return &[]MemesDTO{}, err
		}
		memes = append(memes, meme)
	}
	return &memes, nil
}