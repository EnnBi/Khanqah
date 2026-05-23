package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type R2Client struct {
	s3      *s3.Client
	bucket  string
	cdnBase string
}

func NewR2Client(accountID, accessKey, secretKey, bucket, cdnBase string) (*R2Client, error) {
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion("auto"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("storage.NewR2Client: %w", err)
	}
	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
	})
	return &R2Client{s3: client, bucket: bucket, cdnBase: cdnBase}, nil
}

// GenerateUploadURL returns a pre-signed PUT URL valid for 15 minutes.
func (c *R2Client) GenerateUploadURL(ctx context.Context, fileKey, contentType string) (string, error) {
	presign := s3.NewPresignClient(c.s3)
	result, err := presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(fileKey),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return "", fmt.Errorf("storage.GenerateUploadURL: %w", err)
	}
	return result.URL, nil
}

// CDNUrl converts a file key to the public CDN URL.
func (c *R2Client) CDNUrl(fileKey string) string {
	return c.cdnBase + "/" + fileKey
}

// UploadFile streams a reader directly to R2.
func (c *R2Client) UploadFile(ctx context.Context, fileKey, contentType string, body io.Reader, size int64) error {
	input := &s3.PutObjectInput{
		Bucket:        aws.String(c.bucket),
		Key:           aws.String(fileKey),
		Body:          body,
		ContentType:   aws.String(contentType),
		ContentLength: aws.Int64(size),
	}
	_, err := c.s3.PutObject(ctx, input)
	if err != nil {
		return fmt.Errorf("storage.UploadFile: %w", err)
	}
	return nil
}
