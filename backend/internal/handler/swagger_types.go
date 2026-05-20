package handler

// Request types
type sendOTPRequest struct {
	Phone string `json:"phone" example:"+919876543210"`
}
type verifyOTPRequest struct {
	Phone string `json:"phone" example:"+919876543210"`
	OTP   string `json:"otp" example:"123456"`
}
type refreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}
type uploadURLRequest struct {
	Filename    string `json:"filename" example:"bayan.mp3"`
	ContentType string `json:"content_type" example:"audio/mpeg"`
}
type updateUserRoleRequest struct {
	Role string `json:"role" example:"editor"`
}
type upsertProgressRequest struct {
	PositionSeconds int32 `json:"position_seconds" example:"120"`
	Completed       bool  `json:"completed" example:"false"`
}
type startLiveRequest struct {
	TitleEn   string `json:"title_en" example:"Friday Bayan"`
	TitleUr   string `json:"title_ur" example:"جمعہ بیان"`
	StreamUrl string `json:"stream_url" example:"rtmp://live.example.com/live/key"`
}

// Response types
type otpSentResponse struct {
	Message string `json:"message" example:"OTP sent"`
}
type verifyOTPResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	Role         string `json:"role" example:"listener"`
}
type refreshTokenResponse struct {
	AccessToken string `json:"access_token"`
}
type uploadURLResponse struct {
	UploadURL string `json:"upload_url"`
	FileKey   string `json:"file_key" example:"content/1716200000000000000.mp3"`
	CdnURL    string `json:"cdn_url"`
}
type errorResponse struct {
	Error string `json:"error" example:"phone is required"`
}
