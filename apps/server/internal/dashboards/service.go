package dashboards

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetMemes(userId string) (*[]MemeDTO, error) {
	memes, err := s.repo.GetMemesByUser(userId)
	return memes, err
}

func (s *Service) AddMeme(meme *SubmittedMemeDTO) (*MemeDTO, error) {
	createdMeme, err := s.repo.AddMeme(meme)
	return createdMeme, err
}
